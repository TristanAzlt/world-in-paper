// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {WorldInPaperObserver} from "../src/WorldInPaperObserver.sol";

contract WorldInPaperObserverScript is Script {
    WorldInPaperObserver public worldInPaperObserver;

    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("CREATOR_PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        worldInPaperObserver = new WorldInPaperObserver();

        console2.log("WorldInPaperObserver deployed at:", address(worldInPaperObserver));

        vm.stopBroadcast();
    }
}
