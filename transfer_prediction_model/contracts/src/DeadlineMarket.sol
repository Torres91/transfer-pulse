// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Binary market on whether a transfer completes before a deadline.
///         After the deadline passes the market auto-resolves NO if not already resolved.
contract DeadlineMarket is ReentrancyGuard {
    enum Status { Open, ResolvedYes, ResolvedNo, Cancelled }

    struct Position {
        uint256 yes; // bet transfer happens before deadline
        uint256 no;
        bool    claimed;
    }

    address public immutable factory;
    address public immutable feeRecipient;
    uint256 public immutable deadline;

    string  public playerName;
    string  public fromClub;
    string  public toClub;
    string  public marketId;

    uint256 public yesPool;
    uint256 public noPool;
    Status  public status;

    mapping(address => Position) public positions;

    uint256 private constant FEE_BPS = 150;
    uint256 private constant BPS     = 10_000;

    event BetPlaced(address indexed bettor, bool isYes, uint256 amount);
    event Resolved(Status result);
    event Claimed(address indexed bettor, uint256 payout);

    error NotFactory();
    error MarketClosed();
    error AlreadyClaimed();
    error NoPosition();
    error MarketNotResolved();
    error ZeroAmount();

    constructor(
        address _factory,
        address _feeRecipient,
        string memory _playerName,
        string memory _fromClub,
        string memory _toClub,
        string memory _marketId,
        uint256 _deadline
    ) {
        factory      = _factory;
        feeRecipient = _feeRecipient;
        playerName   = _playerName;
        fromClub     = _fromClub;
        toClub       = _toClub;
        marketId     = _marketId;
        deadline     = _deadline;
        status       = Status.Open;
    }

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

    /// @notice Called by factory/oracle when transfer is officially confirmed before deadline
    function resolveYes() external {
        if (msg.sender != factory) revert NotFactory();
        _requireOpen();
        status = Status.ResolvedYes;
        emit Resolved(Status.ResolvedYes);
    }

    /// @notice Can be called by anyone after the deadline has passed without resolution
    function resolveNoAfterDeadline() external {
        if (status != Status.Open) revert MarketClosed();
        require(block.timestamp > deadline, "Deadline not passed");
        status = Status.ResolvedNo;
        emit Resolved(Status.ResolvedNo);
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
    }

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
            payout = pos.yes + pos.no;
        } else {
            revert MarketNotResolved();
        }

        pos.claimed = true;
        emit Claimed(msg.sender, payout);
        (bool ok,) = msg.sender.call{value: payout}("");
        require(ok, "Transfer failed");
    }

    function yesOddsBps() external view returns (uint256) {
        uint256 total = yesPool + noPool;
        if (total == 0) return 5000;
        return (yesPool * BPS) / total;
    }

    function isExpired() external view returns (bool) {
        return block.timestamp > deadline;
    }

    function _calcPayout(uint256 stake, uint256 winnerPool, uint256 totalPot)
        internal pure returns (uint256)
    {
        uint256 gross = (stake * totalPot) / winnerPool;
        uint256 fee   = (gross * FEE_BPS) / BPS;
        return gross - fee;
    }

    function _requireOpen() internal view {
        if (status != Status.Open) revert MarketClosed();
        if (block.timestamp > deadline) revert MarketClosed();
    }

    receive() external payable {}
}
