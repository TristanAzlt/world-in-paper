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
    address private constant FORWARDER = address(0xF0);
    address private constant CREATOR = address(0xC0);
    address private constant PLAYER_1 = address(0xC1);
    address private constant PLAYER_2 = address(0xC2);

    MockUSDC internal usdc;
    MockWorldIDVerifier internal verifier;
    WorldInPaper internal worldInPaper;

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
        worldInPaper = new WorldInPaper(FORWARDER, address(usdc), verifier);

        usdc.mint(CREATOR, 1_000 * 10 ** 6);
        usdc.mint(PLAYER_1, 1_000 * 10 ** 6);
        usdc.mint(PLAYER_2, 1_000 * 10 ** 6);
    }

    function test_CreateGameAutoJoinsCreatorAndTransfersUSDC() public {
        uint256 startTime = block.timestamp + 1 hours;
        uint256 endTime = startTime + 1 days;

        vm.startPrank(CREATOR);
        usdc.approve(address(worldInPaper), ENTRY_AMOUNT);
        uint256 gameId = worldInPaper.createGame(
            ENTRY_AMOUNT,
            3,
            startTime,
            endTime
        );
        vm.stopPrank();

        assertEq(gameId, 1);

        WorldInPaper.Game memory game = worldInPaper.getGame(gameId);
        assertEq(game.id, 1);
        assertEq(game.entryAmount, ENTRY_AMOUNT);
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
    }

    function test_JoinGameTransfersUSDCAndIncrementsPlayerCount() public {
        uint256 gameId = _createGameAsCreator(3);

        vm.startPrank(PLAYER_1);
        usdc.approve(address(worldInPaper), ENTRY_AMOUNT);
        worldInPaper.joinGame(gameId);
        vm.stopPrank();

        WorldInPaper.Game memory game = worldInPaper.getGame(gameId);
        assertEq(game.playerCount, 2);
        assertTrue(worldInPaper.hasJoined(gameId, PLAYER_1));
        assertEq(usdc.balanceOf(address(worldInPaper)), ENTRY_AMOUNT * 2);
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
        worldInPaper.createGame(ENTRY_AMOUNT, 1, startTime, endTime);

        vm.expectRevert(
            abi.encodeWithSelector(
                WorldInPaper.InvalidMaxPlayers.selector,
                101,
                2,
                100
            )
        );
        worldInPaper.createGame(ENTRY_AMOUNT, 101, startTime, endTime);
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

    function test_RecordTradeByJoinedPlayer() public {
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
            95 * 10 ** 6
        );

        vm.prank(CREATOR);
        uint256 tradeId2 = worldInPaper.submitTrade(
            gameId,
            "BTCUSD",
            WorldInPaper.Origin.Ethereum,
            false,
            50 * 10 ** 6,
            51 * 10 ** 6
        );

        assertEq(tradeId1, 1);
        assertEq(tradeId2, 2);
        assertEq(worldInPaper.getGameTradeCount(gameId), 2);

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

    function test_RecordTradeIdsAreGlobalAcrossGames() public {
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
            1
        );

        vm.prank(CREATOR);
        uint256 tradeId2 = worldInPaper.submitTrade(
            gameId2,
            "BTCUSD",
            WorldInPaper.Origin.Base,
            false,
            1,
            1
        );

        assertEq(tradeId1, 1);
        assertEq(tradeId2, 2);
        assertEq(worldInPaper.nextTradeId(), 3);
    }

    function test_RevertWhen_RecordTradeFromNonPlayer() public {
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
            1
        );
    }

    function test_RevertWhen_RecordTradeBeforeStart() public {
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
            1
        );
    }

    function test_RevertWhen_RecordTradeAfterEnd() public {
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
            1
        );
    }

    function test_RevertWhen_RecordTradeWithEmptyAssetAddress() public {
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
            1
        );
    }

    function test_RevertWhen_RecordTradeWithInvalidAmounts() public {
        uint256 gameId = _createGameAsCreator(3);
        vm.warp(worldInPaper.getGame(gameId).startTime + 1);

        vm.prank(CREATOR);
        vm.expectRevert(
            abi.encodeWithSelector(
                WorldInPaper.InvalidTradeAmounts.selector,
                0,
                10
            )
        );
        worldInPaper.submitTrade(
            gameId,
            "ETHUSD",
            WorldInPaper.Origin.Base,
            true,
            0,
            10
        );
    }

    function test_SubmitTradeStoresGlobalTradeToSettle() public {
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

        vm.prank(PLAYER_1);
        uint256 tradeId = worldInPaper.submitTrade(
            "BTCUSD",
            WorldInPaper.Origin.Hyperliquid,
            150 * 10 ** 6,
            worldId
        );

        assertEq(tradeId, 1);
        assertEq(worldInPaper.getTradesToSettleCount(), 1);
        assertEq(worldInPaper.nextTradeToSettleId(), 2);

        WorldInPaper.TradeToSettle memory tradeToSettle = worldInPaper
            .getTradeToSettle(tradeId);
        assertEq(tradeToSettle.id, 1);
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
            "ETHUSD",
            WorldInPaper.Origin.Ethereum,
            10,
            worldId
        );

        worldId.nullifier = 456;
        vm.prank(PLAYER_2);
        vm.expectRevert(WorldInPaper.InvalidNullifier.selector);
        worldInPaper.submitTrade(
            "SOLUSD",
            WorldInPaper.Origin.Solana,
            10,
            worldId
        );
    }

    function test_RevertWhen_SubmitTradeInvalidPayload() public {
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
        worldInPaper.submitTrade("", WorldInPaper.Origin.Base, 100, worldId);

        worldId.nullifier = 1001;
        vm.prank(PLAYER_1);
        vm.expectRevert(WorldInPaper.InvalidAmountIn.selector);
        worldInPaper.submitTrade(
            "XAUUSD",
            WorldInPaper.Origin.Base,
            0,
            worldId
        );
    }

    function test_RevertWhen_VerifierRejectsProof() public {
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
            "BTCUSD",
            WorldInPaper.Origin.Base,
            10,
            worldId
        );
    }

    function test_SettleTradeDeletesFromMapping() public {
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
            "BTCUSD",
            WorldInPaper.Origin.Hyperliquid,
            200 * 10 ** 6,
            worldId
        );

        assertEq(worldInPaper.getTradesToSettleCount(), 1);
        assertEq(worldInPaper.nextTradeToSettleId(), 2);

        vm.expectEmit(true, true, false, true);
        emit TradeSettled(
            tradeId,
            PLAYER_1,
            "BTCUSD",
            WorldInPaper.Origin.Hyperliquid,
            200 * 10 ** 6,
            1500 * 10 ** 8
        );

        vm.prank(FORWARDER);
        worldInPaper.onReport("", abi.encode(tradeId, 1500 * 10 ** 8));

        assertEq(worldInPaper.getTradesToSettleCount(), 1);
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

    function _createGameAsCreator(
        uint16 maxPlayers
    ) internal returns (uint256 gameId) {
        uint256 startTime = block.timestamp + 1 hours;
        uint256 endTime = startTime + 1 days;

        vm.startPrank(CREATOR);
        usdc.approve(address(worldInPaper), ENTRY_AMOUNT);
        gameId = worldInPaper.createGame(
            ENTRY_AMOUNT,
            maxPlayers,
            startTime,
            endTime
        );
        vm.stopPrank();
    }
}
