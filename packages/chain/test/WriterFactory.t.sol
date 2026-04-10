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
}
