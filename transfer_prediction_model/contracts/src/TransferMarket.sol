// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Parimutuel binary prediction market for a single transfer rumour.
///         YES = transfer happens. NO = it doesn't.
///         Platform takes 1.5% fee on winning payouts.
contract TransferMarket is ReentrancyGuard {
    // ─────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────

    enum Status { Open, Closed, ResolvedYes, ResolvedNo, Cancelled }

    struct Position {
        uint256 yes;
        uint256 no;
        bool    claimed;
    }

    // ─────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────

    address public immutable factory;
    address public immutable feeRecipient;
    uint256 public immutable closesAt;

    string  public playerName;
    string  public fromClub;
    string  public toClub;
    string  public marketId; // off-chain Supabase ID for linking

    uint256 public yesPool;
    uint256 public noPool;

    Status  public status;

    mapping(address => Position) public positions;

    uint256 private constant FEE_BPS = 150; // 1.5%
    uint256 private constant BPS     = 10_000;

    // ─────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────

    event BetPlaced(address indexed bettor, bool isYes, uint256 amount);
    event Resolved(Status result);
    event Claimed(address indexed bettor, uint256 payout);
    event Cancelled();

    // ─────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────

    error MarketNotOpen();
    error MarketNotResolved();
    error AlreadyClaimed();
    error NoPosition();
    error NotFactory();
    error MarketExpired();
    error ZeroAmount();

    // ─────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────

    constructor(
        address _factory,
        address _feeRecipient,
        string memory _playerName,
        string memory _fromClub,
        string memory _toClub,
        string memory _marketId,
        uint256 _closesAt
    ) {
        factory      = _factory;
        feeRecipient = _feeRecipient;
        playerName   = _playerName;
        fromClub     = _fromClub;
        toClub       = _toClub;
        marketId     = _marketId;
        closesAt     = _closesAt;
        status       = Status.Open;
    }

    // ─────────────────────────────────────────────
    // Betting
    // ─────────────────────────────────────────────

    function betYes() external payable nonReentrant {
        _requireOpen();
        if (msg.value == 0) revert ZeroAmount();
        yesPool                    += msg.value;
        positions[msg.sender].yes  += msg.value;
        emit BetPlaced(msg.sender, true, msg.value);
    }

    function betNo() external payable nonReentrant {
        _requireOpen();
        if (msg.value == 0) revert ZeroAmount();
        noPool                    += msg.value;
        positions[msg.sender].no  += msg.value;
        emit BetPlaced(msg.sender, false, msg.value);
    }

    // ─────────────────────────────────────────────
    // Resolution (called by factory / oracle)
    // ─────────────────────────────────────────────

    function resolveYes() external {
        if (msg.sender != factory) revert NotFactory();
        _requireOpen();
        status = Status.ResolvedYes;
        emit Resolved(Status.ResolvedYes);
    }

    function resolveNo() external {
        if (msg.sender != factory) revert NotFactory();
        _requireOpen();
        status = Status.ResolvedNo;
        emit Resolved(Status.ResolvedNo);
    }

    function cancel() external {
        if (msg.sender != factory) revert NotFactory();
        status = Status.Cancelled;
        emit Cancelled();
    }

    function closeMarket() external {
        if (msg.sender != factory) revert NotFactory();
        if (status != Status.Open) revert MarketNotOpen();
        status = Status.Closed;
    }

    // ─────────────────────────────────────────────
    // Claiming
    // ─────────────────────────────────────────────

    function claim() external nonReentrant {
        Position storage pos = positions[msg.sender];
        if (pos.claimed) revert AlreadyClaimed();

        uint256 payout;

        if (status == Status.ResolvedYes) {
            if (pos.yes == 0) revert NoPosition();
            payout = _calcPayout(pos.yes, yesPool, yesPool + noPool);
        } else if (status == Status.ResolvedNo) {
            if (pos.no == 0) revert NoPosition();
            payout = _calcPayout(pos.no, noPool, yesPool + noPool);
        } else if (status == Status.Cancelled) {
            // Full refund on cancel
            payout = pos.yes + pos.no;
        } else {
            revert MarketNotResolved();
        }

        pos.claimed = true;
        emit Claimed(msg.sender, payout);
        (bool ok,) = msg.sender.call{value: payout}("");
        require(ok, "Transfer failed");
    }

    // ─────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────

    /// @notice Current implied probability of YES (0-10000 = 0%-100%)
    function yesOddsBps() external view returns (uint256) {
        uint256 total = yesPool + noPool;
        if (total == 0) return 5000; // 50/50 before any bets
        return (yesPool * BPS) / total;
    }

    function totalPool() external view returns (uint256) {
        return yesPool + noPool;
    }

    // ─────────────────────────────────────────────
    // Internal
    // ─────────────────────────────────────────────

    function _calcPayout(uint256 stake, uint256 winnerPool, uint256 totalPot)
        internal
        pure
        returns (uint256)
    {
        uint256 gross    = (stake * totalPot) / winnerPool;
        uint256 fee      = (gross * FEE_BPS) / BPS;
        return gross - fee;
    }

    function _requireOpen() internal view {
        if (status != Status.Open) revert MarketNotOpen();
        if (block.timestamp >= closesAt) revert MarketExpired();
    }

    receive() external payable {}
}
