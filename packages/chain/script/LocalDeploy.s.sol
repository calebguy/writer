// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {WriterDeployer} from "../src/WriterDeployer.sol";
import {WriterStorageDeployer} from "../src/WriterStorageDeployer.sol";
import {WriterFactory} from "../src/WriterFactory.sol";

/// @title LocalDeploy
/// @notice Directly deploys the Writer contract stack for local Anvil development.
///         Production deployments use Deploy.s.sol and the Arachnid deterministic
///         deployer; local development does not need cross-chain deterministic
///         addresses and fresh Anvil chains do not include Arachnid by default.
contract LocalDeploy is Script {
    function run() external {
        vm.startBroadcast();

        WriterDeployer writerDeployer = new WriterDeployer();
        WriterStorageDeployer storageDeployer = new WriterStorageDeployer();
        WriterFactory factory = new WriterFactory(address(writerDeployer), address(storageDeployer));

        vm.stopBroadcast();

        console.log("=== Local Writer stack deployed ===");
        console.log("WRITER_DEPLOYER_ADDRESS=", address(writerDeployer));
        console.log("STORAGE_DEPLOYER_ADDRESS=", address(storageDeployer));
        console.log("FACTORY_ADDRESS=", address(factory));
        console.log("START_BLOCK=0");
        console.log("TARGET_CHAIN_ID=31337");
    }
}
