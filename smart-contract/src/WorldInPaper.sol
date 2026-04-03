// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {ReceiverTemplate} from "./interfaces/ReceiverTemplate.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IWorldIDVerifier} from "./interfaces/IWorldIDVerifier.sol";

contract WorldInPaper is ReceiverTemplate {
    // =====================================================
    // ---------------- TYPES ----------------
    // =====================================================

    enum Origin {
        Solana,
        Base,
        Ethereum,
        Bsc,
        World,
        Hyperliquid
    }

    struct Trade {
        uint256 id;
        address trader;
        string asset_address;
        Origin origin;
        bool isBuy;
        uint256 amountIn;
        uint256 amountOut;
    }

    struct TradeToSettle {
        uint256 id;
        address trader;
        string asset_address;
        Origin origin;
        uint256 amountIn;
    }

    struct WorldIdVerification {
        uint256 nullifier;
        uint256 action;
        uint64 rpId;
        uint256 nonce;
        uint256 signalHash;
        uint64 expiresAtMin;
        uint64 issuerSchemaId;
        uint256 credentialGenesisIssuedAtMin;
        uint256[5] zeroKnowledgeProof;
    }

    struct Game {
        uint256 id;
        uint256 entryAmount;
        uint256 startTime;
        uint256 endTime;
        uint16 maxPlayers;
        uint16 playerCount;
        address creator;
        bool exists;
        Trade[] trades;
    }

    // =====================================================
    // -------------- CONSTANTS/STORAGE --------------
    // =====================================================

    uint16 public constant MIN_PLAYERS = 2;
    uint16 public constant MAX_PLAYERS = 100;

    IERC20 public immutable USDC;
    IWorldIDVerifier public immutable verifier;
    uint256 public nextGameId = 1;
    uint256 public nextTradeId = 1;
    uint256 public nextTradeToSettleId = 1;
    mapping(uint256 => bool) public nullifierUsed;

    mapping(uint256 gameId => Game game) private _games;
    mapping(uint256 gameId => address[] players) private _gamePlayers;
    mapping(uint256 gameId => mapping(address player => bool joined))
        private _hasJoined;
    mapping(uint256 tradeId => TradeToSettle tradeToSettle)
        private _tradesToSettle;

    // =====================================================
    // ---------------- ERRORS ----------------
    // =====================================================

    error InvalidUSDCAddress();
    error InvalidVerifierAddress();
    error InvalidNullifier();
    error TradeToSettleNotFound(uint256 tradeId);
    error InvalidEntryAmount();
    error InvalidMaxPlayers(
        uint16 provided,
        uint16 minAllowed,
        uint16 maxAllowed
    );
    error StartTimeMustBeFuture(uint256 provided, uint256 currentTimestamp);
    error InvalidTimeRange(uint256 startTime, uint256 endTime);
    error GameNotFound(uint256 gameId);
    error GameAlreadyStarted(
        uint256 gameId,
        uint256 startTime,
        uint256 currentTimestamp
    );
    error GameFull(uint256 gameId, uint16 maxPlayers);
    error AlreadyJoined(uint256 gameId, address player);
    error NotGamePlayer(uint256 gameId, address player);
    error GameNotStarted(
        uint256 gameId,
        uint256 startTime,
        uint256 currentTimestamp
    );
    error GameEnded(uint256 gameId, uint256 endTime, uint256 currentTimestamp);
    error EmptyAssetAddress();
    error InvalidAmountIn();
    error InvalidTradeAmounts(uint256 amountIn, uint256 amountOut);
    error InsufficientAllowance(
        address player,
        uint256 allowance,
        uint256 required
    );
    error TransferFailed(address from, uint256 amount);

    // =====================================================
    // ---------------- EVENTS ----------------
    // =====================================================

    event GameCreated(
        uint256 indexed gameId,
        address indexed creator,
        uint256 entryAmount,
        uint16 maxPlayers,
        uint256 startTime,
        uint256 endTime
    );

    event GameJoined(
        uint256 indexed gameId,
        address indexed player,
        uint16 playerCount
    );
    event TradeRecorded(
        uint256 indexed gameId,
        uint256 indexed tradeId,
        address indexed trader,
        string asset_address,
        Origin origin,
        bool isBuy,
        uint256 amountIn,
        uint256 amountOut
    );
    event SettlementRequest(
        uint256 indexed tradeId,
        string asset_address,
        Origin origin
    );
    event TradeSettled(
        uint256 indexed tradeId,
        address indexed trader,
        string asset_address,
        Origin origin,
        uint256 amountIn,
        uint256 executionPrice
    );

    // =====================================================
    // -------------- CONSTRUCTOR --------------
    // =====================================================

    constructor(
        address _forwarderAddress,
        address _usdcAddress,
        IWorldIDVerifier _verifier
    ) ReceiverTemplate(_forwarderAddress) {
        if (_usdcAddress == address(0)) {
            revert InvalidUSDCAddress();
        }
        if (address(_verifier) == address(0)) {
            revert InvalidVerifierAddress();
        }
        USDC = IERC20(_usdcAddress);
        verifier = _verifier;
    }

    // =====================================================
    // ----------- EXTERNAL WRITE FUNCTIONS -----------
    // =====================================================

    function createGame(
        uint256 entryAmount,
        uint16 maxPlayers,
        uint256 startTime,
        uint256 endTime
    ) external returns (uint256 gameId) {
        address creator = _msgSender();

        _validateCreateParams(entryAmount, maxPlayers, startTime, endTime);

        gameId = nextGameId;
        unchecked {
            nextGameId = gameId + 1;
        }

        Game storage game = _games[gameId];
        game.id = gameId;
        game.entryAmount = entryAmount;
        game.startTime = startTime;
        game.endTime = endTime;
        game.maxPlayers = maxPlayers;
        game.creator = creator;
        game.exists = true;

        emit GameCreated(
            gameId,
            creator,
            entryAmount,
            maxPlayers,
            startTime,
            endTime
        );

        _joinGame(gameId, creator);
    }

    function joinGame(uint256 gameId) external {
        _joinGame(gameId, _msgSender());
    }

    function submitTrade(
        uint256 gameId,
        string calldata asset_address,
        Origin origin,
        bool isBuy,
        uint256 amountIn,
        uint256 amountOut
    ) external returns (uint256 tradeId) {
        Game storage game = _games[gameId];
        address trader = _msgSender();

        if (!game.exists) {
            revert GameNotFound(gameId);
        }
        if (!_hasJoined[gameId][trader]) {
            revert NotGamePlayer(gameId, trader);
        }
        if (block.timestamp < game.startTime) {
            revert GameNotStarted(gameId, game.startTime, block.timestamp);
        }
        if (block.timestamp >= game.endTime) {
            revert GameEnded(gameId, game.endTime, block.timestamp);
        }
        if (bytes(asset_address).length == 0) {
            revert EmptyAssetAddress();
        }
        if (amountIn == 0 || amountOut == 0) {
            revert InvalidTradeAmounts(amountIn, amountOut);
        }

        tradeId = nextTradeId;
        unchecked {
            nextTradeId = tradeId + 1;
        }

        game.trades.push(
            Trade({
                id: tradeId,
                trader: trader,
                asset_address: asset_address,
                origin: origin,
                isBuy: isBuy,
                amountIn: amountIn,
                amountOut: amountOut
            })
        );

        emit TradeRecorded(
            gameId,
            tradeId,
            trader,
            asset_address,
            origin,
            isBuy,
            amountIn,
            amountOut
        );
    }

    function submitTrade(
        string calldata asset_address,
        Origin origin,
        uint256 amountIn,
        WorldIdVerification calldata worldId
    ) external returns (uint256 tradeId) {
        if (nullifierUsed[worldId.nullifier]) {
            revert InvalidNullifier();
        }
        if (bytes(asset_address).length == 0) {
            revert EmptyAssetAddress();
        }
        if (amountIn == 0) {
            revert InvalidAmountIn();
        }

        verifier.verify(
            worldId.nullifier,
            worldId.action,
            worldId.rpId,
            worldId.nonce,
            worldId.signalHash,
            worldId.expiresAtMin,
            worldId.issuerSchemaId,
            worldId.credentialGenesisIssuedAtMin,
            worldId.zeroKnowledgeProof
        );

        nullifierUsed[worldId.nullifier] = true;

        tradeId = nextTradeToSettleId;
        unchecked {
            nextTradeToSettleId = tradeId + 1;
        }

        _tradesToSettle[tradeId] = TradeToSettle({
            id: tradeId,
            trader: _msgSender(),
            asset_address: asset_address,
            origin: origin,
            amountIn: amountIn
        });

        emit SettlementRequest(tradeId, asset_address, origin);
    }

    // =====================================================
    // ---------------- GETTERS ----------------
    // =====================================================

    function getGame(uint256 gameId) external view returns (Game memory) {
        Game memory game = _games[gameId];
        if (!game.exists) {
            revert GameNotFound(gameId);
        }
        return game;
    }

    function getGamePlayers(
        uint256 gameId
    ) external view returns (address[] memory) {
        if (!_games[gameId].exists) {
            revert GameNotFound(gameId);
        }
        return _gamePlayers[gameId];
    }

    function hasJoined(
        uint256 gameId,
        address player
    ) external view returns (bool) {
        if (!_games[gameId].exists) {
            revert GameNotFound(gameId);
        }
        return _hasJoined[gameId][player];
    }

    function getGameTrades(
        uint256 gameId
    ) external view returns (Trade[] memory) {
        if (!_games[gameId].exists) {
            revert GameNotFound(gameId);
        }
        return _games[gameId].trades;
    }

    function getGameTradeCount(uint256 gameId) external view returns (uint256) {
        if (!_games[gameId].exists) {
            revert GameNotFound(gameId);
        }
        return _games[gameId].trades.length;
    }

    function getTradeToSettle(
        uint256 tradeId
    ) external view returns (TradeToSettle memory) {
        TradeToSettle memory tradeToSettle = _tradesToSettle[tradeId];
        if (tradeToSettle.id == 0) {
            revert TradeToSettleNotFound(tradeId);
        }
        return tradeToSettle;
    }

    function getTradesToSettleCount() external view returns (uint256) {
        return nextTradeToSettleId - 1;
    }

    // =====================================================
    // ---------------- UTILS ----------------
    // =====================================================

    function _validateCreateParams(
        uint256 entryAmount,
        uint16 maxPlayers,
        uint256 startTime,
        uint256 endTime
    ) internal view {
        if (entryAmount == 0) {
            revert InvalidEntryAmount();
        }
        if (maxPlayers < MIN_PLAYERS || maxPlayers > MAX_PLAYERS) {
            revert InvalidMaxPlayers(maxPlayers, MIN_PLAYERS, MAX_PLAYERS);
        }
        if (startTime <= block.timestamp) {
            revert StartTimeMustBeFuture(startTime, block.timestamp);
        }
        if (endTime <= startTime) {
            revert InvalidTimeRange(startTime, endTime);
        }
    }

    function _joinGame(uint256 gameId, address player) internal {
        Game storage game = _games[gameId];
        if (!game.exists) {
            revert GameNotFound(gameId);
        }
        if (block.timestamp >= game.startTime) {
            revert GameAlreadyStarted(gameId, game.startTime, block.timestamp);
        }
        if (_hasJoined[gameId][player]) {
            revert AlreadyJoined(gameId, player);
        }
        if (game.playerCount >= game.maxPlayers) {
            revert GameFull(gameId, game.maxPlayers);
        }

        uint256 allowance = USDC.allowance(player, address(this));
        if (allowance < game.entryAmount) {
            revert InsufficientAllowance(player, allowance, game.entryAmount);
        }

        bool success = USDC.transferFrom(
            player,
            address(this),
            game.entryAmount
        );
        if (!success) {
            revert TransferFailed(player, game.entryAmount);
        }

        _hasJoined[gameId][player] = true;
        _gamePlayers[gameId].push(player);
        game.playerCount += 1;

        emit GameJoined(gameId, player, game.playerCount);
    }

    // =====================================================
    // -------- CHAINLINK RECEIVER OVERRIDE --------
    // =====================================================

    function _processReport(bytes calldata report) internal override {
        (uint256 tradeId, uint256 executionPrice) = abi.decode(
            report,
            (uint256, uint256)
        );

        TradeToSettle memory tradeToSettle = _tradesToSettle[tradeId];
        if (tradeToSettle.id == 0) {
            revert TradeToSettleNotFound(tradeId);
        }

        delete _tradesToSettle[tradeId];

        emit TradeSettled(
            tradeId,
            tradeToSettle.trader,
            tradeToSettle.asset_address,
            tradeToSettle.origin,
            tradeToSettle.amountIn,
            executionPrice
        );
    }
}
