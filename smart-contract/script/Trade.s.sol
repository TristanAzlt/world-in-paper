// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {WorldInPaper} from "../src/WorldInPaper.sol";

contract TradeScript is Script {
    // Existing game to trade on.
    uint256 internal constant GAME_ID = 1;

    // Trade configuration.
    bool internal constant IS_BUY = true;
    uint256 internal constant AMOUNT_IN = 100 * 1e6;

    // Configure token here.
    // Option Base:
    // WorldInPaper.Origin.Base
    // "0x4b6104755afb5da4581b81c552da3a25608c73b8"
    // Option Solana:
    // WorldInPaper.Origin.Solana
    // "34q2KmCvapecJgR6ZrtbCTrzZVtkt3a5mHEA3TuEsWYb"
    // Option Hyperliquid:
    // WorldInPaper.Origin.Hyperliquid
    // "BTC"
    WorldInPaper.Origin internal constant TRADE_ORIGIN = WorldInPaper.Origin.Solana;
    string internal constant TRADE_ASSET = "34q2KmCvapecJgR6ZrtbCTrzZVtkt3a5mHEA3TuEsWYb";

    function run() external {
        uint256 traderPk = vm.envOr("TRADER_PRIVATE_KEY", vm.envUint("CREATOR_PRIVATE_KEY"));
        address worldInPaperAddress = vm.envAddress("WORLD_IN_PAPER_ADDRESS");
        address trader = vm.addr(traderPk);

        WorldInPaper worldInPaper = WorldInPaper(worldInPaperAddress);

        vm.startBroadcast(traderPk);
        uint256 tradeId = worldInPaper.submitTrade(GAME_ID, TRADE_ASSET, TRADE_ORIGIN, IS_BUY, AMOUNT_IN);
        vm.stopBroadcast();

        console2.log("Trader:", trader);
        console2.log("WorldInPaper:", worldInPaperAddress);
        console2.log("Game ID:", GAME_ID);
        console2.log("Trade ID:", tradeId);
        console2.log("Is buy:", IS_BUY);
        console2.log("Asset:", TRADE_ASSET);
        console2.log("Origin enum:", uint256(uint8(TRADE_ORIGIN)));
        console2.log("Amount in:", AMOUNT_IN);
        console2.log("No onReport call in this script.");
    }
}
