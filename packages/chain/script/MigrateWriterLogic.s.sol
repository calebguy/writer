// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {Writer} from "../src/Writer.sol";
import {WriterStorage} from "../src/WriterStorage.sol";
import {IAccessControl} from "oz/access/IAccessControl.sol";

/// @title MigrateWriterLogic
/// @notice Deploys a fresh Writer (with the C-2 fix) pointing at an existing
///         WriterStorage, and optionally re-points the storage's `logic`
///         slot to it. Designed for migrating a single legacy Writer at a
///         time without losing any entries.
///
///         Required env vars:
///           STORAGE_ADDRESS     - the existing WriterStorage to migrate
///           OLD_WRITER_ADDRESS  - the existing Writer (logic) contract;
///                                 used to read `title` so the new Writer
///                                 keeps the same name
///           ADMIN               - the admin address for the new Writer
///                                 (typically the same wallet that owns the
///                                 storage). AccessControl has no enumerator
///                                 so this must be passed explicitly.
///
///         Optional env vars:
///           MANAGERS            - comma-separated list of WRITER_ROLE
///                                 grantees on the new Writer. Defaults to
///                                 [ADMIN] if not set.
///           SKIP_SET_LOGIC      - if "true", deploy only and do NOT call
///                                 setLogic. Useful for dry runs or when the
///                                 broadcaster is not the storage admin.
///
///         Run with:
///           forge script script/MigrateWriterLogic.s.sol \
///             --rpc-url $OP_RPC_URL \
///             --broadcast \
///             --private-key $ADMIN_KEY \
///             -vvv
///
///         Or for a dry run (no broadcast, no setLogic):
///           SKIP_SET_LOGIC=true forge script script/MigrateWriterLogic.s.sol \
///             --rpc-url $OP_RPC_URL -vvv
contract MigrateWriterLogic is Script {
    bytes32 internal constant DEFAULT_ADMIN_ROLE = 0x00;

    function run() external {
        address storageAddress = vm.envAddress("STORAGE_ADDRESS");
        address oldWriterAddress = vm.envAddress("OLD_WRITER_ADDRESS");
        address admin = vm.envAddress("ADMIN");

        // Managers default to [admin] if MANAGERS env var is unset.
        address[] memory defaultManagers = new address[](1);
        defaultManagers[0] = admin;
        address[] memory managers = vm.envOr("MANAGERS", ",", defaultManagers);

        bool skipSetLogic = vm.envOr("SKIP_SET_LOGIC", false);

        // -------------------------------------------------------------------
        // Read existing config from the legacy Writer so the new Writer
        // keeps the same title and (verifiably) the same admin.
        // -------------------------------------------------------------------
        Writer oldWriter = Writer(oldWriterAddress);
        WriterStorage store = WriterStorage(storageAddress);

        string memory title = oldWriter.title();
        require(
            address(oldWriter.store()) == storageAddress,
            "MigrateWriterLogic: OLD_WRITER_ADDRESS does not point at STORAGE_ADDRESS"
        );
        require(
            oldWriter.hasRole(DEFAULT_ADMIN_ROLE, admin),
            "MigrateWriterLogic: ADMIN is not the current Writer admin"
        );

        console.log("=== Pre-flight ===");
        console.log("Storage:        ", storageAddress);
        console.log("Old Writer:     ", oldWriterAddress);
        console.log("Title:          ", title);
        console.log("Admin:          ", admin);
        console.log("Manager count:  ", managers.length);
        for (uint256 i = 0; i < managers.length; i++) {
            console.log("  manager[i]:   ", managers[i]);
        }
        console.log("Skip setLogic:  ", skipSetLogic);

        // -------------------------------------------------------------------
        // Verify the broadcaster has the storage admin role BEFORE deploying.
        // We compute the broadcaster from the env var the same way Foundry
        // does so this also works in dry-run (no --broadcast).
        // -------------------------------------------------------------------
        uint256 deployerKey = vm.envOr("PRIVATE_KEY", uint256(0));
        address broadcaster;
        if (deployerKey != 0) {
            broadcaster = vm.addr(deployerKey);
        } else {
            // Fall back to the default sender (e.g. when using --account or
            // a hardware wallet). msg.sender inside a script is the default
            // foundry sender (0x1804...) until vm.startBroadcast is called,
            // so we can't reliably know the real broadcaster here. Skip the
            // check in that case and let the on-chain require() catch it.
            broadcaster = address(0);
        }

        bool broadcasterIsStorageAdmin =
            broadcaster != address(0) && store.hasRole(DEFAULT_ADMIN_ROLE, broadcaster);

        if (broadcaster != address(0)) {
            console.log("Broadcaster:    ", broadcaster);
            console.log("Broadcaster is storage admin?", broadcasterIsStorageAdmin);
        }

        if (!skipSetLogic && broadcaster != address(0) && !broadcasterIsStorageAdmin) {
            console.log("");
            console.log(
                "WARNING: broadcaster does not have DEFAULT_ADMIN_ROLE on the storage contract."
            );
            console.log(
                "         setLogic() will revert. Either run from the storage admin wallet,"
            );
            console.log("         or set SKIP_SET_LOGIC=true to deploy only.");
            revert("MigrateWriterLogic: broadcaster lacks storage admin role");
        }

        // -------------------------------------------------------------------
        // Deploy the new Writer (with the C-2 fix baked in via Writer.sol)
        // and, if authorized, re-point storage at it.
        // -------------------------------------------------------------------
        if (deployerKey != 0) {
            vm.startBroadcast(deployerKey);
        } else {
            vm.startBroadcast();
        }

        Writer writerV2 = new Writer(title, storageAddress, admin, managers);
        console.log("");
        console.log("=== Deployed ===");
        console.log("WriterV2 logic: ", address(writerV2));
        console.log("Pointing at:    ", address(writerV2.store()));

        if (!skipSetLogic) {
            console.log("");
            console.log("=== Re-pointing storage logic ===");
            store.setLogic(address(writerV2));
            address newLogic = store.logic();
            require(
                newLogic == address(writerV2),
                "MigrateWriterLogic: setLogic did not take effect"
            );
            console.log("storage.logic() now:", newLogic);
        } else {
            console.log("");
            console.log("=== setLogic skipped ===");
            console.log("Run separately when ready:");
            console.log("  cast send", storageAddress);
            console.log('       "setLogic(address)"', address(writerV2));
            console.log("       --rpc-url $OP_RPC_URL --private-key $ADMIN_KEY");
        }

        vm.stopBroadcast();

        console.log("");
        console.log("=== Next steps ===");
        console.log("1. Verify the indexer picks up LogicSet and rewrites writer.address");
        console.log("   in the DB (or run a manual UPDATE if running pre-indexer-deploy).");
        console.log("2. Confirm a test write goes through the new Writer logic by hitting");
        console.log("   POST /writer/<newLogic>/entry/createWithChunk from the frontend.");
        console.log("3. The old Writer at", oldWriterAddress, "is now inert for writes");
        console.log("   (its calls to storage will revert at onlyLogic).");
    }
}
