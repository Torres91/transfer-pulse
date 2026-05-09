// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {TransferMarket} from "./TransferMarket.sol";
import {FeeMarket} from "./FeeMarket.sol";
import {DeadlineMarket} from "./DeadlineMarket.sol";

/// @notice Factory that creates and administers all TransferPulse markets.
///         Owner = platform admin (multisig in production).
contract TransferMarketFactory is Ownable {
    // ─────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────

    address public feeRecipient;

    address[] public allMarkets;
    mapping(address => bool) public isMarket;

    // marketId (Supabase UUID) → contract address
    mapping(string => address) public marketById;

    // ─────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────

    event BinaryMarketCreated(address indexed market, string marketId, string playerName);
    event FeeMarketCreated(address indexed market, string marketId, string playerName, uint256 threshold);
    event DeadlineMarketCreated(address indexed market, string marketId, string playerName, uint256 deadline);
    event MarketResolved(address indexed market, string resolution);
    event MarketCancelled(address indexed market);
    event FeeRecipientUpdated(address indexed newRecipient);

    // ─────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────

    error MarketIdAlreadyExists();
    error NotAMarket();

    // ─────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────

    constructor(address _feeRecipient) Ownable(msg.sender) {
        feeRecipient = _feeRecipient;
    }

    // ─────────────────────────────────────────────
    // Factory methods
    // ─────────────────────────────────────────────

    function createBinaryMarket(
        string calldata playerName,
        string calldata fromClub,
        string calldata toClub,
        string calldata marketId,
        uint256 closesAt
    ) external onlyOwner returns (address) {
        if (marketById[marketId] != address(0)) revert MarketIdAlreadyExists();

        TransferMarket market = new TransferMarket(
            address(this),
            feeRecipient,
            playerName,
            fromClub,
            toClub,
            marketId,
            closesAt
        );

        _register(address(market), marketId);
        emit BinaryMarketCreated(address(market), marketId, playerName);
        return address(market);
    }

    function createFeeMarket(
        string calldata playerName,
        string calldata fromClub,
        string calldata toClub,
        string calldata marketId,
        uint256 closesAt,
        uint256 feeThreshold
    ) external onlyOwner returns (address) {
        if (marketById[marketId] != address(0)) revert MarketIdAlreadyExists();

        FeeMarket market = new FeeMarket(
            address(this),
            feeRecipient,
            playerName,
            fromClub,
            toClub,
            marketId,
            closesAt,
            feeThreshold
        );

        _register(address(market), marketId);
        emit FeeMarketCreated(address(market), marketId, playerName, feeThreshold);
        return address(market);
    }

    function createDeadlineMarket(
        string calldata playerName,
        string calldata fromClub,
        string calldata toClub,
        string calldata marketId,
        uint256 deadline
    ) external onlyOwner returns (address) {
        if (marketById[marketId] != address(0)) revert MarketIdAlreadyExists();

        DeadlineMarket market = new DeadlineMarket(
            address(this),
            feeRecipient,
            playerName,
            fromClub,
            toClub,
            marketId,
            deadline
        );

        _register(address(market), marketId);
        emit DeadlineMarketCreated(address(market), marketId, playerName, deadline);
        return address(market);
    }

    // ─────────────────────────────────────────────
    // Resolution (owner / oracle)
    // ─────────────────────────────────────────────

    function resolveBinaryYes(address market) external onlyOwner {
        _assertIsMarket(market);
        TransferMarket(payable(market)).resolveYes();
        emit MarketResolved(market, "yes");
    }

    function resolveBinaryNo(address market) external onlyOwner {
        _assertIsMarket(market);
        TransferMarket(payable(market)).resolveNo();
        emit MarketResolved(market, "no");
    }

    function resolveFeeOver(address market) external onlyOwner {
        _assertIsMarket(market);
        FeeMarket(payable(market)).resolveOver();
        emit MarketResolved(market, "over");
    }

    function resolveFeeUnder(address market) external onlyOwner {
        _assertIsMarket(market);
        FeeMarket(payable(market)).resolveUnder();
        emit MarketResolved(market, "under");
    }

    function resolveDeadlineYes(address market) external onlyOwner {
        _assertIsMarket(market);
        DeadlineMarket(payable(market)).resolveYes();
        emit MarketResolved(market, "yes");
    }

    function resolveDeadlineNo(address market) external onlyOwner {
        _assertIsMarket(market);
        DeadlineMarket(payable(market)).resolveNo();
        emit MarketResolved(market, "no");
    }

    function cancelMarket(address market) external onlyOwner {
        _assertIsMarket(market);
        // Try each type — only one will succeed
        try TransferMarket(payable(market)).cancel() {
            emit MarketCancelled(market);
        } catch {
            try FeeMarket(payable(market)).cancel() {
                emit MarketCancelled(market);
            } catch {
                DeadlineMarket(payable(market)).cancel();
                emit MarketCancelled(market);
            }
        }
    }

    // ─────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────

    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        feeRecipient = _feeRecipient;
        emit FeeRecipientUpdated(_feeRecipient);
    }

    function allMarketsLength() external view returns (uint256) {
        return allMarkets.length;
    }

    // ─────────────────────────────────────────────
    // Internal
    // ─────────────────────────────────────────────

    function _register(address market, string calldata marketId) internal {
        allMarkets.push(market);
        isMarket[market] = true;
        marketById[marketId] = market;
    }

    function _assertIsMarket(address market) internal view {
        if (!isMarket[market]) revert NotAMarket();
    }
}
