// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {WriterDeployer} from "../src/WriterDeployer.sol";
import {WriterStorageDeployer} from "../src/WriterStorageDeployer.sol";
import {WriterFactory} from "../src/WriterFactory.sol";
import {ColorRegistry} from "../src/ColorRegistry.sol";

/// @title Deploy
/// @notice Deploys the full Writer contract stack via the Arachnid
///         deterministic deployer (0x4e59b44847b379578588920cA78FbF26c0B4956C).
///
///         The stack is 4 contracts:
///           1. WriterDeployer     — embeds Writer creation bytecode, CREATE2
///           2. WriterStorageDeployer — embeds WriterStorage creation bytecode + wiring
///           3. WriterFactory      — thin orchestrator, calls 1 & 2
///           4. ColorRegistry      — standalone
///
///         The factory is split into three pieces because Writer + WriterStorage
///         together exceed the EIP-170 contract size limit (24,576 bytes). Each
///         sub-deployer embeds only one contract's bytecode, keeping all three
///         well under the limit.
///
///         Using the deterministic deployer means the resulting addresses
///         depend ONLY on (deployer_address, salt, init_code_hash), NOT on
///         the broadcaster's nonce. The same (salt, source code) tuple
///         produces the SAME addresses on every EVM chain that has the
///         Arachnid deployer at the canonical address.
///
///         Required env vars:
///           WRITER_DEPLOYER_SALT       — bytes32 salt for WriterDeployer
///           STORAGE_DEPLOYER_SALT      — bytes32 salt for WriterStorageDeployer
///           FACTORY_SALT               — bytes32 salt for WriterFactory
///           COLOR_REGISTRY_SALT        — bytes32 salt for ColorRegistry
///
///         Run with:
///           WRITER_DEPLOYER_SALT=0x...  \
///           STORAGE_DEPLOYER_SALT=0x... \
///           FACTORY_SALT=0x...          \
///           COLOR_REGISTRY_SALT=0x...   \
///           forge script script/Deploy.s.sol \
///             --rpc-url $OP_RPC_URL \
///             --broadcast \
///             --private-key $DEPLOY_KEY \
///             --verify \
///             --etherscan-api-key $ETHERSCAN_API_KEY \
///             -vvv
///
///         For a dry run (no broadcast, no verification):
///           WRITER_DEPLOYER_SALT=0x...  \
///           STORAGE_DEPLOYER_SALT=0x... \
///           FACTORY_SALT=0x...          \
///           COLOR_REGISTRY_SALT=0x...   \
///           forge script script/Deploy.s.sol \
///             --rpc-url $OP_RPC_URL \
///             -vvv
///
///         NOTE on --verify: Foundry will submit source verification to
///         the Optimism block explorer (Etherscan-compatible) after each
///         deploy tx is confirmed. Get your API key from
///         https://optimistic.etherscan.io/myapikey. The same key works
///         for verification on OP mainnet and OP Sepolia. For other chains
///         (Base, Arbitrum, etc.) you need that chain's Etherscan API key
///         and the corresponding --verifier-url if it differs from the
///         default.
///
///         IMPORTANT: pick your salts deliberately and record them. They
///         are permanent — the exact same salts must be used on any future
///         chain where you want byte-identical contract addresses.
contract Deploy is Script {
    address constant ARACHNID = 0x4e59b44847b379578588920cA78FbF26c0B4956C;

    function run() external {
        bytes32 writerDeployerSalt = vm.envBytes32("WRITER_DEPLOYER_SALT");
        bytes32 storageDeployerSalt = vm.envBytes32("STORAGE_DEPLOYER_SALT");
        bytes32 factorySalt = vm.envBytes32("FACTORY_SALT");
        bytes32 colorRegistrySalt = vm.envBytes32("COLOR_REGISTRY_SALT");

        // -------------------------------------------------------------------
        // Compute init codes
        // -------------------------------------------------------------------
        bytes memory writerDeployerInitCode = type(WriterDeployer).creationCode;
        bytes memory storageDeployerInitCode = type(WriterStorageDeployer).creationCode;
        bytes memory colorRegistryInitCode = type(ColorRegistry).creationCode;

        // Predict sub-deployer addresses first (needed for factory constructor)
        address predictedWriterDeployer = _predictCreate2(ARACHNID, writerDeployerSalt, writerDeployerInitCode);
        address predictedStorageDeployer = _predictCreate2(ARACHNID, storageDeployerSalt, storageDeployerInitCode);

        // Factory init code includes the sub-deployer addresses as constructor args
        bytes memory factoryInitCode = abi.encodePacked(
            type(WriterFactory).creationCode, abi.encode(predictedWriterDeployer, predictedStorageDeployer)
        );
        address predictedFactory = _predictCreate2(ARACHNID, factorySalt, factoryInitCode);
        address predictedColorRegistry = _predictCreate2(ARACHNID, colorRegistrySalt, colorRegistryInitCode);

        console.log("=== Pre-flight ===");
        console.log("Arachnid deployer:           ", ARACHNID);
        console.log("Predicted WriterDeployer:     ", predictedWriterDeployer);
        console.log("Predicted StorageDeployer:    ", predictedStorageDeployer);
        console.log("Predicted WriterFactory:      ", predictedFactory);
        console.log("Predicted ColorRegistry:      ", predictedColorRegistry);

        // -------------------------------------------------------------------
        // Verify the Arachnid deployer exists
        // -------------------------------------------------------------------
        uint256 codeSize;
        assembly {
            codeSize := extcodesize(ARACHNID)
        }
        require(codeSize > 0, "Deploy: Arachnid deployer not found on this chain");

        // -------------------------------------------------------------------
        // Verify no slot collisions
        // -------------------------------------------------------------------
        _requireEmpty(predictedWriterDeployer, "WriterDeployer");
        _requireEmpty(predictedStorageDeployer, "WriterStorageDeployer");
        _requireEmpty(predictedFactory, "WriterFactory");
        _requireEmpty(predictedColorRegistry, "ColorRegistry");

        // -------------------------------------------------------------------
        // Deploy all 4 contracts. Order matters:
        //   1. WriterDeployer        (no dependencies)
        //   2. WriterStorageDeployer (no dependencies)
        //   3. WriterFactory         (constructor takes 1 & 2 addresses)
        //   4. ColorRegistry         (no dependencies)
        // -------------------------------------------------------------------
        vm.startBroadcast();

        // 1. WriterDeployer
        (bool ok1,) = ARACHNID.call(abi.encodePacked(writerDeployerSalt, writerDeployerInitCode));
        require(ok1, "WriterDeployer deploy failed");

        // 2. WriterStorageDeployer
        (bool ok2,) = ARACHNID.call(abi.encodePacked(storageDeployerSalt, storageDeployerInitCode));
        require(ok2, "WriterStorageDeployer deploy failed");

        // 3. WriterFactory (with constructor args pointing at 1 & 2)
        (bool ok3,) = ARACHNID.call(abi.encodePacked(factorySalt, factoryInitCode));
        require(ok3, "WriterFactory deploy failed");

        // 4. ColorRegistry
        (bool ok4,) = ARACHNID.call(abi.encodePacked(colorRegistrySalt, colorRegistryInitCode));
        require(ok4, "ColorRegistry deploy failed");

        vm.stopBroadcast();

        // -------------------------------------------------------------------
        // Post-deploy verification
        // -------------------------------------------------------------------
        _requireDeployed(predictedWriterDeployer, "WriterDeployer");
        _requireDeployed(predictedStorageDeployer, "WriterStorageDeployer");
        _requireDeployed(predictedFactory, "WriterFactory");
        _requireDeployed(predictedColorRegistry, "ColorRegistry");

        // Verify the factory's sub-deployer references are correct
        WriterFactory f = WriterFactory(predictedFactory);
        require(address(f.writerDeployer()) == predictedWriterDeployer, "Factory writerDeployer mismatch");
        require(address(f.storageDeployer()) == predictedStorageDeployer, "Factory storageDeployer mismatch");

        // Verify ColorRegistry domain
        ColorRegistry cr = ColorRegistry(predictedColorRegistry);
        require(keccak256(bytes(cr.DOMAIN_NAME())) == keccak256("ColorRegistry"), "ColorRegistry DOMAIN_NAME mismatch");

        console.log("");
        console.log("=== Deployed ===");
        console.log("WriterDeployer:      ", predictedWriterDeployer);
        console.log("StorageDeployer:     ", predictedStorageDeployer);
        console.log("WriterFactory:       ", predictedFactory);
        console.log("ColorRegistry:       ", predictedColorRegistry);

        console.log("");
        console.log("=== Next steps ===");
        console.log("1. Record the addresses above.");
        console.log("2. Update env vars:");
        console.log("     FACTORY_ADDRESS=", predictedFactory);
        console.log("     COLOR_REGISTRY_ADDRESS=", predictedColorRegistry);
        console.log("3. Record the deploy block number for START_BLOCK.");
        console.log("4. Follow DEPLOYMENT.md steps 3-5.");
        console.log("");
        console.log("=== For future chain deployments ===");
        console.log("Run this script with the SAME salts and SAME source code.");
        console.log("All 4 addresses will be identical on any chain with the");
        console.log("Arachnid deployer at:", ARACHNID);
    }

    function _predictCreate2(address deployer, bytes32 salt, bytes memory initCode) internal pure returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), deployer, salt, keccak256(initCode))))));
    }

    function _requireEmpty(address addr, string memory name) internal view {
        uint256 cs;
        assembly {
            cs := extcodesize(addr)
        }
        require(cs == 0, string.concat("Deploy: ", name, " address already occupied. Use a different salt."));
    }

    function _requireDeployed(address addr, string memory name) internal view {
        uint256 cs;
        assembly {
            cs := extcodesize(addr)
        }
        require(cs > 0, string.concat("Deploy: ", name, " has no code at predicted address after deploy"));
    }
}
