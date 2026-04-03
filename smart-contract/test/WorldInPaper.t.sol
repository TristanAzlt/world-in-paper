// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {WorldInPaper} from "../src/WorldInPaper.sol";
import {IWorldIDVerifier} from "../src/interfaces/IWorldIDVerifier.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("MockUSDC", "mUSDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract MockWorldIDVerifier is IWorldIDVerifier {
    bool public shouldRevert;

    function setShouldRevert(bool value) external {
        shouldRevert = value;
    }

    function verify(
        uint256,
        uint256,
        uint64,
        uint256,
        uint256,
        uint64,
        uint64,
        uint256,
        uint256[5] calldata
    ) external view override {
        if (shouldRevert) {
            revert("INVALID_PROOF");
        }
    }
}

contract WorldInPaperTest is Test {
    uint256 private constant ENTRY_AMOUNT = 10 * 10 ** 6;
    uint256 private constant STARTING_WIP_BALANCE = 5_000 * 10 ** 6;
    address private constant FORWARDER = address(0xF0);
    address private constant CREATOR = address(0xC0);
    address private constant PLAYER_1 = address(0xC1);
    address private constant PLAYER_2 = address(0xC2);
    address private constant PLAYER_3 = address(0xC3);

    MockUSDC internal usdc;
    MockWorldIDVerifier internal verifier;
    WorldInPaper internal worldInPaper;
    uint256 internal nextNullifier;

    event TradeSettled(
        uint256 indexed tradeId,
        address indexed trader,
        string asset_address,
        WorldInPaper.Origin origin,
        uint256 amountIn,
        uint256 executionPrice
    );

    function setUp() public {
        usdc = new MockUSDC();
        verifier = new MockWorldIDVerifier();
        worldInPaper = new WorldInPaper(
            FORWARDER,
            address(usdc),
            verifier,
            true
        );
        nextNullifier = 1;

        usdc.mint(CREATOR, 1_000 * 10 ** 6);
        usdc.mint(PLAYER_1, 1_000 * 10 ** 6);
        usdc.mint(PLAYER_2, 1_000 * 10 ** 6);
        usdc.mint(PLAYER_3, 1_000 * 10 ** 6);
    }

    function test_CreateGameAutoJoinsCreatorAndTransfersUSDC() public {
        uint256 startTime = block.timestamp + 1 hours;
        uint256 endTime = startTime + 1 days;

        vm.startPrank(CREATOR);
        usdc.approve(address(worldInPaper), ENTRY_AMOUNT);
        uint256 gameId = worldInPaper.createGame(
            ENTRY_AMOUNT,
            STARTING_WIP_BALANCE,
            3,
            startTime,
            endTime
        );
        vm.stopPrank();

        assertEq(gameId, 1);

        WorldInPaper.GameView memory game = worldInPaper.getGame(gameId);
        assertEq(game.id, 1);
        assertEq(game.entryAmount, ENTRY_AMOUNT);
        assertEq(game.startingWIPBalance, STARTING_WIP_BALANCE);
        assertEq(game.maxPlayers, 3);
        assertEq(game.startTime, startTime);
        assertEq(game.endTime, endTime);
        assertEq(game.playerCount, 1);
        assertEq(game.creator, CREATOR);

        address[] memory players = worldInPaper.getGamePlayers(gameId);
        assertEq(players.length, 1);
        assertEq(players[0], CREATOR);

        assertTrue(worldInPaper.hasJoined(gameId, CREATOR));
        assertEq(usdc.balanceOf(address(worldInPaper)), ENTRY_AMOUNT);
        assertEq(
            worldInPaper.getPlayerPortfolio(gameId, CREATOR).wipBalance,
            STARTING_WIP_BALANCE
        );
    }

    function test_JoinGameTransfersUSDCAndIncrementsPlayerCount() public {
        uint256 gameId = _createGameAsCreator(3);

        vm.startPrank(PLAYER_1);
        usdc.approve(address(worldInPaper), ENTRY_AMOUNT);
        worldInPaper.joinGame(gameId);
        vm.stopPrank();

        WorldInPaper.GameView memory game = worldInPaper.getGame(gameId);
        assertEq(game.playerCount, 2);
        assertTrue(worldInPaper.hasJoined(gameId, PLAYER_1));
        assertEq(usdc.balanceOf(address(worldInPaper)), ENTRY_AMOUNT * 2);
        assertEq(
            worldInPaper.getPlayerPortfolio(gameId, PLAYER_1).wipBalance,
            STARTING_WIP_BALANCE
        );
    }

    function test_GetPlayerPortfolioReturnsTokensAndTrades() public {
        uint256 gameId = _createStartedGameWithPlayer(PLAYER_1);

        vm.prank(PLAYER_1);
        uint256 buyTradeId = worldInPaper.submitTrade(
            gameId,
            "ETHUSD",
            WorldInPaper.Origin.Base,
            true,
            200 * 10 ** 6,
            _nextWorldId()
        );

        vm.prank(FORWARDER);
        worldInPaper.onReport("", abi.encode(buyTradeId, 1000 * 10 ** 18));

        vm.prank(PLAYER_1);
        uint256 sellTradeId = worldInPaper.submitTrade(
            gameId,
            "ETHUSD",
            WorldInPaper.Origin.Base,
            false,
            200_000,
            _nextWorldId()
        );

        vm.prank(FORWARDER);
        worldInPaper.onReport("", abi.encode(sellTradeId, 1200 * 10 ** 18));

        vm.prank(PLAYER_1);
        uint256 btcTradeId = worldInPaper.submitTrade(
            gameId,
            "BTCUSD",
            WorldInPaper.Origin.Hyperliquid,
            true,
            100 * 10 ** 6,
            _nextWorldId()
        );

        vm.prank(FORWARDER);
        worldInPaper.onReport("", abi.encode(btcTradeId, 2000 * 10 ** 18));

        WorldInPaper.PlayerPortfolioView memory portfolio = worldInPaper
            .getPlayerPortfolio(gameId, PLAYER_1);

        assertEq(portfolio.gameId, gameId);
        assertEq(portfolio.player, PLAYER_1);
        assertEq(portfolio.wipBalance, 4_940_000_000);
        assertFalse(portfolio.claimed);
        assertEq(portfolio.claimableAmount, 0);
        assertEq(portfolio.tokens.length, 2);

        WorldInPaper.PortfolioTokenView memory ethToken = _getPortfolioToken(
            portfolio,
            "ETHUSD"
        );
        assertEq(ethToken.asset_address, "ETHUSD");
        assertEq(uint8(ethToken.origin), uint8(WorldInPaper.Origin.Base));
        assertEq(ethToken.balance, 0);
        assertEq(ethToken.trades.length, 2);
        assertEq(
            uint8(ethToken.trades[0].origin),
            uint8(WorldInPaper.Origin.Base)
        );
        assertEq(ethToken.trades[0].id, buyTradeId);
        assertEq(ethToken.trades[1].id, sellTradeId);
        assertEq(
            uint8(ethToken.trades[1].origin),
            uint8(WorldInPaper.Origin.Base)
        );

        WorldInPaper.PortfolioTokenView memory btcToken = _getPortfolioToken(
            portfolio,
            "BTCUSD"
        );
        assertEq(btcToken.asset_address, "BTCUSD");
        assertEq(
            uint8(btcToken.origin),
            uint8(WorldInPaper.Origin.Hyperliquid)
        );
        assertEq(btcToken.balance, 50_000);
        assertEq(btcToken.trades.length, 1);
        assertEq(btcToken.trades[0].id, btcTradeId);
        assertEq(
            uint8(btcToken.trades[0].origin),
            uint8(WorldInPaper.Origin.Hyperliquid)
        );
    }

    function test_GetGameRankingReturnsPlayersSortedByWip() public {
        uint256 gameId = _createGameAsCreator(3);

        vm.startPrank(PLAYER_1);
        usdc.approve(address(worldInPaper), ENTRY_AMOUNT);
        worldInPaper.joinGame(gameId);
        vm.stopPrank();

        vm.startPrank(PLAYER_2);
        usdc.approve(address(worldInPaper), ENTRY_AMOUNT);
        worldInPaper.joinGame(gameId);
        vm.stopPrank();

        vm.warp(worldInPaper.getGame(gameId).startTime + 1);

        vm.prank(PLAYER_1);
        worldInPaper.submitTrade(
            gameId,
            "ETHUSD",
            WorldInPaper.Origin.Base,
            true,
            100 * 10 ** 6,
            _nextWorldId()
        );

        vm.prank(PLAYER_2);
        worldInPaper.submitTrade(
            gameId,
            "BTCUSD",
            WorldInPaper.Origin.Base,
            true,
            300 * 10 ** 6,
            _nextWorldId()
        );

        WorldInPaper.GameRankingEntryView[] memory ranking = worldInPaper
            .getGameRanking(gameId);

        assertEq(ranking.length, 3);
        assertEq(ranking[0].player, CREATOR);
        assertEq(ranking[0].place, 1);
        assertEq(ranking[0].wipBalance, 5_000_000_000);
        assertEq(ranking[1].player, PLAYER_1);
        assertEq(ranking[1].place, 2);
        assertEq(ranking[1].wipBalance, 4_900_000_000);
        assertEq(ranking[2].player, PLAYER_2);
        assertEq(ranking[2].place, 3);
        assertEq(ranking[2].wipBalance, 4_700_000_000);
    }

    function test_RevertWhen_JoinWithoutEnoughAllowance() public {
        uint256 gameId = _createGameAsCreator(3);

        vm.prank(PLAYER_1);
        vm.expectRevert(
            abi.encodeWithSelector(
                WorldInPaper.InsufficientAllowance.selector,
                PLAYER_1,
                0,
                ENTRY_AMOUNT
            )
        );
        worldInPaper.joinGame(gameId);
    }

    function test_RevertWhen_CreateGameWithInvalidMaxPlayers() public {
        uint256 startTime = block.timestamp + 1 hours;
        uint256 endTime = startTime + 1 days;

        vm.startPrank(CREATOR);
        usdc.approve(address(worldInPaper), ENTRY_AMOUNT);

        vm.expectRevert(
            abi.encodeWithSelector(
                WorldInPaper.InvalidMaxPlayers.selector,
                1,
                2,
                100
            )
        );
        worldInPaper.createGame(
            ENTRY_AMOUNT,
            STARTING_WIP_BALANCE,
            1,
            startTime,
            endTime
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                WorldInPaper.InvalidMaxPlayers.selector,
                101,
                2,
                100
            )
        );
        worldInPaper.createGame(
            ENTRY_AMOUNT,
            STARTING_WIP_BALANCE,
            101,
            startTime,
            endTime
        );
        vm.stopPrank();
    }

    function test_RevertWhen_CreateGameWithInvalidStartingWIPBalance() public {
        uint256 startTime = block.timestamp + 1 hours;
        uint256 endTime = startTime + 1 days;

        vm.startPrank(CREATOR);
        usdc.approve(address(worldInPaper), ENTRY_AMOUNT);

        vm.expectRevert(
            abi.encodeWithSelector(
                WorldInPaper.InvalidStartingWIPBalance.selector,
                99 * 10 ** 6,
                100 * 10 ** 6,
                1_000_000 * 10 ** 6
            )
        );
        worldInPaper.createGame(
            ENTRY_AMOUNT,
            99 * 10 ** 6,
            3,
            startTime,
            endTime
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                WorldInPaper.InvalidStartingWIPBalance.selector,
                1_000_001 * 10 ** 6,
                100 * 10 ** 6,
                1_000_000 * 10 ** 6
            )
        );
        worldInPaper.createGame(
            ENTRY_AMOUNT,
            1_000_001 * 10 ** 6,
            3,
            startTime,
            endTime
        );

        vm.stopPrank();
    }

    function test_RevertWhen_JoinAfterStartTime() public {
        uint256 gameId = _createGameAsCreator(3);

        uint256 startTime = worldInPaper.getGame(gameId).startTime;
        vm.warp(startTime);

        vm.startPrank(PLAYER_1);
        usdc.approve(address(worldInPaper), ENTRY_AMOUNT);
        vm.expectRevert(
            abi.encodeWithSelector(
                WorldInPaper.GameAlreadyStarted.selector,
                gameId,
                startTime,
                startTime
            )
        );
        worldInPaper.joinGame(gameId);
        vm.stopPrank();
    }

    function test_RevertWhen_GameIsFull() public {
        uint256 gameId = _createGameAsCreator(2);

        vm.startPrank(PLAYER_1);
        usdc.approve(address(worldInPaper), ENTRY_AMOUNT);
        worldInPaper.joinGame(gameId);
        vm.stopPrank();

        vm.startPrank(PLAYER_2);
        usdc.approve(address(worldInPaper), ENTRY_AMOUNT);
        vm.expectRevert(
            abi.encodeWithSelector(WorldInPaper.GameFull.selector, gameId, 2)
        );
        worldInPaper.joinGame(gameId);
        vm.stopPrank();
    }

    function test_RevertWhen_PlayerAlreadyJoined() public {
        uint256 gameId = _createGameAsCreator(3);

        vm.startPrank(PLAYER_1);
        usdc.approve(address(worldInPaper), ENTRY_AMOUNT * 2);
        worldInPaper.joinGame(gameId);

        vm.expectRevert(
            abi.encodeWithSelector(
                WorldInPaper.AlreadyJoined.selector,
                gameId,
                PLAYER_1
            )
        );
        worldInPaper.joinGame(gameId);
        vm.stopPrank();
    }

    function test_RevertWhen_GameNotFound() public {
        vm.expectRevert(
            abi.encodeWithSelector(WorldInPaper.GameNotFound.selector, 999)
        );
        worldInPaper.joinGame(999);
    }

    function test_SubmitTradeGameByJoinedPlayer() public {
        uint256 gameId = _createGameAsCreator(3);

        vm.startPrank(PLAYER_1);
        usdc.approve(address(worldInPaper), ENTRY_AMOUNT);
        worldInPaper.joinGame(gameId);
        vm.stopPrank();

        uint256 startTime = worldInPaper.getGame(gameId).startTime;
        vm.warp(startTime + 1);

        vm.prank(PLAYER_1);
        uint256 tradeId1 = worldInPaper.submitTrade(
            gameId,
            "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            WorldInPaper.Origin.Base,
            true,
            100 * 10 ** 6,
            _nextWorldId()
        );

        vm.prank(CREATOR);
        uint256 tradeId2 = worldInPaper.submitTrade(
            gameId,
            "BTCUSD",
            WorldInPaper.Origin.Ethereum,
            true,
            50 * 10 ** 6,
            _nextWorldId()
        );

        assertEq(tradeId1, 1);
        assertEq(tradeId2, 2);

        // Trade is only registered once Chainlink reports settlement.
        assertEq(worldInPaper.getGameTradeCount(gameId), 0);

        vm.prank(FORWARDER);
        worldInPaper.onReport("", abi.encode(tradeId1, 1500 * 10 ** 18));

        vm.prank(FORWARDER);
        worldInPaper.onReport("", abi.encode(tradeId2, 1600 * 10 ** 18));

        assertEq(worldInPaper.getGameTradeCount(gameId), 2);
        assertEq(
            worldInPaper.getPlayerPortfolio(gameId, PLAYER_1).wipBalance,
            4_900_000_000
        );
        assertEq(
            worldInPaper.getPlayerPortfolio(gameId, CREATOR).wipBalance,
            4_950_000_000
        );
        assertEq(
            _getPortfolioTokenBalance(
                gameId,
                PLAYER_1,
                "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
            ),
            66_666
        );

        WorldInPaper.Trade[] memory trades = worldInPaper.getGameTrades(gameId);
        assertEq(trades.length, 2);
        assertEq(trades[0].id, 1);
        assertEq(trades[0].trader, PLAYER_1);
        assertEq(
            trades[0].asset_address,
            "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
        );
        assertEq(uint8(trades[0].origin), uint8(WorldInPaper.Origin.Base));
        assertEq(trades[0].isBuy, true);
    }

    function test_SubmitTradeGameIdsAreGlobalAcrossGames() public {
        uint256 gameId1 = _createGameAsCreator(3);
        uint256 gameId2 = _createGameAsCreator(3);

        uint256 startTime1 = worldInPaper.getGame(gameId1).startTime;
        uint256 startTime2 = worldInPaper.getGame(gameId2).startTime;
        uint256 earliest = startTime1 < startTime2 ? startTime1 : startTime2;
        vm.warp(earliest + 1);

        vm.prank(CREATOR);
        uint256 tradeId1 = worldInPaper.submitTrade(
            gameId1,
            "ETHUSD",
            WorldInPaper.Origin.Ethereum,
            true,
            1,
            _nextWorldId()
        );

        vm.prank(CREATOR);
        uint256 tradeId2 = worldInPaper.submitTrade(
            gameId2,
            "BTCUSD",
            WorldInPaper.Origin.Base,
            true,
            1,
            _nextWorldId()
        );

        assertEq(tradeId1, 1);
        assertEq(tradeId2, 2);
        assertEq(worldInPaper.nextTradeToSettleId(), 3);
    }

    function test_RevertWhen_SubmitTradeGameFromNonPlayer() public {
        uint256 gameId = _createGameAsCreator(3);
        uint256 startTime = worldInPaper.getGame(gameId).startTime;
        vm.warp(startTime + 1);

        vm.prank(PLAYER_1);
        vm.expectRevert(
            abi.encodeWithSelector(
                WorldInPaper.NotGamePlayer.selector,
                gameId,
                PLAYER_1
            )
        );
        worldInPaper.submitTrade(
            gameId,
            "ETHUSD",
            WorldInPaper.Origin.Base,
            true,
            1,
            _nextWorldId()
        );
    }

    function test_RevertWhen_SubmitTradeGameBeforeStart() public {
        uint256 gameId = _createGameAsCreator(3);
        uint256 startTime = worldInPaper.getGame(gameId).startTime;

        vm.prank(CREATOR);
        vm.expectRevert(
            abi.encodeWithSelector(
                WorldInPaper.GameNotStarted.selector,
                gameId,
                startTime,
                block.timestamp
            )
        );
        worldInPaper.submitTrade(
            gameId,
            "ETHUSD",
            WorldInPaper.Origin.Base,
            true,
            1,
            _nextWorldId()
        );
    }

    function test_RevertWhen_SubmitTradeGameAfterEnd() public {
        uint256 gameId = _createGameAsCreator(3);
        uint256 endTime = worldInPaper.getGame(gameId).endTime;
        vm.warp(endTime);

        vm.prank(CREATOR);
        vm.expectRevert(
            abi.encodeWithSelector(
                WorldInPaper.GameEnded.selector,
                gameId,
                endTime,
                endTime
            )
        );
        worldInPaper.submitTrade(
            gameId,
            "ETHUSD",
            WorldInPaper.Origin.Base,
            true,
            1,
            _nextWorldId()
        );
    }

    function test_RevertWhen_SubmitTradeGameWithEmptyAssetAddress() public {
        uint256 gameId = _createGameAsCreator(3);
        vm.warp(worldInPaper.getGame(gameId).startTime + 1);

        vm.prank(CREATOR);
        vm.expectRevert(WorldInPaper.EmptyAssetAddress.selector);
        worldInPaper.submitTrade(
            gameId,
            "",
            WorldInPaper.Origin.Base,
            true,
            1,
            _nextWorldId()
        );
    }

    function test_RevertWhen_SubmitTradeGameWithInvalidAmountIn() public {
        uint256 gameId = _createGameAsCreator(3);
        vm.warp(worldInPaper.getGame(gameId).startTime + 1);

        vm.prank(CREATOR);
        vm.expectRevert(WorldInPaper.InvalidAmountIn.selector);
        worldInPaper.submitTrade(
            gameId,
            "ETHUSD",
            WorldInPaper.Origin.Base,
            true,
            0,
            _nextWorldId()
        );
    }

    function test_RevertWhen_SubmitTradeGameBuyWithInsufficientWIPBalance()
        public
    {
        uint256 gameId = _createStartedGameWithPlayer(PLAYER_1);

        vm.prank(PLAYER_1);
        vm.expectRevert(
            abi.encodeWithSelector(
                WorldInPaper.InsufficientWIPBalance.selector,
                gameId,
                PLAYER_1,
                STARTING_WIP_BALANCE,
                STARTING_WIP_BALANCE + 1
            )
        );
        worldInPaper.submitTrade(
            gameId,
            "ETHUSD",
            WorldInPaper.Origin.Base,
            true,
            STARTING_WIP_BALANCE + 1,
            _nextWorldId()
        );
    }

    function test_RevertWhen_SubmitTradeGameSellWithInsufficientTokenBalance()
        public
    {
        uint256 gameId = _createStartedGameWithPlayer(PLAYER_1);

        vm.prank(PLAYER_1);
        vm.expectRevert(
            abi.encodeWithSelector(
                WorldInPaper.InsufficientTokenBalance.selector,
                gameId,
                PLAYER_1,
                0,
                1
            )
        );
        worldInPaper.submitTrade(
            gameId,
            "ETHUSD",
            WorldInPaper.Origin.Base,
            false,
            1,
            _nextWorldId()
        );
    }

    function test_SubmitTradeSellDebitsTokenBalanceAndSettlementCreditsWip()
        public
    {
        uint256 gameId = _createStartedGameWithPlayer(PLAYER_1);

        vm.prank(PLAYER_1);
        uint256 buyTradeId = worldInPaper.submitTrade(
            gameId,
            "ETHUSD",
            WorldInPaper.Origin.Base,
            true,
            200 * 10 ** 6,
            _nextWorldId()
        );

        vm.prank(FORWARDER);
        worldInPaper.onReport("", abi.encode(buyTradeId, 1000 * 10 ** 18));

        assertEq(
            _getPortfolioTokenBalance(gameId, PLAYER_1, "ETHUSD"),
            200_000
        );

        vm.prank(PLAYER_1);
        uint256 sellTradeId = worldInPaper.submitTrade(
            gameId,
            "ETHUSD",
            WorldInPaper.Origin.Base,
            false,
            120_000,
            _nextWorldId()
        );

        vm.prank(FORWARDER);
        worldInPaper.onReport("", abi.encode(sellTradeId, 1200 * 10 ** 18));

        assertEq(
            worldInPaper.getPlayerPortfolio(gameId, PLAYER_1).wipBalance,
            4_944_000_000
        );
        assertEq(
            _getPortfolioTokenBalance(gameId, PLAYER_1, "ETHUSD"),
            80_000
        );
        assertEq(worldInPaper.getGameTradeCount(gameId), 2);
    }

    function test_RevertWhen_SubmitTradeSellExceedsAvailableAfterPendingSell()
        public
    {
        uint256 gameId = _createStartedGameWithPlayer(PLAYER_1);

        vm.prank(PLAYER_1);
        uint256 buyTradeId = worldInPaper.submitTrade(
            gameId,
            "ETHUSD",
            WorldInPaper.Origin.Base,
            true,
            200 * 10 ** 6,
            _nextWorldId()
        );

        vm.prank(FORWARDER);
        worldInPaper.onReport("", abi.encode(buyTradeId, 1000 * 10 ** 18));

        vm.prank(PLAYER_1);
        worldInPaper.submitTrade(
            gameId,
            "ETHUSD",
            WorldInPaper.Origin.Base,
            false,
            150_000,
            _nextWorldId()
        );

        vm.prank(PLAYER_1);
        vm.expectRevert(
            abi.encodeWithSelector(
                WorldInPaper.InsufficientTokenBalance.selector,
                gameId,
                PLAYER_1,
                50_000,
                60_000
            )
        );
        worldInPaper.submitTrade(
            gameId,
            "ETHUSD",
            WorldInPaper.Origin.Base,
            false,
            60_000,
            _nextWorldId()
        );
    }

    function test_SubmitTradeStoresGlobalTradeToSettle() public {
        uint256 gameId = _createGameAsCreator(3);

        WorldInPaper.WorldIdVerification memory worldId = WorldInPaper
            .WorldIdVerification({
                nullifier: 123,
                action: 1,
                rpId: 1,
                nonce: 1,
                signalHash: 1,
                expiresAtMin: 999_999,
                issuerSchemaId: 1,
                credentialGenesisIssuedAtMin: 1,
                zeroKnowledgeProof: [uint256(0), 0, 0, 0, 0]
            });

        vm.startPrank(PLAYER_1);
        usdc.approve(address(worldInPaper), ENTRY_AMOUNT);
        worldInPaper.joinGame(gameId);
        vm.stopPrank();

        vm.warp(worldInPaper.getGame(gameId).startTime + 1);

        vm.prank(PLAYER_1);
        uint256 tradeId = worldInPaper.submitTrade(
            gameId,
            "BTCUSD",
            WorldInPaper.Origin.Hyperliquid,
            true,
            150 * 10 ** 6,
            worldId
        );

        assertEq(tradeId, 1);
        assertEq(worldInPaper.getTotalSettlementRequestsCreated(), 1);
        assertEq(worldInPaper.nextTradeToSettleId(), 2);

        WorldInPaper.TradeToSettle memory tradeToSettle = worldInPaper
            .getTradeToSettle(tradeId);
        assertEq(tradeToSettle.id, 1);
        assertEq(tradeToSettle.gameId, gameId);
        assertEq(tradeToSettle.trader, PLAYER_1);
        assertEq(tradeToSettle.asset_address, "BTCUSD");
        assertEq(
            uint8(tradeToSettle.origin),
            uint8(WorldInPaper.Origin.Hyperliquid)
        );
        assertEq(tradeToSettle.amountIn, 150 * 10 ** 6);
        assertTrue(worldInPaper.nullifierUsed(123));
    }

    function test_RevertWhen_SubmitTradeWithUsedNullifier() public {
        uint256 gameId = _createStartedGameWithPlayer(PLAYER_1);

        WorldInPaper.WorldIdVerification memory worldId = WorldInPaper
            .WorldIdVerification({
                nullifier: 456,
                action: 1,
                rpId: 1,
                nonce: 1,
                signalHash: 1,
                expiresAtMin: 999_999,
                issuerSchemaId: 1,
                credentialGenesisIssuedAtMin: 1,
                zeroKnowledgeProof: [uint256(0), 0, 0, 0, 0]
            });

        vm.prank(PLAYER_1);
        worldInPaper.submitTrade(
            gameId,
            "ETHUSD",
            WorldInPaper.Origin.Ethereum,
            true,
            10,
            worldId
        );

        worldId.nullifier = 456;
        vm.prank(PLAYER_1);
        vm.expectRevert(WorldInPaper.InvalidNullifier.selector);
        worldInPaper.submitTrade(
            gameId,
            "SOLUSD",
            WorldInPaper.Origin.Solana,
            true,
            10,
            worldId
        );
    }

    function test_RevertWhen_SubmitTradeInvalidPayload() public {
        uint256 gameId = _createStartedGameWithPlayer(PLAYER_1);

        WorldInPaper.WorldIdVerification memory worldId = WorldInPaper
            .WorldIdVerification({
                nullifier: 1000,
                action: 1,
                rpId: 1,
                nonce: 1,
                signalHash: 1,
                expiresAtMin: 999_999,
                issuerSchemaId: 1,
                credentialGenesisIssuedAtMin: 1,
                zeroKnowledgeProof: [uint256(0), 0, 0, 0, 0]
            });

        vm.prank(PLAYER_1);
        vm.expectRevert(WorldInPaper.EmptyAssetAddress.selector);
        worldInPaper.submitTrade(
            gameId,
            "",
            WorldInPaper.Origin.Base,
            true,
            100,
            worldId
        );

        worldId.nullifier = 1001;
        vm.prank(PLAYER_1);
        vm.expectRevert(WorldInPaper.InvalidAmountIn.selector);
        worldInPaper.submitTrade(
            gameId,
            "XAUUSD",
            WorldInPaper.Origin.Base,
            true,
            0,
            worldId
        );
    }

    function test_RevertWhen_VerifierRejectsProof() public {
        uint256 gameId = _createStartedGameWithPlayer(PLAYER_1);

        WorldInPaper.WorldIdVerification memory worldId = WorldInPaper
            .WorldIdVerification({
                nullifier: 999,
                action: 1,
                rpId: 1,
                nonce: 1,
                signalHash: 1,
                expiresAtMin: 999_999,
                issuerSchemaId: 1,
                credentialGenesisIssuedAtMin: 1,
                zeroKnowledgeProof: [uint256(0), 0, 0, 0, 0]
            });
        verifier.setShouldRevert(true);

        vm.prank(PLAYER_1);
        vm.expectRevert(bytes("INVALID_PROOF"));
        worldInPaper.submitTrade(
            gameId,
            "BTCUSD",
            WorldInPaper.Origin.Base,
            true,
            10,
            worldId
        );
    }

    function test_SubmitTradeWorksWhenWorldIdVerificationDisabled() public {
        verifier.setShouldRevert(true);

        WorldInPaper worldInPaperNoVerify = new WorldInPaper(
            FORWARDER,
            address(usdc),
            verifier,
            false
        );

        WorldInPaper.WorldIdVerification memory worldId = _nextWorldId();

        uint256 startTime = block.timestamp + 1 hours;
        uint256 endTime = startTime + 1 days;

        vm.startPrank(CREATOR);
        usdc.approve(address(worldInPaperNoVerify), ENTRY_AMOUNT);
        uint256 gameId = worldInPaperNoVerify.createGame(
            ENTRY_AMOUNT,
            STARTING_WIP_BALANCE,
            3,
            startTime,
            endTime
        );
        vm.stopPrank();

        vm.startPrank(PLAYER_1);
        usdc.approve(address(worldInPaperNoVerify), ENTRY_AMOUNT);
        worldInPaperNoVerify.joinGame(gameId);
        vm.stopPrank();

        vm.warp(startTime + 1);

        vm.prank(PLAYER_1);
        uint256 tradeId = worldInPaperNoVerify.submitTrade(
            gameId,
            "ETHUSD",
            WorldInPaper.Origin.Ethereum,
            true,
            10,
            worldId
        );

        assertEq(tradeId, 1);
        assertEq(worldInPaperNoVerify.getTotalSettlementRequestsCreated(), 1);
        assertFalse(worldInPaperNoVerify.nullifierUsed(worldId.nullifier));
        assertFalse(worldInPaperNoVerify.worldIdVerificationEnabled());
    }

    function test_SettleTradeDeletesFromMapping() public {
        uint256 gameId = _createStartedGameWithPlayer(PLAYER_1);

        WorldInPaper.WorldIdVerification memory worldId = WorldInPaper
            .WorldIdVerification({
                nullifier: 1111,
                action: 1,
                rpId: 1,
                nonce: 1,
                signalHash: 1,
                expiresAtMin: 999_999,
                issuerSchemaId: 1,
                credentialGenesisIssuedAtMin: 1,
                zeroKnowledgeProof: [uint256(0), 0, 0, 0, 0]
            });

        vm.prank(PLAYER_1);
        uint256 tradeId = worldInPaper.submitTrade(
            gameId,
            "BTCUSD",
            WorldInPaper.Origin.Hyperliquid,
            true,
            200 * 10 ** 6,
            worldId
        );

        assertEq(worldInPaper.getTotalSettlementRequestsCreated(), 1);
        assertEq(worldInPaper.nextTradeToSettleId(), 2);

        vm.prank(FORWARDER);
        worldInPaper.onReport("", abi.encode(tradeId, 1500 * 10 ** 18));

        assertEq(worldInPaper.getGameTradeCount(gameId), 1);
        WorldInPaper.Trade[] memory trades = worldInPaper.getGameTrades(gameId);
        assertEq(trades[0].id, tradeId);
        assertEq(trades[0].amountOut, 133_333);
        assertEq(
            _getPortfolioTokenBalance(gameId, PLAYER_1, "BTCUSD"),
            133_333
        );

        assertEq(worldInPaper.getTotalSettlementRequestsCreated(), 1);
        assertEq(worldInPaper.nextTradeToSettleId(), 2);
        vm.expectRevert(
            abi.encodeWithSelector(
                WorldInPaper.TradeToSettleNotFound.selector,
                tradeId
            )
        );
        worldInPaper.getTradeToSettle(tradeId);
    }

    function test_RevertWhen_SettleTradeNotFound() public {
        vm.prank(FORWARDER);
        vm.expectRevert(
            abi.encodeWithSelector(
                WorldInPaper.TradeToSettleNotFound.selector,
                999
            )
        );
        worldInPaper.onReport("", abi.encode(uint256(999), uint256(123)));
    }

    function test_ClaimGameOddPlayersMiddleGetsEntryBack() public {
        uint256 gameId = _createGameAsCreator(3);

        vm.startPrank(PLAYER_1);
        usdc.approve(address(worldInPaper), ENTRY_AMOUNT);
        worldInPaper.joinGame(gameId);
        vm.stopPrank();

        vm.startPrank(PLAYER_2);
        usdc.approve(address(worldInPaper), ENTRY_AMOUNT);
        worldInPaper.joinGame(gameId);
        vm.stopPrank();

        vm.warp(worldInPaper.getGame(gameId).startTime + 1);

        vm.prank(PLAYER_1);
        worldInPaper.submitTrade(
            gameId,
            "ETHUSD",
            WorldInPaper.Origin.Base,
            true,
            200 * 10 ** 6,
            _nextWorldId()
        );

        vm.prank(PLAYER_2);
        worldInPaper.submitTrade(
            gameId,
            "BTCUSD",
            WorldInPaper.Origin.Base,
            true,
            100 * 10 ** 6,
            _nextWorldId()
        );

        uint256 endTime = worldInPaper.getGame(gameId).endTime;
        vm.warp(endTime);

        uint256 creatorBefore = usdc.balanceOf(CREATOR);
        uint256 player2Before = usdc.balanceOf(PLAYER_2);
        uint256 player1Before = usdc.balanceOf(PLAYER_1);

        vm.prank(CREATOR);
        worldInPaper.claimGame(gameId);
        vm.prank(PLAYER_2);
        worldInPaper.claimGame(gameId);
        vm.prank(PLAYER_1);
        worldInPaper.claimGame(gameId);

        assertEq(usdc.balanceOf(CREATOR), creatorBefore + ENTRY_AMOUNT * 2);
        assertEq(usdc.balanceOf(PLAYER_2), player2Before + ENTRY_AMOUNT);
        assertEq(usdc.balanceOf(PLAYER_1), player1Before);
    }

    function test_ClaimGameEvenPlayersTopHalfDoubleBottomHalfZero() public {
        uint256 gameId = _createGameAsCreator(4);

        vm.startPrank(PLAYER_1);
        usdc.approve(address(worldInPaper), ENTRY_AMOUNT);
        worldInPaper.joinGame(gameId);
        vm.stopPrank();

        vm.startPrank(PLAYER_2);
        usdc.approve(address(worldInPaper), ENTRY_AMOUNT);
        worldInPaper.joinGame(gameId);
        vm.stopPrank();

        vm.startPrank(PLAYER_3);
        usdc.approve(address(worldInPaper), ENTRY_AMOUNT);
        worldInPaper.joinGame(gameId);
        vm.stopPrank();

        vm.warp(worldInPaper.getGame(gameId).startTime + 1);

        vm.prank(PLAYER_1);
        worldInPaper.submitTrade(
            gameId,
            "ETHUSD",
            WorldInPaper.Origin.Base,
            true,
            100 * 10 ** 6,
            _nextWorldId()
        );

        vm.prank(PLAYER_2);
        worldInPaper.submitTrade(
            gameId,
            "BTCUSD",
            WorldInPaper.Origin.Base,
            true,
            200 * 10 ** 6,
            _nextWorldId()
        );

        vm.prank(PLAYER_3);
        worldInPaper.submitTrade(
            gameId,
            "SOLUSD",
            WorldInPaper.Origin.Base,
            true,
            300 * 10 ** 6,
            _nextWorldId()
        );

        uint256 endTime = worldInPaper.getGame(gameId).endTime;
        vm.warp(endTime);

        uint256 creatorBefore = usdc.balanceOf(CREATOR);
        uint256 player1Before = usdc.balanceOf(PLAYER_1);
        uint256 player2Before = usdc.balanceOf(PLAYER_2);
        uint256 player3Before = usdc.balanceOf(PLAYER_3);

        vm.prank(CREATOR);
        worldInPaper.claimGame(gameId);
        vm.prank(PLAYER_1);
        worldInPaper.claimGame(gameId);
        vm.prank(PLAYER_2);
        worldInPaper.claimGame(gameId);
        vm.prank(PLAYER_3);
        worldInPaper.claimGame(gameId);

        assertEq(usdc.balanceOf(CREATOR), creatorBefore + ENTRY_AMOUNT * 2);
        assertEq(usdc.balanceOf(PLAYER_1), player1Before + ENTRY_AMOUNT * 2);
        assertEq(usdc.balanceOf(PLAYER_2), player2Before);
        assertEq(usdc.balanceOf(PLAYER_3), player3Before);
    }

    function test_RevertWhen_ClaimGameBeforeEnd() public {
        uint256 gameId = _createGameAsCreator(3);

        vm.expectRevert(
            abi.encodeWithSelector(
                WorldInPaper.GameNotEnded.selector,
                gameId,
                worldInPaper.getGame(gameId).endTime,
                block.timestamp
            )
        );
        vm.prank(CREATOR);
        worldInPaper.claimGame(gameId);
    }

    function test_RevertWhen_ClaimGameByNonPlayerAndWhenAlreadyClaimed()
        public
    {
        uint256 gameId = _createGameAsCreator(3);
        uint256 endTime = worldInPaper.getGame(gameId).endTime;
        vm.warp(endTime);

        vm.prank(address(0xBEEF));
        vm.expectRevert(
            abi.encodeWithSelector(
                WorldInPaper.NotGamePlayer.selector,
                gameId,
                address(0xBEEF)
            )
        );
        worldInPaper.claimGame(gameId);

        vm.prank(CREATOR);
        worldInPaper.claimGame(gameId);

        vm.prank(CREATOR);
        vm.expectRevert(
            abi.encodeWithSelector(
                WorldInPaper.AlreadyClaimed.selector,
                gameId,
                CREATOR
            )
        );
        worldInPaper.claimGame(gameId);
    }

    function test_GetClaimableAmountReturnsZeroBeforeEnd() public {
        uint256 gameId = _createGameAsCreator(3);

        assertEq(worldInPaper.getPlayerPortfolio(gameId, CREATOR).claimableAmount, 0);
    }

    function test_GetClaimableAmountMatchesClaimAndBecomesZeroAfterClaim()
        public
    {
        uint256 gameId = _createGameAsCreator(3);

        vm.startPrank(PLAYER_1);
        usdc.approve(address(worldInPaper), ENTRY_AMOUNT);
        worldInPaper.joinGame(gameId);
        vm.stopPrank();

        vm.startPrank(PLAYER_2);
        usdc.approve(address(worldInPaper), ENTRY_AMOUNT);
        worldInPaper.joinGame(gameId);
        vm.stopPrank();

        vm.warp(worldInPaper.getGame(gameId).startTime + 1);

        vm.prank(PLAYER_1);
        worldInPaper.submitTrade(
            gameId,
            "ETHUSD",
            WorldInPaper.Origin.Base,
            true,
            100 * 10 ** 6,
            _nextWorldId()
        );

        vm.prank(PLAYER_2);
        worldInPaper.submitTrade(
            gameId,
            "BTCUSD",
            WorldInPaper.Origin.Base,
            true,
            200 * 10 ** 6,
            _nextWorldId()
        );

        uint256 endTime = worldInPaper.getGame(gameId).endTime;
        vm.warp(endTime);

        uint256 claimableCreator = worldInPaper.getPlayerPortfolio(
            gameId,
            CREATOR
        ).claimableAmount;
        uint256 claimablePlayer1 = worldInPaper.getPlayerPortfolio(
            gameId,
            PLAYER_1
        ).claimableAmount;
        uint256 claimablePlayer2 = worldInPaper.getPlayerPortfolio(
            gameId,
            PLAYER_2
        ).claimableAmount;

        assertEq(claimableCreator, ENTRY_AMOUNT * 2);
        assertEq(claimablePlayer1, ENTRY_AMOUNT);
        assertEq(claimablePlayer2, 0);

        vm.prank(CREATOR);
        uint256 claimed = worldInPaper.claimGame(gameId);
        assertEq(claimed, claimableCreator);
        assertEq(worldInPaper.getPlayerPortfolio(gameId, CREATOR).claimableAmount, 0);
    }

    function _getPortfolioToken(
        WorldInPaper.PlayerPortfolioView memory portfolio,
        string memory assetAddress
    ) internal pure returns (WorldInPaper.PortfolioTokenView memory token) {
        bytes32 assetHash = keccak256(bytes(assetAddress));

        for (uint256 i = 0; i < portfolio.tokens.length; ) {
            if (
                keccak256(bytes(portfolio.tokens[i].asset_address)) == assetHash
            ) {
                return portfolio.tokens[i];
            }

            unchecked {
                ++i;
            }
        }

        revert("TOKEN_NOT_FOUND");
    }

    function _getPortfolioTokenBalance(
        uint256 gameId,
        address player,
        string memory assetAddress
    ) internal view returns (uint256) {
        return _getPortfolioToken(
            worldInPaper.getPlayerPortfolio(gameId, player),
            assetAddress
        ).balance;
    }

    function _createGameAsCreator(
        uint16 maxPlayers
    ) internal returns (uint256 gameId) {
        uint256 startTime = block.timestamp + 1 hours;
        uint256 endTime = startTime + 1 days;

        vm.startPrank(CREATOR);
        usdc.approve(address(worldInPaper), ENTRY_AMOUNT);
        gameId = worldInPaper.createGame(
            ENTRY_AMOUNT,
            STARTING_WIP_BALANCE,
            maxPlayers,
            startTime,
            endTime
        );
        vm.stopPrank();
    }

    function _createStartedGameWithPlayer(
        address player
    ) internal returns (uint256 gameId) {
        gameId = _createGameAsCreator(3);

        vm.startPrank(player);
        usdc.approve(address(worldInPaper), ENTRY_AMOUNT);
        worldInPaper.joinGame(gameId);
        vm.stopPrank();

        vm.warp(worldInPaper.getGame(gameId).startTime + 1);
    }

    function _nextWorldId()
        internal
        returns (WorldInPaper.WorldIdVerification memory worldId)
    {
        worldId = WorldInPaper.WorldIdVerification({
            nullifier: nextNullifier,
            action: 1,
            rpId: 1,
            nonce: 1,
            signalHash: 1,
            expiresAtMin: 999_999,
            issuerSchemaId: 1,
            credentialGenesisIssuedAtMin: 1,
            zeroKnowledgeProof: [uint256(0), 0, 0, 0, 0]
        });

        unchecked {
            nextNullifier += 1;
        }
    }
}
