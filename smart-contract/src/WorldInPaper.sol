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
        uint256 gameId;
        address trader;
        string asset_address;
        Origin origin;
        uint256 amountIn;
        bool isBuy;
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
        uint256 startingWIPBalance;
        uint256 startTime;
        uint256 endTime;
        uint16 maxPlayers;
        uint16 playerCount;
        address creator;
        bool exists;
        address[] players;
        mapping(address player => bool joined) hasJoined;
        mapping(address player => bool claimed) hasClaimed;
        mapping(address player => uint256 balance) wipBalances;
        mapping(address player => mapping(string asset => uint256 balance)) tokenBalances;
        Trade[] trades;
    }

    // Read model for getGame(), since Game includes mappings and cannot be returned.
    struct GameView {
        uint256 id;
        uint256 entryAmount;
        uint256 startingWIPBalance;
        uint256 startTime;
        uint256 endTime;
        uint16 maxPlayers;
        uint16 playerCount;
        address creator;
        bool exists;
    }

    struct PortfolioTokenView {
        string asset_address;
        Origin origin;
        uint256 balance;
        Trade[] trades;
    }

    struct PlayerPortfolioView {
        uint256 gameId;
        address player;
        uint256 wipBalance;
        bool claimed;
        uint256 claimableAmount;
        PortfolioTokenView[] tokens;
    }

    struct GameRankingEntryView {
        address player;
        uint256 place;
        uint256 wipBalance;
    }

    // =====================================================
    // -------------- CONSTANTS/STORAGE --------------
    // =====================================================

    uint16 public constant MIN_PLAYERS = 2;
    uint16 public constant MAX_PLAYERS = 100;
    uint256 public constant EXECUTION_PRICE_PRECISION = 1e18;
    uint256 public constant MIN_STARTING_WIP_BALANCE = 100 * 1e6;
    uint256 public constant MAX_STARTING_WIP_BALANCE = 1_000_000 * 1e6;

    IERC20 public immutable USDC;
    IWorldIDVerifier public immutable verifier;
    bool public immutable worldIdVerificationEnabled;
    uint256 public nextGameId = 1;
    uint256 public nextTradeToSettleId = 1;
    mapping(uint256 => bool) public nullifierUsed;

    mapping(uint256 gameId => Game game) private _games;
    mapping(uint256 tradeId => TradeToSettle tradeToSettle)
        private _tradesToSettle;

    // =====================================================
    // ---------------- ERRORS ----------------
    // =====================================================

    error InvalidUSDCAddress();
    error InvalidVerifierAddress();
    error InvalidNullifier();
    error InvalidExecutionPrice();
    error TradeToSettleNotFound(uint256 tradeId);
    error InvalidEntryAmount();
    error InvalidStartingWIPBalance(
        uint256 provided,
        uint256 minAllowed,
        uint256 maxAllowed
    );
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
    error GameNotEnded(
        uint256 gameId,
        uint256 endTime,
        uint256 currentTimestamp
    );
    error EmptyAssetAddress();
    error InvalidAmountIn();
    error InvalidTradeAmounts(uint256 amountIn, uint256 amountOut);
    error InsufficientAllowance(
        address player,
        uint256 allowance,
        uint256 required
    );
    error TransferFailed(address from, uint256 amount);
    error InsufficientWIPBalance(
        uint256 gameId,
        address player,
        uint256 balance,
        uint256 required
    );
    error InsufficientTokenBalance(
        uint256 gameId,
        address player,
        uint256 balance,
        uint256 required
    );
    error AlreadyClaimed(uint256 gameId, address player);

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
        uint256 indexed gameId,
        string asset_address,
        Origin origin,
        bool isBuy,
        uint256 amount
    );
    event TradeSettled(
        uint256 indexed tradeId,
        address indexed trader,
        string asset_address,
        Origin origin,
        uint256 amountIn,
        bool isBuy,
        uint256 executionPrice
    );
    event GameClaimed(
        uint256 indexed gameId,
        address indexed player,
        uint256 payout,
        uint256 rank
    );

    // =====================================================
    // -------------- CONSTRUCTOR --------------
    // =====================================================

    constructor(
        address _forwarderAddress,
        address _usdcAddress,
        IWorldIDVerifier _verifier,
        bool _worldIdVerificationEnabled
    ) ReceiverTemplate(_forwarderAddress) {
        if (_usdcAddress == address(0)) {
            revert InvalidUSDCAddress();
        }
        if (_worldIdVerificationEnabled && address(_verifier) == address(0)) {
            revert InvalidVerifierAddress();
        }
        USDC = IERC20(_usdcAddress);
        verifier = _verifier;
        worldIdVerificationEnabled = _worldIdVerificationEnabled;
    }

    // =====================================================
    // ----------- EXTERNAL WRITE FUNCTIONS -----------
    // =====================================================

    function createGame(
        uint256 entryAmount,
        uint256 startingWIPBalance,
        uint16 maxPlayers,
        uint256 startTime,
        uint256 endTime
    ) external returns (uint256 gameId) {
        address creator = _msgSender();

        _validateCreateParams(
            entryAmount,
            startingWIPBalance,
            maxPlayers,
            startTime,
            endTime
        );

        gameId = nextGameId;
        unchecked {
            nextGameId = gameId + 1;
        }

        Game storage game = _games[gameId];
        game.id = gameId;
        game.entryAmount = entryAmount;
        game.startingWIPBalance = startingWIPBalance;
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
        WorldIdVerification calldata worldId
    ) external returns (uint256 tradeId) {
        Game storage game = _games[gameId];
        address trader = _msgSender();

        if (!game.exists) {
            revert GameNotFound(gameId);
        }
        if (!game.hasJoined[trader]) {
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
        if (amountIn == 0) {
            revert InvalidAmountIn();
        }

        if (isBuy) {
            uint256 currentBalance = game.wipBalances[trader];
            if (currentBalance < amountIn) {
                revert InsufficientWIPBalance(
                    gameId,
                    trader,
                    currentBalance,
                    amountIn
                );
            }

            unchecked {
                game.wipBalances[trader] = currentBalance - amountIn;
            }
        } else {
            uint256 currentTokenBalance = game.tokenBalances[trader][
                asset_address
            ];
            if (currentTokenBalance < amountIn) {
                revert InsufficientTokenBalance(
                    gameId,
                    trader,
                    currentTokenBalance,
                    amountIn
                );
            }

            unchecked {
                game.tokenBalances[trader][asset_address] =
                    currentTokenBalance -
                    amountIn;
            }
        }

        _verifyAndConsumeWorldId(worldId);

        tradeId = nextTradeToSettleId;
        unchecked {
            nextTradeToSettleId = tradeId + 1;
        }

        _tradesToSettle[tradeId] = TradeToSettle({
            id: tradeId,
            gameId: gameId,
            trader: trader,
            asset_address: asset_address,
            origin: origin,
            amountIn: amountIn,
            isBuy: isBuy
        });

        emit SettlementRequest(
            tradeId,
            gameId,
            asset_address,
            origin,
            isBuy,
            amountIn
        );
    }

    function claimGame(uint256 gameId) external returns (uint256 payout) {
        Game storage game = _games[gameId];
        address player = _msgSender();

        if (!game.exists) {
            revert GameNotFound(gameId);
        }
        if (!game.hasJoined[player]) {
            revert NotGamePlayer(gameId, player);
        }
        if (block.timestamp < game.endTime) {
            revert GameNotEnded(gameId, game.endTime, block.timestamp);
        }
        if (game.hasClaimed[player]) {
            revert AlreadyClaimed(gameId, player);
        }

        uint256 rank;
        (payout, rank) = _computeClaimPayout(game, player);

        game.hasClaimed[player] = true;

        if (payout > 0) {
            bool success = USDC.transfer(player, payout);
            if (!success) {
                revert TransferFailed(address(this), payout);
            }
        }

        emit GameClaimed(gameId, player, payout, rank);
    }

    // =====================================================
    // ---------------- GETTERS ----------------
    // =====================================================

    function getGame(uint256 gameId) external view returns (GameView memory) {
        Game storage game = _games[gameId];
        if (!game.exists) {
            revert GameNotFound(gameId);
        }
        return _toGameView(game);
    }

    function getRecentGames(
        uint256 limit
    ) external view returns (GameView[] memory games) {
        return _collectGamesByMode(address(0), limit, 0);
    }

    function getCreatedGames(
        address creator,
        uint256 limit
    ) external view returns (GameView[] memory games) {
        return _collectGamesByMode(creator, limit, 1);
    }

    function getJoinedGames(
        address player,
        uint256 limit
    ) external view returns (GameView[] memory games) {
        return _collectGamesByMode(player, limit, 2);
    }

    function getGamePlayers(
        uint256 gameId
    ) external view returns (address[] memory) {
        if (!_games[gameId].exists) {
            revert GameNotFound(gameId);
        }
        return _games[gameId].players;
    }

    function hasJoined(
        uint256 gameId,
        address player
    ) external view returns (bool) {
        if (!_games[gameId].exists) {
            revert GameNotFound(gameId);
        }
        return _games[gameId].hasJoined[player];
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

    function getTotalSettlementRequestsCreated()
        external
        view
        returns (uint256)
    {
        return nextTradeToSettleId - 1;
    }

    function getPlayerPortfolio(
        uint256 gameId,
        address player
    ) external view returns (PlayerPortfolioView memory portfolio) {
        Game storage game = _games[gameId];
        if (!game.exists) {
            revert GameNotFound(gameId);
        }
        if (!game.hasJoined[player]) {
            revert NotGamePlayer(gameId, player);
        }

        portfolio.gameId = gameId;
        portfolio.player = player;
        portfolio.wipBalance = game.wipBalances[player];
        portfolio.claimed = game.hasClaimed[player];
        portfolio.claimableAmount = _getClaimableAmount(game, player);
        portfolio.tokens = _getPortfolioTokens(game, player);
    }

    function getGameRanking(
        uint256 gameId
    ) external view returns (GameRankingEntryView[] memory ranking) {
        Game storage game = _games[gameId];
        if (!game.exists) {
            revert GameNotFound(gameId);
        }

        address[] memory sortedPlayers = _getSortedPlayers(game);
        uint256 playersLength = sortedPlayers.length;
        ranking = new GameRankingEntryView[](playersLength);

        for (uint256 i = 0; i < playersLength; ) {
            address player = sortedPlayers[i];
            ranking[i] = GameRankingEntryView({
                player: player,
                place: i + 1,
                wipBalance: game.wipBalances[player]
            });

            unchecked {
                ++i;
            }
        }
    }

    // =====================================================
    // ---------------- UTILS ----------------
    // =====================================================

    function _validateCreateParams(
        uint256 entryAmount,
        uint256 startingWIPBalance,
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
        if (
            startingWIPBalance < MIN_STARTING_WIP_BALANCE ||
            startingWIPBalance > MAX_STARTING_WIP_BALANCE
        ) {
            revert InvalidStartingWIPBalance(
                startingWIPBalance,
                MIN_STARTING_WIP_BALANCE,
                MAX_STARTING_WIP_BALANCE
            );
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
        if (game.hasJoined[player]) {
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

        game.hasJoined[player] = true;
        game.players.push(player);
        game.playerCount += 1;
        game.wipBalances[player] = game.startingWIPBalance;

        emit GameJoined(gameId, player, game.playerCount);
    }

    function _verifyAndConsumeWorldId(
        WorldIdVerification calldata worldId
    ) internal {
        if (!worldIdVerificationEnabled) {
            return;
        }

        if (nullifierUsed[worldId.nullifier]) {
            revert InvalidNullifier();
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
    }

    function _getClaimableAmount(
        Game storage game,
        address player
    ) internal view returns (uint256 payout) {
        if (block.timestamp < game.endTime || game.hasClaimed[player]) {
            return 0;
        }

        (payout, ) = _computeClaimPayout(game, player);
    }

    function _getPortfolioTokens(
        Game storage game,
        address player
    ) internal view returns (PortfolioTokenView[] memory tokens) {
        uint256 tradesLength = game.trades.length;
        bytes32[] memory assetKeys = new bytes32[](tradesLength);
        string[] memory assetAddresses = new string[](tradesLength);
        Origin[] memory origins = new Origin[](tradesLength);
        uint256[] memory balances = new uint256[](tradesLength);
        uint256[] memory tradeCounts = new uint256[](tradesLength);
        uint256[] memory tradeAssetIndexes = new uint256[](tradesLength);
        uint256 uniqueAssetsLength;

        for (uint256 i = 0; i < tradesLength; ) {
            Trade storage trade = game.trades[i];
            if (trade.trader == player) {
                bytes32 assetHash = keccak256(
                    abi.encodePacked(trade.asset_address, trade.origin)
                );
                (bool found, uint256 assetIndex) = _findAssetIndex(
                    assetKeys,
                    uniqueAssetsLength,
                    assetHash
                );

                if (!found) {
                    assetKeys[uniqueAssetsLength] = assetHash;
                    assetAddresses[uniqueAssetsLength] = trade.asset_address;
                    origins[uniqueAssetsLength] = trade.origin;
                    assetIndex = uniqueAssetsLength;
                    unchecked {
                        ++uniqueAssetsLength;
                    }
                }

                tradeAssetIndexes[i] = assetIndex + 1;
                if (trade.isBuy) {
                    balances[assetIndex] += trade.amountOut;
                } else if (balances[assetIndex] >= trade.amountIn) {
                    unchecked {
                        balances[assetIndex] -= trade.amountIn;
                    }
                } else {
                    balances[assetIndex] = 0;
                }

                unchecked {
                    ++tradeCounts[assetIndex];
                }
            }

            unchecked {
                ++i;
            }
        }

        tokens = new PortfolioTokenView[](uniqueAssetsLength);
        for (uint256 i = 0; i < uniqueAssetsLength; ) {
            tokens[i].asset_address = assetAddresses[i];
            tokens[i].origin = origins[i];
            tokens[i].balance = balances[i];
            tokens[i].trades = new Trade[](tradeCounts[i]);

            unchecked {
                ++i;
            }
        }

        uint256[] memory fillIndexes = new uint256[](uniqueAssetsLength);
        for (uint256 i = 0; i < tradesLength; ) {
            uint256 assetIndexPlusOne = tradeAssetIndexes[i];
            if (assetIndexPlusOne != 0) {
                uint256 assetIndex = assetIndexPlusOne - 1;
                uint256 fillIndex = fillIndexes[assetIndex];
                tokens[assetIndex].trades[fillIndex] = game.trades[i];

                unchecked {
                    fillIndexes[assetIndex] = fillIndex + 1;
                }
            }

            unchecked {
                ++i;
            }
        }
    }

    function _findAssetIndex(
        bytes32[] memory assetKeys,
        uint256 length,
        bytes32 assetKey
    ) internal pure returns (bool found, uint256 index) {
        for (uint256 i = 0; i < length; ) {
            if (assetKeys[i] == assetKey) {
                return (true, i);
            }

            unchecked {
                ++i;
            }
        }
    }

    function _toGameView(
        Game storage game
    ) internal view returns (GameView memory gameView) {
        gameView = GameView({
            id: game.id,
            entryAmount: game.entryAmount,
            startingWIPBalance: game.startingWIPBalance,
            startTime: game.startTime,
            endTime: game.endTime,
            maxPlayers: game.maxPlayers,
            playerCount: game.playerCount,
            creator: game.creator,
            exists: game.exists
        });
    }

    // mode: 0=recent, 1=created, 2=joined
    function _collectGamesByMode(
        address user,
        uint256 limit,
        uint8 mode
    ) internal view returns (GameView[] memory games) {
        if (limit == 0) {
            return new GameView[](0);
        }

        uint256 maxGameId;
        unchecked {
            maxGameId = nextGameId - 1;
        }

        if (maxGameId == 0) {
            return new GameView[](0);
        }

        if (limit > maxGameId) {
            limit = maxGameId;
        }

        GameView[] memory temp = new GameView[](limit);
        uint256 count;

        for (uint256 gameId = maxGameId; gameId >= 1 && count < limit; ) {
            Game storage game = _games[gameId];

            bool include;
            if (mode == 0) {
                include = game.exists;
            } else if (mode == 1) {
                include = game.exists && game.creator == user;
            } else {
                include = game.exists && game.hasJoined[user];
            }

            if (include) {
                temp[count] = _toGameView(game);
                unchecked {
                    ++count;
                }
            }

            if (gameId == 1) {
                break;
            }

            unchecked {
                --gameId;
            }
        }

        games = new GameView[](count);
        for (uint256 i = 0; i < count; ) {
            games[i] = temp[i];
            unchecked {
                ++i;
            }
        }
    }

    function _getSortedPlayers(
        Game storage game
    ) internal view returns (address[] memory sortedPlayers) {
        uint256 playersLength = game.players.length;
        sortedPlayers = new address[](playersLength);

        for (uint256 i = 0; i < playersLength; ) {
            sortedPlayers[i] = game.players[i];

            unchecked {
                ++i;
            }
        }

        for (uint256 i = 0; i < playersLength; ) {
            uint256 bestIdx = i;
            for (uint256 j = i + 1; j < playersLength; ) {
                if (
                    _isHigherRank(
                        game,
                        sortedPlayers[j],
                        sortedPlayers[bestIdx]
                    )
                ) {
                    bestIdx = j;
                }

                unchecked {
                    ++j;
                }
            }

            if (bestIdx != i) {
                address tmp = sortedPlayers[i];
                sortedPlayers[i] = sortedPlayers[bestIdx];
                sortedPlayers[bestIdx] = tmp;
            }

            unchecked {
                ++i;
            }
        }
    }

    function _getPlayerRank(
        Game storage game,
        address player
    ) internal view returns (uint256 rank) {
        address[] memory sortedPlayers = _getSortedPlayers(game);
        uint256 playersLength = sortedPlayers.length;

        for (uint256 i = 0; i < playersLength; ) {
            if (sortedPlayers[i] == player) {
                return i;
            }
            unchecked {
                ++i;
            }
        }

        revert NotGamePlayer(game.id, player);
    }

    function _computeClaimPayout(
        Game storage game,
        address player
    ) internal view returns (uint256 payout, uint256 rank) {
        rank = _getPlayerRank(game, player);
        uint256 winnerCount = game.playerCount / 2;

        if (rank < winnerCount) {
            return (game.entryAmount * 2, rank);
        }

        if (game.playerCount % 2 == 1 && rank == winnerCount) {
            return (game.entryAmount, rank);
        }

        return (0, rank);
    }

    function _isHigherRank(
        Game storage game,
        address candidate,
        address current
    ) internal view returns (bool) {
        uint256 candidateWip = game.wipBalances[candidate];
        uint256 currentWip = game.wipBalances[current];

        if (candidateWip > currentWip) {
            return true;
        }
        if (candidateWip < currentWip) {
            return false;
        }

        // Deterministic tie-breaker so ranking is stable.
        return candidate < current;
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
        if (executionPrice == 0) {
            revert InvalidExecutionPrice();
        }

        uint256 amountOut;
        if (tradeToSettle.isBuy) {
            amountOut =
                (tradeToSettle.amountIn * EXECUTION_PRICE_PRECISION) /
                executionPrice;
        } else {
            amountOut =
                (tradeToSettle.amountIn * executionPrice) /
                EXECUTION_PRICE_PRECISION;
        }

        if (amountOut == 0) {
            revert InvalidTradeAmounts(tradeToSettle.amountIn, amountOut);
        }

        Game storage game = _games[tradeToSettle.gameId];
        if (!game.exists) {
            revert GameNotFound(tradeToSettle.gameId);
        }

        if (tradeToSettle.isBuy) {
            game.tokenBalances[tradeToSettle.trader][
                tradeToSettle.asset_address
            ] += amountOut;
        } else {
            game.wipBalances[tradeToSettle.trader] += amountOut;
        }

        game.trades.push(
            Trade({
                id: tradeToSettle.id,
                trader: tradeToSettle.trader,
                asset_address: tradeToSettle.asset_address,
                origin: tradeToSettle.origin,
                isBuy: tradeToSettle.isBuy,
                amountIn: tradeToSettle.amountIn,
                amountOut: amountOut
            })
        );

        emit TradeRecorded(
            tradeToSettle.gameId,
            tradeToSettle.id,
            tradeToSettle.trader,
            tradeToSettle.asset_address,
            tradeToSettle.origin,
            tradeToSettle.isBuy,
            tradeToSettle.amountIn,
            amountOut
        );

        delete _tradesToSettle[tradeId];

        emit TradeSettled(
            tradeId,
            tradeToSettle.trader,
            tradeToSettle.asset_address,
            tradeToSettle.origin,
            tradeToSettle.amountIn,
            tradeToSettle.isBuy,
            executionPrice
        );
    }
}
