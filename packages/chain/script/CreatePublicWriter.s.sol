// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {WriterFactory} from "../src/WriterFactory.sol";
import {Writer} from "../src/Writer.sol";

/// @title CreatePublicWriter
/// @notice One-off deploy of a public-writable Writer ("message board"
///         mode). The server's `/factory/create` endpoint hardcodes
///         publicWritable=false because the UI does not surface public
///         writer creation, so the only way to make a public writer is
///         this script (or a direct `cast send` to the factory).
///
/// @dev    The deployment is via the existing factory's CREATE2 path, so
///         the resulting WriterStorage + Writer addresses are determined
///         by (factory, salt, initCode_hash). The salt is taken from
///         env so the resulting address is reproducible across runs / dry
///         runs / chain replays.
///
///         Required env vars:
///           FACTORY_ADDRESS  - the (already-deployed) WriterFactory
///           TITLE            - the writer's display title
///           ADMIN            - the admin address (DEFAULT_ADMIN_ROLE on
///                              the resulting Writer; controls setTitle,
///                              setStorage, replaceAdmin)
///           SALT             - 32-byte hex salt for CREATE2. Pick any
///                              value; once committed, the (factory, salt,
///                              args) tuple uniquely determines the
///                              resulting Writer address.
///
///         Optional env vars:
///           MANAGERS         - comma-separated list of addresses granted
///                              the WRITER_ROLE at construction. On a
///                              public writer this role is functionally
///                              meaningless (everyone has it via the
///                              hasRole override) but is preserved as a
///                              "founding team" concept. Defaults to
///                              [ADMIN].
///
///         Run with:
///           FACTORY_ADDRESS=0x...                                       \
///           TITLE="Town Square"                                         \
///           ADMIN=0xYourAdminWallet                                     \
///           SALT=0x000000000000000000000000000000000000000000000000000000000000002a \
///           forge script script/CreatePublicWriter.s.sol                \
///             --rpc-url $OP_RPC_URL                                     \
///             --broadcast                                               \
///             --private-key $DEPLOY_KEY                                 \
///             -vvv
///
///         For a dry run (no broadcast), omit `--broadcast`.
contract CreatePublicWriter is Script {
    function run() external {
        address factoryAddress = vm.envAddress("FACTORY_ADDRESS");
        string memory title = vm.envString("TITLE");
        address admin = vm.envAddress("ADMIN");
        bytes32 salt = vm.envBytes32("SALT");

        // Default managers = [admin]; override with MANAGERS env var
        // (comma-separated address list).
        address[] memory defaultManagers = new address[](1);
        defaultManagers[0] = admin;
        address[] memory managers = vm.envOr("MANAGERS", ",", defaultManagers);

        WriterFactory factory = WriterFactory(factoryAddress);

        // Predict the address before deploying so we can log it for the
        // operator (and so they can verify it matches what they expected).
        address predictedAddress =
            factory.computeWriterAddress(title, admin, managers, true, salt);
        address predictedStorage = factory.computeWriterStorageAddress(salt);

        console.log("=== Pre-flight ===");
        console.log("Factory:           ", factoryAddress);
        console.log("Title:             ", title);
        console.log("Admin:             ", admin);
        console.log("Salt:              ");
        console.logBytes32(salt);
        console.log("Manager count:     ", managers.length);
        for (uint256 i = 0; i < managers.length; i++) {
            console.log("  manager[i]:      ", managers[i]);
        }
        console.log("Predicted Writer:  ", predictedAddress);
        console.log("Predicted Storage: ", predictedStorage);
        console.log("Public writable:    true");

        vm.startBroadcast();
        (address writerAddress, address storeAddress) =
            factory.create(title, admin, managers, true, salt);
        vm.stopBroadcast();

        require(
            writerAddress == predictedAddress,
            "CreatePublicWriter: deployed Writer address differs from prediction"
        );
        require(
            storeAddress == predictedStorage,
            "CreatePublicWriter: deployed WriterStorage address differs from prediction"
        );

        // Sanity-check the on-chain state of the new writer.
        Writer writer = Writer(writerAddress);
        require(writer.publicWritable(), "CreatePublicWriter: publicWritable not set");
        require(
            writer.hasRole(writer.DEFAULT_ADMIN_ROLE(), admin),
            "CreatePublicWriter: admin role not granted"
        );

        console.log("");
        console.log("=== Deployed ===");
        console.log("Writer:            ", writerAddress);
        console.log("WriterStorage:     ", storeAddress);

        console.log("");
        console.log("=== Next steps ===");
        console.log("1. Wait for the indexer to pick up the WriterCreated event.");
        console.log("   It will set publicWritable=true on the writer row");
        console.log("   automatically.");
        console.log("2. Verify the writer appears in /writer/public.");
        console.log("3. Test write from a non-manager wallet via the UI.");
    }
}
