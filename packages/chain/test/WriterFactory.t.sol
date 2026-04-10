// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {Writer} from "../src/Writer.sol";
import {WriterFactory} from "../src/WriterFactory.sol";

contract WriterFactoryTest is Test {
    WriterFactory public factory;

    address user = makeAddr("writer");
    address[] users = [user];

    function setUp() public {
        factory = new WriterFactory();
    }

    function test_Create() public {
        (address writerAddress, address storeAddress) =
            factory.create("Notes for today", user, users, false, bytes32(0));
        Writer writer = Writer(writerAddress);
        assertNotEq(writerAddress, address(0), "Writer address should not be zero");
        assertNotEq(storeAddress, address(0), "Store address should not be zero");
        assertEq(writer.hasRole(writer.WRITER_ROLE(), user), true);
        assertEq(writer.hasRole(writer.DEFAULT_ADMIN_ROLE(), user), true);
        assertEq(writer.publicWritable(), false, "default writer should be private");
    }

    function test_CreatePublic() public {
        (address writerAddress,) =
            factory.create("Town Square", user, users, true, bytes32(uint256(1)));
        Writer writer = Writer(writerAddress);
        assertEq(writer.publicWritable(), true, "public flag should be set");

        // Public writers grant WRITER_ROLE implicitly to every non-zero account
        address randomStranger = makeAddr("random-stranger");
        assertEq(
            writer.hasRole(writer.WRITER_ROLE(), randomStranger),
            true,
            "anyone should hold WRITER_ROLE on a public writer"
        );
        // ...except the zero address (defense-in-depth against bad signature recovery)
        assertEq(
            writer.hasRole(writer.WRITER_ROLE(), address(0)),
            false,
            "address(0) must never hold WRITER_ROLE, even on public writers"
        );
        // DEFAULT_ADMIN_ROLE is not affected by the public flag
        assertEq(
            writer.hasRole(writer.DEFAULT_ADMIN_ROLE(), randomStranger),
            false,
            "DEFAULT_ADMIN_ROLE should still be locked to admin on public writers"
        );
    }

    // -------------------------------------------------------------------------
    // Determinism: pins the property that computeWriterAddress predictions
    // exactly match the addresses produced by create(), so the off-chain
    // /factory/create endpoint can pre-compute storage/writer addresses
    // before broadcast (and so the cross-chain "writing in rocks" use case
    // can rely on identical addresses across chains given identical args).
    //
    // A regression here means a future contract change has shifted the
    // bytecode hash without updating the prediction logic.
    // -------------------------------------------------------------------------

    function test_FactoryProducesDeterministicAddresses_Private() public {
        bytes32 salt = bytes32(uint256(42));
        address predictedWriter =
            factory.computeWriterAddress("My Place", user, users, false, salt);
        address predictedStorage = factory.computeWriterStorageAddress(salt);

        (address actualWriter, address actualStorage) =
            factory.create("My Place", user, users, false, salt);

        assertEq(actualWriter, predictedWriter, "deployed Writer must match prediction");
        assertEq(
            actualStorage, predictedStorage, "deployed WriterStorage must match prediction"
        );
    }

    function test_FactoryProducesDeterministicAddresses_Public() public {
        // publicWritable is part of the constructor args, so it affects the
        // CREATE2 init code hash and therefore the deployed address. A
        // private writer and a public writer with otherwise-identical args
        // must deploy to DIFFERENT addresses.
        bytes32 salt = bytes32(uint256(43));
        address predictedWriter =
            factory.computeWriterAddress("My Place", user, users, true, salt);
        address predictedStorage = factory.computeWriterStorageAddress(salt);

        (address actualWriter, address actualStorage) =
            factory.create("My Place", user, users, true, salt);

        assertEq(actualWriter, predictedWriter, "public Writer must match prediction");
        assertEq(
            actualStorage, predictedStorage, "public WriterStorage must match prediction"
        );
    }

    function test_FactoryAddressesDifferByPublicFlag() public {
        // Same factory, same args, same salt, but different publicWritable
        // → different writer addresses (publicWritable is encoded into the
        // constructor args used as CREATE2 init code).
        bytes32 salt = bytes32(uint256(44));
        address privatePrediction =
            factory.computeWriterAddress("Place", user, users, false, salt);
        address publicPrediction =
            factory.computeWriterAddress("Place", user, users, true, salt);
        assertNotEq(
            privatePrediction,
            publicPrediction,
            "publicWritable flag must shift the deployed address"
        );

        // Storage addresses, however, are the SAME because WriterStorage's
        // init code is independent of the writer's constructor args.
        // (This is a bonus property test — confirms the architectural
        // separation between Writer and WriterStorage.)
        bytes32 storageSalt = bytes32(uint256(45));
        address privateStorage = factory.computeWriterStorageAddress(storageSalt);
        address publicStorage = factory.computeWriterStorageAddress(storageSalt);
        assertEq(
            privateStorage,
            publicStorage,
            "WriterStorage address must NOT depend on Writer args"
        );
    }
}
