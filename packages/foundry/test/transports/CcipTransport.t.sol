// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { Client } from "../../contracts/transports/ccip/Client.sol";
import { IAny2EVMMessageReceiver } from "../../contracts/transports/ccip/IRouterClient.sol";
import { CcipTransport } from "../../contracts/transports/CcipTransport.sol";
import { MockCcipRouter } from "../mocks/MockCcip.sol";
import { RecordingReceiver } from "./AxelarTransport.t.sol";

contract CcipTransportTest is Test {
    uint64 internal constant HEDERA = 296;
    uint64 internal constant ARBITRUM = 421_614;
    uint64 internal constant HEDERA_SELECTOR = 222_782_988_166_878_823;
    uint64 internal constant ARBITRUM_SELECTOR = 3_478_487_238_524_512_106;
    uint256 internal constant FEE = 3e8;

    MockCcipRouter internal router = new MockCcipRouter(HEDERA_SELECTOR, FEE);
    RecordingReceiver internal receiver = new RecordingReceiver();
    CcipTransport internal transport;
    address internal owner = makeAddr("owner");
    address internal peer = makeAddr("peer");
    address internal payer = makeAddr("payer");

    function setUp() public {
        transport = new CcipTransport(router, receiver, HEDERA, owner);
        vm.prank(owner);
        transport.setRoute(ARBITRUM, ARBITRUM_SELECTOR, peer, 200_000);
        vm.deal(payer, 10e8);
    }

    function test_quote_usesTheRouter() public view {
        assertEq(transport.quote(ARBITRUM, "hello"), FEE);
    }

    function test_quote_unknownEndpoint() public {
        vm.expectRevert(abi.encodeWithSelector(CcipTransport.UnknownEndpoint.selector, 1));
        transport.quote(1, "");
    }

    function test_send_buildsTheCcipMessage() public {
        vm.prank(payer, payer);
        receiver.send{ value: FEE }(transport, ARBITRUM, "hello");

        MockCcipRouter.Sent memory sent = router.getSent(0);
        assertEq(sent.sender, address(transport));
        assertEq(sent.destinationChainSelector, ARBITRUM_SELECTOR);
        assertEq(abi.decode(sent.receiver, (address)), peer);
        (uint64 origin, uint64 destination, bytes memory message) = abi.decode(sent.data, (uint64, uint64, bytes));
        assertEq(origin, HEDERA);
        assertEq(destination, ARBITRUM);
        assertEq(message, "hello");
        assertEq(
            sent.extraArgs,
            Client.argsToBytes(Client.GenericExtraArgsV2({ gasLimit: 200_000, allowOutOfOrderExecution: true }))
        );
        assertEq(sent.fee, FEE);
    }

    function test_send_returnsExtraValueToThePayer() public {
        vm.prank(payer, payer);
        receiver.send{ value: 5e8 }(transport, ARBITRUM, "hello");
        assertEq(payer.balance, 10e8 - FEE);
    }

    function test_send_onlyReceiver() public {
        vm.expectRevert(abi.encodeWithSelector(CcipTransport.NotReceiver.selector, address(this)));
        transport.send{ value: FEE }(ARBITRUM, "hello");
    }

    function test_send_rejectsInsufficientFee() public {
        vm.expectRevert(abi.encodeWithSelector(CcipTransport.InsufficientFee.selector, FEE, FEE - 1));
        receiver.send{ value: FEE - 1 }(transport, ARBITRUM, "hello");
    }

    function test_receive_deliversFromTheRegisteredPeer() public {
        _receive(ARBITRUM_SELECTOR, peer, abi.encode(ARBITRUM, HEDERA, bytes("hi")));
        assertEq(receiver.lastSource(), ARBITRUM);
        assertEq(receiver.lastMessage(), "hi");
    }

    function test_receive_onlyFromTheRouter() public {
        Client.Any2EVMMessage memory message = _message(ARBITRUM_SELECTOR, peer, abi.encode(ARBITRUM, HEDERA, ""));
        vm.expectRevert(abi.encodeWithSelector(CcipTransport.NotRouter.selector, address(this)));
        transport.ccipReceive(message);
    }

    function test_receive_rejectsOtherDestinations() public {
        vm.expectRevert(abi.encodeWithSelector(CcipTransport.WrongDestination.selector, 1));
        _receive(ARBITRUM_SELECTOR, peer, abi.encode(ARBITRUM, uint64(1), bytes("hi")));
    }

    function test_receive_rejectsOtherSenders() public {
        address attacker = makeAddr("attacker");
        vm.expectRevert(
            abi.encodeWithSelector(
                CcipTransport.UnknownSender.selector, ARBITRUM, ARBITRUM_SELECTOR, abi.encode(attacker)
            )
        );
        _receive(ARBITRUM_SELECTOR, attacker, abi.encode(ARBITRUM, HEDERA, bytes("hi")));
    }

    function test_receive_rejectsTheWrongChain() public {
        vm.expectRevert(
            abi.encodeWithSelector(CcipTransport.UnknownSender.selector, ARBITRUM, HEDERA_SELECTOR, abi.encode(peer))
        );
        _receive(HEDERA_SELECTOR, peer, abi.encode(ARBITRUM, HEDERA, bytes("hi")));
    }

    function test_supportsTheReceiverInterface() public view {
        assertTrue(transport.supportsInterface(type(IAny2EVMMessageReceiver).interfaceId));
        assertTrue(transport.supportsInterface(type(IERC165).interfaceId));
        assertFalse(transport.supportsInterface(0xffffffff));
    }

    function _receive(uint64 sourceChainSelector, address sender, bytes memory data) internal {
        router.deliver(address(transport), _message(sourceChainSelector, sender, data));
    }

    function _message(uint64 sourceChainSelector, address sender, bytes memory data)
        internal
        pure
        returns (Client.Any2EVMMessage memory)
    {
        return Client.Any2EVMMessage({
            messageId: keccak256(data),
            sourceChainSelector: sourceChainSelector,
            sender: abi.encode(sender),
            data: data,
            destTokenAmounts: new Client.EVMTokenAmount[](0)
        });
    }
}
