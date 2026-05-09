// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Parimutuel over/under market on a transfer fee.
///         OVER = fee exceeds threshold. UNDER = fee is below threshold.
contract FeeMarket is ReentrancyGuard {
    enum Status { Open, Closed, ResolvedOver, ResolvedUnder, Cancelled }

    struct Position {
        uint256 over;
        uint256 under;
        bool    claimed;
    }

    address public immutable factory;
    address public immutable feeRecipient;
    uint256 public immutable closesAt;
    uint256 public immutable feeThreshold; // in pence (GBP) × 100

    string  public playerName;
    string  public fromClub;
    string  public toClub;
    string  public marketId;

    uint256 public overPool;
    uint256 public underPool;
    Status  public status;

    mapping(address => Position) public positions;

    uint256 private constant FEE_BPS = 150;
    uint256 private constant BPS     = 10_000;

    event BetPlaced(address indexed bettor, bool isOver, uint256 amount);
    event Resolved(Status result);
    event Claimed(address indexed bettor, uint256 payout);

    error MarketNotOpen();
    error MarketNotResolved();
    error AlreadyClaimed();
    error NoPosition();
    error NotFactory();
    error ZeroAmount();

    constructor(
        address _factory,
        address _feeRecipient,
        string memory _playerName,
        string memory _fromClub,
        string memory _toClub,
        string memory _marketId,
        uint256 _closesAt,
        uint256 _feeThreshold
    ) {
        factory       = _factory;
        feeRecipient  = _feeRecipient;
        playerName    = _playerName;
        fromClub      = _fromClub;
        toClub        = _toClub;
        marketId      = _marketId;
        closesAt      = _closesAt;
        feeThreshold  = _feeThreshold;
        status        = Status.Open;
    }

    function betOver() external payable nonReentrant {
        _requireOpen();
        if (msg.value == 0) revert ZeroAmount();
        overPool                    += msg.value;
        positions[msg.sender].over  += msg.value;
        emit BetPlaced(msg.sender, true, msg.value);
    }

    function betUnder() external payable nonReentrant {
        _requireOpen();
        if (msg.value == 0) revert ZeroAmount();
        underPool                    += msg.value;
        positions[msg.sender].under  += msg.value;
        emit BetPlaced(msg.sender, false, msg.value);
    }

    function resolveOver() external {
        if (msg.sender != factory) revert NotFactory();
        _requireOpen();
        status = Status.ResolvedOver;
        emit Resolved(Status.ResolvedOver);
    }

    function resolveUnder() external {
        if (msg.sender != factory) revert NotFactory();
        _requireOpen();
        status = Status.ResolvedUnder;
        emit Resolved(Status.ResolvedUnder);
    }

    function cancel() external {
        if (msg.sender != factory) revert NotFactory();
        status = Status.Cancelled;
    }

    function claim() external nonReentrant {
        Position storage pos = positions[msg.sender];
        if (pos.claimed) revert AlreadyClaimed();

        uint256 payout;
        if (status == Status.ResolvedOver) {
            if (pos.over == 0) revert NoPosition();
            payout = _calcPayout(pos.over, overPool, overPool + underPool);
        } else if (status == Status.ResolvedUnder) {
            if (pos.under == 0) revert NoPosition();
            payout = _calcPayout(pos.under, underPool, overPool + underPool);
        } else if (status == Status.Cancelled) {
            payout = pos.over + pos.under;
        } else {
            revert MarketNotResolved();
        }

        pos.claimed = true;
        emit Claimed(msg.sender, payout);
        (bool ok,) = msg.sender.call{value: payout}("");
        require(ok, "Transfer failed");
    }

    function overOddsBps() external view returns (uint256) {
        uint256 total = overPool + underPool;
        if (total == 0) return 5000;
        return (overPool * BPS) / total;
    }

    function _calcPayout(uint256 stake, uint256 winnerPool, uint256 totalPot)
        internal pure returns (uint256)
    {
        uint256 gross = (stake * totalPot) / winnerPool;
        uint256 fee   = (gross * FEE_BPS) / BPS;
        return gross - fee;
    }

    function _requireOpen() internal view {
        if (status != Status.Open) revert MarketNotOpen();
    }

    receive() external payable {}
}
