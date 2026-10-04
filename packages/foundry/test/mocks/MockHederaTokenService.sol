// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Vm } from "forge-std/Vm.sol";
import { SafeCast } from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import { IHederaTokenService } from "../../contracts/hedera/IHederaTokenService.sol";
import { HederaResponseCodes as Codes } from "../../contracts/hedera/HederaResponseCodes.sol";

/// @notice Test double for the Hedera Token Service system contract, installed at `0x167` by {install}.
/// It models only what Atollway uses: fungible tokens, association, KYC, freeze, pause, mint, wipe and
/// transfers, with the same response codes Hedera returns. `yarn simulate` checks the real network
/// behaves the same way.
contract MockHederaTokenService {
    address internal constant HTS = address(0x167);
    Vm internal constant VM = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    /// @notice Creation fee charged by {createFungibleToken}, in tinybars. Hedera charges about 1 US dollar.
    uint256 public constant CREATION_FEE = 10e8;

    struct Token {
        address treasury;
        uint8 decimals;
        bool paused;
        uint256 totalSupply;
        string name;
        string symbol;
        mapping(uint256 keyType => address holder) keys;
        mapping(address account => uint256 balance) balances;
        mapping(address account => bool) associated;
        mapping(address account => bool) kyc;
        mapping(address account => bool) frozen;
    }

    mapping(address token => Token) internal tokens;
    mapping(address token => bool) public isToken;

    /// @notice Etches this mock at `0x167` and returns it.
    function install() external returns (MockHederaTokenService) {
        VM.etch(HTS, address(this).code);
        return MockHederaTokenService(HTS);
    }

    function createFungibleToken(IHederaTokenService.HederaToken memory token, int64 initialTotalSupply, int32 decimals)
        external
        payable
        returns (int64, address)
    {
        if (msg.value < CREATION_FEE) return (Codes.INSUFFICIENT_TX_FEE, address(0));
        uint8 tokenDecimals = SafeCast.toUint8(SafeCast.toUint256(decimals));
        address tokenAddress = address(new MockHtsToken(token.name, token.symbol, tokenDecimals));
        Token storage t = tokens[tokenAddress];
        isToken[tokenAddress] = true;
        t.treasury = token.treasury;
        t.decimals = tokenDecimals;
        t.name = token.name;
        t.symbol = token.symbol;
        for (uint256 i; i < token.tokenKeys.length; i++) {
            for (uint256 bit = 1; bit <= 64; bit <<= 1) {
                if (token.tokenKeys[i].keyType & bit != 0) t.keys[bit] = token.tokenKeys[i].key.contractId;
            }
        }
        t.associated[token.treasury] = true;
        t.kyc[token.treasury] = true;
        t.balances[token.treasury] = SafeCast.toUint256(initialTotalSupply);
        t.totalSupply = SafeCast.toUint256(initialTotalSupply);
        // Like Hedera, refund what the creation fee did not use.
        VM.deal(msg.sender, msg.sender.balance + msg.value - CREATION_FEE);
        return (Codes.SUCCESS, tokenAddress);
    }

    function mintToken(address token, int64 amount, bytes[] memory)
        external
        returns (int64 responseCode, int64 newTotalSupply, int64[] memory serialNumbers)
    {
        Token storage t = tokens[token];
        responseCode = _authorize(t, 16);
        if (responseCode == Codes.SUCCESS) {
            t.balances[t.treasury] += SafeCast.toUint256(amount);
            t.totalSupply += SafeCast.toUint256(amount);
        }
        return (responseCode, SafeCast.toInt64(SafeCast.toInt256(t.totalSupply)), serialNumbers);
    }

    function wipeTokenAccount(address token, address account, int64 amount) external returns (int64) {
        Token storage t = tokens[token];
        int64 code = _authorize(t, 8);
        if (code != Codes.SUCCESS) return code;
        if (account == t.treasury) return Codes.CANNOT_WIPE_TOKEN_TREASURY_ACCOUNT;
        code = _checkAccount(t, account);
        if (code != Codes.SUCCESS) return code;
        if (SafeCast.toUint256(amount) > t.balances[account]) return Codes.INVALID_WIPING_AMOUNT;
        t.balances[account] -= SafeCast.toUint256(amount);
        t.totalSupply -= SafeCast.toUint256(amount);
        return Codes.SUCCESS;
    }

    function transferToken(address token, address sender, address recipient, int64 amount) external returns (int64) {
        if (msg.sender != sender) return Codes.INVALID_SIGNATURE;
        return _transfer(token, sender, recipient, SafeCast.toUint256(amount));
    }

    function grantTokenKyc(address token, address account) external returns (int64) {
        return _setFlag(token, account, 2, true);
    }

    function revokeTokenKyc(address token, address account) external returns (int64) {
        return _setFlag(token, account, 2, false);
    }

    function freezeToken(address token, address account) external returns (int64) {
        return _setFlag(token, account, 4, true);
    }

    function unfreezeToken(address token, address account) external returns (int64) {
        return _setFlag(token, account, 4, false);
    }

    function pauseToken(address token) external returns (int64) {
        return _setPaused(token, true);
    }

    function unpauseToken(address token) external returns (int64) {
        return _setPaused(token, false);
    }

    // ----- Called by MockHtsToken on behalf of an account -----

    function facadeAssociate(address account) external returns (int64) {
        Token storage t = _facadeToken();
        if (t.associated[account]) return Codes.TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT;
        t.associated[account] = true;
        return Codes.SUCCESS;
    }

    function facadeTransfer(address from, address to, uint256 amount) external returns (int64) {
        _facadeToken();
        return _transfer(msg.sender, from, to, amount);
    }

    // ----- Views used by MockHtsToken and tests -----

    function balanceOf(address token, address account) external view returns (uint256) {
        return tokens[token].balances[account];
    }

    function totalSupply(address token) external view returns (uint256) {
        return tokens[token].totalSupply;
    }

    function isAssociated(address token, address account) external view returns (bool) {
        return tokens[token].associated[account];
    }

    function isKyc(address token, address account) external view returns (bool) {
        return tokens[token].kyc[account];
    }

    function isFrozen(address token, address account) external view returns (bool) {
        return tokens[token].frozen[account];
    }

    function isPaused(address token) external view returns (bool) {
        return tokens[token].paused;
    }

    function keyHolder(address token, uint256 keyType) external view returns (address) {
        return tokens[token].keys[keyType];
    }

    function treasuryOf(address token) external view returns (address) {
        return tokens[token].treasury;
    }

    // ----- Internals -----

    function _transfer(address token, address from, address to, uint256 amount) internal returns (int64) {
        Token storage t = tokens[token];
        if (t.paused) return Codes.TOKEN_IS_PAUSED;
        int64 code = _checkAccount(t, from);
        if (code != Codes.SUCCESS) return code;
        code = _checkAccount(t, to);
        if (code != Codes.SUCCESS) return code;
        if (t.balances[from] < amount) return Codes.INSUFFICIENT_TOKEN_BALANCE;
        t.balances[from] -= amount;
        t.balances[to] += amount;
        return Codes.SUCCESS;
    }

    function _setFlag(address token, address account, uint256 keyType, bool value) internal returns (int64) {
        Token storage t = tokens[token];
        int64 code = _authorize(t, keyType);
        if (code != Codes.SUCCESS) return code;
        if (!t.associated[account]) return Codes.TOKEN_NOT_ASSOCIATED_TO_ACCOUNT;
        if (keyType == 2) t.kyc[account] = value;
        else t.frozen[account] = value;
        return Codes.SUCCESS;
    }

    function _setPaused(address token, bool value) internal returns (int64) {
        Token storage t = tokens[token];
        if (t.keys[64] != msg.sender) return Codes.INVALID_SIGNATURE;
        t.paused = value;
        return Codes.SUCCESS;
    }

    /// @dev Checks the caller holds `keyType` and that the token is not paused.
    function _authorize(Token storage t, uint256 keyType) internal view returns (int64) {
        if (t.keys[keyType] != msg.sender) return Codes.INVALID_SIGNATURE;
        if (t.paused) return Codes.TOKEN_IS_PAUSED;
        return Codes.SUCCESS;
    }

    /// @dev Checks, in Hedera's order, that `account` can hold and move the token.
    function _checkAccount(Token storage t, address account) internal view returns (int64) {
        if (!t.associated[account]) return Codes.TOKEN_NOT_ASSOCIATED_TO_ACCOUNT;
        if (!t.kyc[account]) return Codes.ACCOUNT_KYC_NOT_GRANTED_FOR_TOKEN;
        if (t.frozen[account]) return Codes.ACCOUNT_FROZEN_FOR_TOKEN;
        return Codes.SUCCESS;
    }

    function _facadeToken() internal view returns (Token storage) {
        require(isToken[msg.sender], "MockHederaTokenService: not a token");
        return tokens[msg.sender];
    }
}

/// @notice The ERC-20 and HIP-719 view of a token created by {MockHederaTokenService}, deployed at the token's
/// address the way Hedera exposes every HTS token.
contract MockHtsToken {
    MockHederaTokenService internal constant HTS = MockHederaTokenService(address(0x167));

    string public name;
    string public symbol;
    uint8 public decimals;

    error HederaTransferFailed(int64 responseCode);

    constructor(string memory name_, string memory symbol_, uint8 decimals_) {
        name = name_;
        symbol = symbol_;
        decimals = decimals_;
    }

    function totalSupply() external view returns (uint256) {
        return HTS.totalSupply(address(this));
    }

    function balanceOf(address account) external view returns (uint256) {
        return HTS.balanceOf(address(this), account);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        int64 code = HTS.facadeTransfer(msg.sender, to, amount);
        if (code != 22) revert HederaTransferFailed(code);
        return true;
    }

    /// @notice HIP-719: associates the caller with this token.
    function associate() external returns (uint256 responseCode) {
        return SafeCast.toUint256(HTS.facadeAssociate(msg.sender));
    }
}
