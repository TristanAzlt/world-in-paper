// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {WorldInPaper} from "../src/WorldInPaper.sol";

contract GameScript is Script {
    string internal constant GAME_NAME = "EthGlobal Whale Game";
    uint256 internal constant ENTRY_AMOUNT = 1 * 1e4;
    uint256 internal constant STARTING_WIP_BALANCE = 5_000 * 1e6;
    uint16 internal constant MAX_PLAYERS = 2;
    uint256 internal constant CREATOR_NULLIFIER = 1;
    uint256 internal constant JOINER_NULLIFIER = 2;

    struct Keys {
        uint256 creatorPk;
        uint256 joinerPk;
        address creator;
        address joiner;
    }

    function run() external {
        Keys memory keys = _loadKeys();
        WorldInPaper worldInPaper = WorldInPaper(
            vm.envAddress("WORLD_IN_PAPER_ADDRESS")
        );
        IERC20 usdc = IERC20(address(worldInPaper.USDC()));

        _checkUsdcBalances(usdc, keys.creator, keys.joiner);

        // Keep a buffer to avoid StartTimeMustBeFuture reverts during broadcast.
        uint256 startTime = block.timestamp + 5 minutes;
        uint256 endTime = startTime + 1 days;

        vm.startBroadcast(keys.creatorPk);
        usdc.approve(address(worldInPaper), ENTRY_AMOUNT);
        WorldInPaper.WorldIdVerification memory creatorWorldId = _worldId(CREATOR_NULLIFIER);
        uint256 gameId = worldInPaper.createGame(
            GAME_NAME,
            ENTRY_AMOUNT,
            STARTING_WIP_BALANCE,
            MAX_PLAYERS,
            startTime,
            endTime,
            creatorWorldId
        );
        vm.stopBroadcast();

        vm.startBroadcast(keys.joinerPk);
        usdc.approve(address(worldInPaper), ENTRY_AMOUNT);
        WorldInPaper.WorldIdVerification memory joinerWorldId = _worldId(JOINER_NULLIFIER);
        worldInPaper.joinGame(gameId, joinerWorldId);
        vm.stopBroadcast();

        console2.log("WorldInPaper:", address(worldInPaper));
        console2.log("Game ID:", gameId);
        console2.log("Game name:", GAME_NAME);
        console2.log("Creator:", keys.creator);
        console2.log("Joiner:", keys.joiner);
        console2.log("Entry amount:", ENTRY_AMOUNT);
        console2.log("Start time:", startTime);
        console2.log("End time:", endTime);
    }

    function _loadKeys() internal view returns (Keys memory keys) {
        keys.creatorPk = vm.envUint("CREATOR_PRIVATE_KEY");
        keys.joinerPk = vm.envUint("JOINER_PRIVATE_KEY");
        keys.creator = vm.addr(keys.creatorPk);
        keys.joiner = vm.addr(keys.joinerPk);
    }

    function _checkUsdcBalances(
        IERC20 usdc,
        address creator,
        address joiner
    ) internal view {
        uint256 creatorUsdc = usdc.balanceOf(creator);
        uint256 joinerUsdc = usdc.balanceOf(joiner);

        console2.log("Creator:", creator);
        console2.log("Joiner:", joiner);
        console2.log("Creator USDC:", creatorUsdc);
        console2.log("Joiner USDC:", joinerUsdc);

        require(
            creatorUsdc >= ENTRY_AMOUNT,
            "Creator does not have enough USDC for entry"
        );
        require(
            joinerUsdc >= ENTRY_AMOUNT,
            "Joiner does not have enough USDC for entry"
        );
    }

    function _worldId(
        uint256 nullifier
    ) internal pure returns (WorldInPaper.WorldIdVerification memory worldId) {
        worldId = WorldInPaper.WorldIdVerification({
            root: 1,
            signalHash: 1,
            nullifierHash: nullifier,
            externalNullifierHash: 1,
            proof: [uint256(0), 0, 0, 0, 0, 0, 0, 0]
        });
    }
}
