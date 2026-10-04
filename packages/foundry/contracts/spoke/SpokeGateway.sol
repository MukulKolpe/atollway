// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Ownable, Ownable2Step } from "@openzeppelin/contracts/access/Ownable2Step.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { InvestorStatus } from "../common/InvestorStatus.sol";
import { IMessageReceiver, ITransport } from "../messaging/ITransport.sol";
import { Messages } from "../messaging/Messages.sol";
import { ISpokeCompliance, SpokeToken } from "./SpokeToken.sol";

/// @title Spoke gateway
/// @notice The hub's counterpart on a spoke chain. It deploys the spoke token, applies the hub's compliance
/// decisions and pauses, mints shares sent from Hedera, and burns shares investors send back. A local guardian
/// can pause the spoke at once, without waiting for a bridge message.
/// @dev The owner is the issuer. See docs/architecture.md.
contract SpokeGateway is ISpokeCompliance, IMessageReceiver, Ownable2Step, ReentrancyGuard {
    /// @notice The asset's mirror on this chain.
    SpokeToken public immutable token;

    /// @notice The hub's endpoint ID: its chain ID, 296 for Hedera testnet.
    uint64 public immutable hubId;

    /// @notice The adapter that carries messages to and from the hub.
    ITransport public transport;

    /// @notice Can pause and unpause this spoke locally, alongside the owner.
    address public guardian;

    /// @notice Each investor's status, as last sent by the hub.
    mapping(address account => InvestorStatus) public statusOf;

    /// @notice The sequence number of the last status applied for each investor.
    mapping(address account => uint64) public sequenceOf;

    /// @notice Whether the hub has paused the asset.
    bool public hubPaused;

    /// @notice Whether the guardian has paused this spoke.
    bool public guardianPaused;

    /// @notice How many transfers to the hub this spoke has started. Used to derive transfer IDs.
    uint256 public transferCount;

    /// @notice Transfer IDs of the shares already minted here.
    mapping(bytes32 transferId => bool) public minted;

    event TransportUpdated(ITransport transport);
    event GuardianUpdated(address guardian);
    event StatusApplied(address indexed account, InvestorStatus status, uint64 sequence);
    event StaleStatusIgnored(address indexed account, InvestorStatus status, uint64 sequence);
    event HubPausedChanged(bool paused);
    event GuardianPausedChanged(bool paused);
    event MintedFromHub(bytes32 indexed transferId, address indexed investor, uint256 amount);
    event SentToHub(bytes32 indexed transferId, address indexed investor, uint256 amount);

    error NotTransport(address caller);
    error UnknownSource(uint64 sourceId);
    error UnexpectedMessage(uint8 kind);
    error AlreadyMinted(bytes32 transferId);
    error NotApproved(address account);
    error SpokePaused();
    error NotGuardian(address caller);
    error ZeroAmount();
    error TransportNotSet();
    error InsufficientFee(uint256 required, uint256 provided);

    /// @dev `name`, `symbol` and `decimals` should match the asset on Hedera.
    constructor(address issuer, uint64 hubId_, string memory name, string memory symbol, uint8 decimals)
        Ownable(issuer)
    {
        token = new SpokeToken(name, symbol, decimals);
        hubId = hubId_;
        guardian = issuer;
    }

    /// @notice Sets the adapter that carries messages to and from the hub.
    function setTransport(ITransport newTransport) external onlyOwner {
        transport = newTransport;
        emit TransportUpdated(newTransport);
    }

    /// @notice Sets the local guardian, for example a separate key kept ready for emergencies.
    function setGuardian(address newGuardian) external onlyOwner {
        guardian = newGuardian;
        emit GuardianUpdated(newGuardian);
    }

    /// @notice Stops transfers on this spoke immediately. The hub's own pause is separate and unaffected.
    function pause() external {
        _setGuardianPaused(true);
    }

    /// @notice Lifts the guardian's pause. Transfers stay stopped while the hub's pause is on.
    function unpause() external {
        _setGuardianPaused(false);
    }

    /// @inheritdoc ISpokeCompliance
    function paused() public view returns (bool) {
        return hubPaused || guardianPaused;
    }

    /// @inheritdoc ISpokeCompliance
    function isApproved(address account) public view returns (bool) {
        return statusOf[account] == InvestorStatus.Approved;
    }

    /// @notice Sends `amount` of the caller's spoke tokens back to the same address on Hedera. The tokens are
    /// burned here and released on Hedera when the bridge delivers the message. Send the fee from
    /// {quoteSendToHub}; any excess is returned.
    function sendToHub(uint256 amount) external payable nonReentrant returns (bytes32 transferId) {
        if (paused()) revert SpokePaused();
        if (!isApproved(msg.sender)) revert NotApproved(msg.sender);
        if (amount == 0) revert ZeroAmount();

        token.burn(msg.sender, amount);
        transferId = keccak256(abi.encode(block.chainid, address(this), ++transferCount));
        emit SentToHub(transferId, msg.sender, amount);

        bytes memory message = Messages.encodeTransfer(Messages.RELEASE, transferId, msg.sender, amount);
        ITransport currentTransport = _transport();
        uint256 fee = currentTransport.quote(hubId, message);
        if (fee > msg.value) revert InsufficientFee(fee, msg.value);
        currentTransport.send{ value: fee }(hubId, message);
        if (msg.value > fee) Address.sendValue(payable(msg.sender), msg.value - fee);
    }

    /// @notice The bridge fee for {sendToHub}.
    function quoteSendToHub() external view returns (uint256) {
        return _transport().quote(hubId, Messages.encodeTransfer(Messages.RELEASE, bytes32(0), address(0), 0));
    }

    /// @notice Applies a message from the hub. Only the transport adapter can call it.
    function receiveMessage(uint64 sourceId, bytes calldata message) external nonReentrant {
        if (msg.sender != address(transport) || address(transport) == address(0)) revert NotTransport(msg.sender);
        if (sourceId != hubId) revert UnknownSource(sourceId);

        (uint8 kind, bytes memory payload) = Messages.decode(message);
        if (kind == Messages.COMPLIANCE) {
            _applyStatus(payload);
        } else if (kind == Messages.MINT) {
            _mint(payload);
        } else if (kind == Messages.PAUSE) {
            bool value = Messages.decodePause(payload);
            hubPaused = value;
            emit HubPausedChanged(value);
        } else {
            revert UnexpectedMessage(kind);
        }
    }

    /// @dev Applies a status only if it is newer than the last one applied, so late messages cannot undo
    /// later decisions.
    function _applyStatus(bytes memory payload) internal {
        (address account, InvestorStatus status, uint64 sequence) = Messages.decodeCompliance(payload);
        if (sequence <= sequenceOf[account]) {
            emit StaleStatusIgnored(account, status, sequence);
            return;
        }
        sequenceOf[account] = sequence;
        statusOf[account] = status;
        emit StatusApplied(account, status, sequence);
    }

    function _mint(bytes memory payload) internal {
        (bytes32 transferId, address recipient, uint256 amount) = Messages.decodeTransfer(payload);
        if (minted[transferId]) revert AlreadyMinted(transferId);
        minted[transferId] = true;
        token.mint(recipient, amount);
        emit MintedFromHub(transferId, recipient, amount);
    }

    function _setGuardianPaused(bool value) internal {
        if (msg.sender != guardian && msg.sender != owner()) revert NotGuardian(msg.sender);
        guardianPaused = value;
        emit GuardianPausedChanged(value);
    }

    function _transport() internal view returns (ITransport current) {
        current = transport;
        if (address(current) == address(0)) revert TransportNotSet();
    }
}
