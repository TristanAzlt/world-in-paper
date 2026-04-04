// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {WorldInPaper} from "../src/WorldInPaper.sol";
import {IWorldIDVerifier} from "../src/interfaces/IWorldIDVerifier.sol";

contract WorldInPaperScript is Script {
    WorldInPaper public worldInPaper;

    function setUp() public {}

    function run() public {
        address forwarder = vm.envAddress("FORWARDER_ADDRESS");
        address usdc = vm.envAddress("USDC_ADDRESS");
        address worldIdVerifier = vm.envAddress("WORLD_ID_VERIFIER_ADDRESS");
        bool worldIdVerificationEnabled = vm.envBool(
            "WORLD_ID_VERIFICATION_ENABLED"
        );

        uint256 deployerPrivateKey = vm.envUint("CREATOR_PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        worldInPaper = new WorldInPaper(
            forwarder,
            usdc,
            IWorldIDVerifier(worldIdVerifier),
            worldIdVerificationEnabled
        );

        console2.log("WorldInPaper deployed at:", address(worldInPaper));

        vm.stopBroadcast();
    }
}
