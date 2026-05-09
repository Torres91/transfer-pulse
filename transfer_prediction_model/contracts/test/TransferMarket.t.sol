// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {TransferMarketFactory} from "../src/TransferMarketFactory.sol";
import {TransferMarket} from "../src/TransferMarket.sol";

contract TransferMarketTest is Test {
    TransferMarketFactory factory;
    address admin      = makeAddr("admin");
    address feeWallet  = makeAddr("fees");
    address alice      = makeAddr("alice");
    address bob        = makeAddr("bob");

    uint256 closesAt;

    function setUp() public {
        vm.prank(admin);
        factory  = new TransferMarketFactory(feeWallet);
        closesAt = block.timestamp + 30 days;
    }

    function _createMarket() internal returns (TransferMarket) {
        vm.prank(admin);
        address m = factory.createBinaryMarket(
            "Victor Osimhen",
            "Napoli",
            "Chelsea",
            "market-001",
            closesAt
        );
        return TransferMarket(payable(m));
    }

    // ─────────────────────────────────────────────
    // Basic betting
    // ─────────────────────────────────────────────

    function test_BetYes() public {
        TransferMarket market = _createMarket();

        deal(alice, 10 ether);
        vm.prank(alice);
        market.betYes{value: 5 ether}();

        assertEq(market.yesPool(), 5 ether);
        assertEq(market.noPool(), 0);
        (uint256 yesPos,,) = market.positions(alice);
        assertEq(yesPos, 5 ether);
    }

    function test_BetNo() public {
        TransferMarket market = _createMarket();

        deal(bob, 10 ether);
        vm.prank(bob);
        market.betNo{value: 3 ether}();

        assertEq(market.noPool(), 3 ether);
        (, uint256 noPos,) = market.positions(bob);
        assertEq(noPos, 3 ether);
    }

    // ─────────────────────────────────────────────
    // Odds calculation
    // ─────────────────────────────────────────────

    function test_OddsInitiallyFiftyFifty() public {
        TransferMarket market = _createMarket();
        assertEq(market.yesOddsBps(), 5000);
    }

    function test_OddsShiftWithBets() public {
        TransferMarket market = _createMarket();

        deal(alice, 100 ether);
        deal(bob, 100 ether);

        vm.prank(alice);
        market.betYes{value: 75 ether}(); // 75 YES

        vm.prank(bob);
        market.betNo{value: 25 ether}(); // 25 NO

        // YES odds = 75/100 = 75%
        assertEq(market.yesOddsBps(), 7500);
    }

    // ─────────────────────────────────────────────
    // Resolution and claiming
    // ─────────────────────────────────────────────

    function test_ResolveYesAndClaim() public {
        TransferMarket market = _createMarket();

        deal(alice, 100 ether);
        deal(bob, 100 ether);

        vm.prank(alice);
        market.betYes{value: 60 ether}();

        vm.prank(bob);
        market.betNo{value: 40 ether}();

        vm.prank(admin);
        factory.resolveBinaryYes(address(market));

        uint256 aliceBefore = alice.balance;
        vm.prank(alice);
        market.claim();

        // Alice bet 60, total pot = 100
        // Gross payout = 60/60 * 100 = 100
        // After 1.5% fee = 100 * 0.985 = 98.5
        uint256 aliceGained = alice.balance - aliceBefore;
        assertApproxEqAbs(aliceGained, 98.5 ether, 0.01 ether);
    }

    function test_ResolveNoAndClaim() public {
        TransferMarket market = _createMarket();

        deal(alice, 100 ether);
        deal(bob, 100 ether);

        vm.prank(alice);
        market.betYes{value: 60 ether}();

        vm.prank(bob);
        market.betNo{value: 40 ether}();

        vm.prank(admin);
        factory.resolveBinaryNo(address(market));

        uint256 bobBefore = bob.balance;
        vm.prank(bob);
        market.claim();

        // Bob bet 40, total pot = 100
        // Gross = 40/40 * 100 = 100
        // After fee = 98.5
        uint256 bobGained = bob.balance - bobBefore;
        assertApproxEqAbs(bobGained, 98.5 ether, 0.01 ether);
    }

    function test_CancelRefundsAll() public {
        TransferMarket market = _createMarket();

        deal(alice, 10 ether);
        deal(bob, 10 ether);

        vm.prank(alice);
        market.betYes{value: 3 ether}();

        vm.prank(bob);
        market.betNo{value: 2 ether}();

        vm.prank(admin);
        factory.cancelMarket(address(market));

        uint256 aliceBefore = alice.balance;
        vm.prank(alice);
        market.claim();
        assertEq(alice.balance - aliceBefore, 3 ether);

        uint256 bobBefore = bob.balance;
        vm.prank(bob);
        market.claim();
        assertEq(bob.balance - bobBefore, 2 ether);
    }

    // ─────────────────────────────────────────────
    // Guards
    // ─────────────────────────────────────────────

    function test_CannotBetAfterExpiry() public {
        TransferMarket market = _createMarket();

        vm.warp(closesAt + 1);

        deal(alice, 10 ether);
        vm.prank(alice);
        vm.expectRevert(TransferMarket.MarketExpired.selector);
        market.betYes{value: 1 ether}();
    }

    function test_CannotClaimTwice() public {
        TransferMarket market = _createMarket();

        deal(alice, 10 ether);
        vm.prank(alice);
        market.betYes{value: 5 ether}();

        vm.prank(admin);
        factory.resolveBinaryYes(address(market));

        vm.prank(alice);
        market.claim();

        vm.prank(alice);
        vm.expectRevert(TransferMarket.AlreadyClaimed.selector);
        market.claim();
    }

    function test_NonAdminCannotResolve() public {
        TransferMarket market = _createMarket();

        vm.prank(alice);
        vm.expectRevert(TransferMarket.NotFactory.selector);
        market.resolveYes();
    }
}
