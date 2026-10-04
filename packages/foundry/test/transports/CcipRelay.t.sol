// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { Client } from "../../contracts/transports/ccip/Client.sol";
import { CcipRelay } from "../../contracts/transports/CcipRelay.sol";
import { MockCcipRouter } from "../mocks/MockCcip.sol";

contract CcipRelayTest is Test {
    uint64 internal constant HEDERA = 296;
    uint64 internal constant ROBINHOOD = 46_630;
    uint64 internal constant HEDERA_SELECTOR = 222_782_988_166_878_823;
    uint64 internal constant BASE_SELECTOR = 10_344_971_235_874_465_080;
    uint64 internal constant ROBINHOOD_SELECTOR = 2_032_988_798_112_970_440;
    uint256 internal constant FEE = 0.0001 ether;

    MockCcipRouter internal router = new MockCcipRouter(BASE_SELECTOR, FEE);
    CcipRelay internal relay;
    address internal owner = makeAddr("owner");
    address internal hubTransport = makeAddr("hubTransport");
    address internal spokeTransport = makeAddr("spokeTransport");

    function setUp() public {
        relay = new CcipRelay(router, owner);
        vm.startPrank(owner);
        relay.setRoute(HEDERA, HEDERA_SELECTOR, hubTransport, 300_000);
        relay.setRoute(ROBINHOOD, ROBINHOOD_SELECTOR, spokeTransport, 200_000);
        vm.stopPrank();
        vm.deal(address(relay), 1 ether);
    }

    function test_forwardsFromHubToSpoke() public {
        bytes memory payload = abi.encode(HEDERA, ROBINHOOD, bytes("mint"));
        vm.expectEmit(false, false, false, true, address(relay));
        emit CcipRelay.Relayed(bytes32(0), bytes32(0), HEDERA, ROBINHOOD, FEE);
        _deliver(HEDERA_SELECTOR, hubTransport, payload);

        MockCcipRouter.Sent memory sent = router.getSent(0);
        assertEq(sent.destinationChainSelector, ROBINHOOD_SELECTOR);
        assertEq(abi.decode(sent.receiver, (address)), spokeTransport);
        assertEq(sent.data, payload);
        assertEq(
            sent.extraArgs,
            Client.argsToBytes(Client.GenericExtraArgsV2({ gasLimit: 200_000, allowOutOfOrderExecution: true }))
        );
        assertEq(address(relay).balance, 1 ether - FEE);
    }

    function test_forwardsFromSpokeToHub() public {
        _deliver(ROBINHOOD_SELECTOR, spokeTransport, abi.encode(ROBINHOOD, HEDERA, bytes("release")));
        assertEq(router.getSent(0).destinationChainSelector, HEDERA_SELECTOR);
    }

    function test_rejectsSpoofedOrigin() public {
        bytes memory payload = abi.encode(HEDERA, ROBINHOOD, bytes("mint"));
        vm.expectRevert(
            abi.encodeWithSelector(
                CcipRelay.UnknownSender.selector, HEDERA, ROBINHOOD_SELECTOR, abi.encode(spokeTransport)
            )
        );
        _deliver(ROBINHOOD_SELECTOR, spokeTransport, payload);
    }

    function test_rejectsUnknownDestination() public {
        vm.expectRevert(abi.encodeWithSelector(CcipRelay.UnknownEndpoint.selector, 1));
        _deliver(HEDERA_SELECTOR, hubTransport, abi.encode(HEDERA, uint64(1), bytes("mint")));
    }

    function test_revertsWhenUnfunded() public {
        vm.prank(owner);
        relay.withdraw(payable(owner), 1 ether);
        vm.expectRevert(abi.encodeWithSelector(CcipRelay.InsufficientBalance.selector, FEE, 0));
        _deliver(HEDERA_SELECTOR, hubTransport, abi.encode(HEDERA, ROBINHOOD, bytes("mint")));
    }

    function test_onlyRouter() public {
        Client.Any2EVMMessage memory message = Client.Any2EVMMessage({
            messageId: bytes32(0),
            sourceChainSelector: HEDERA_SELECTOR,
            sender: abi.encode(hubTransport),
            data: abi.encode(HEDERA, ROBINHOOD, bytes("mint")),
            destTokenAmounts: new Client.EVMTokenAmount[](0)
        });
        vm.expectRevert(abi.encodeWithSelector(CcipRelay.NotRouter.selector, address(this)));
        relay.ccipReceive(message);
    }

    function test_settings_onlyOwner() public {
        vm.expectRevert();
        relay.setRoute(1, 1, address(1), 1);
        vm.expectRevert();
        relay.withdraw(payable(address(this)), 1);
    }

    function test_quoteForward() public view {
        assertEq(relay.quoteForward(ROBINHOOD, ""), FEE);
    }

    function _deliver(uint64 sourceChainSelector, address sender, bytes memory payload) internal {
        router.deliver(
            address(relay),
            Client.Any2EVMMessage({
                messageId: keccak256(payload),
                sourceChainSelector: sourceChainSelector,
                sender: abi.encode(sender),
                data: payload,
                destTokenAmounts: new Client.EVMTokenAmount[](0)
            })
        );
    }

    receive() external payable { }
}
