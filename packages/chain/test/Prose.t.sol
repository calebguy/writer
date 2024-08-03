// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {Prose} from "../src/Prose.sol";

contract ProseTest is Test {
    Prose public prose;
    address admin = address(0x1);

    function setUp() public {
        prose = new Prose(admin);
    }

    function test_Create() public {
        vm.prank(admin);
        prose.create("Hello, World!");
        assertEq(prose.getEntryCount(), 1);
    }

    function test_Update() public {
        vm.startPrank(admin);
        prose.create("Hello, World!");
        string memory newContent = "Hello, Universe!";
        prose.update(1, newContent);
        vm.stopPrank();
        assertEq(prose.getEntryCount(), 1);
        assertEq(prose.getEntry(1).content, newContent);
    }

    function test_Remove() public {
        vm.startPrank(admin);
        prose.create("Hello, World!");
        prose.remove(1);
        vm.stopPrank();
        assertEq(prose.getEntryCount(), 0);
    }

    function test_GetEntryCount() public {
        assertEq(prose.getEntryCount(), 0);
        vm.startPrank(admin);
        prose.create("Hello, World!");
        prose.create("Hello, Universe!");
        prose.create("Hello, Multiverse!");
        vm.stopPrank();
        assertEq(prose.getEntryCount(), 3);
    }

    function test_GetEntryIds() public {
        vm.startPrank(admin);
        prose.create("Hello, World!");
        prose.create("Hello, Universe!");
        prose.create("Hello, Multiverse!");
        vm.stopPrank();
        uint256[] memory entryIds = prose.getEntryIds();
        assertEq(entryIds.length, 3);
        assertEq(entryIds[0], 1);
        assertEq(entryIds[1], 2);
        assertEq(entryIds[2], 3);
    }

    function test_GetEntry() public {
        vm.startPrank(admin);
        prose.create("Hello, World!");
        prose.create("Hello, Universe!");
        prose.create("Hello, Multiverse!");
        vm.stopPrank();
        Prose.Entry memory entry = prose.getEntry(2);
        assertEq(entry.block, block.number);
        assertEq(entry.content, "Hello, Universe!");
        assertTrue(entry.exists);
    }

    function test_GetEntryAfterRemoved() public {
        vm.startPrank(admin);
        prose.create("Hello, World!");
        prose.create("Hello, Universe!");
        prose.create("Hello, Multiverse!");
        prose.remove(2);
        vm.stopPrank();
        Prose.Entry memory entry = prose.getEntry(2);
        assertEq(entry.block, 0);
        assertEq(entry.content, "");
        assertFalse(entry.exists);
    }
}
