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
        (address writerAddress, address storeAddress) = factory.create("Notes for today", user, users, bytes32(0));
        Writer writer = Writer(writerAddress);
        assertNotEq(writerAddress, address(0), "Writer address should not be zero");
        assertNotEq(storeAddress, address(0), "Store address should not be zero");
        assertEq(writer.hasRole(writer.WRITER_ROLE(), user), true);
        assertEq(writer.hasRole(writer.DEFAULT_ADMIN_ROLE(), user), true);
    }
}
