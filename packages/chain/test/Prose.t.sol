// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {Prose} from "../src/Prose.sol";

contract ProseTest is Test {
    Prose public prose;
    address admin = address(0x1);
    string content = "Writer";

    function setUp() public {
        prose = new Prose(admin, content);
    }

    function test_Create() public {
        vm.prank(admin);
        prose.create("Hey");
        assertEq(prose.getEntryCount(), 2);
    }

    function test_Update() public {
        vm.startPrank(admin);
        prose.create("Hi");
        string memory newContent = "Oh";
        uint256 entryId = 2;
        prose.update(entryId, newContent);
        vm.stopPrank();
        assertEq(prose.getEntryCount(), 2);
        assertEq(prose.getEntry(entryId).content, newContent);
    }

    function test_Remove() public {
        vm.startPrank(admin);
        prose.create("Hello, World!");
        prose.remove(2);
        vm.stopPrank();
        assertEq(prose.getEntryCount(), 1);
    }

    function test_GetEntryCount() public {
        assertEq(prose.getEntryCount(), 1);
        vm.startPrank(admin);
        prose.create("World!");
        prose.create("Universe!");
        prose.create("Multiverse!");
        vm.stopPrank();
        assertEq(prose.getEntryCount(), 4);
    }

    function test_GetEntryIds() public {
        vm.startPrank(admin);
        prose.create("World!");
        prose.create("Universe!");
        prose.create("Multiverse!");
        vm.stopPrank();
        uint256[] memory entryIds = prose.getEntryIds();
        assertEq(entryIds.length, 4);
        assertEq(entryIds[0], 1);
        assertEq(entryIds[1], 2);
        assertEq(entryIds[2], 3);
    }

    function test_GetEntry() public {
        vm.startPrank(admin);
        prose.create("World!");
        prose.create("Universe!");
        prose.create("Multiverse!");
        vm.stopPrank();
        Prose.Entry memory entry = prose.getEntry(3);
        assertEq(entry.createdAtBlock, block.number);
        assertEq(entry.content, "Universe!");
        assertTrue(entry.exists);
    }

    function test_GetEntryAfterRemoved() public {
        vm.startPrank(admin);
        prose.create("World!");
        prose.create("Universe!");
        prose.create("Multiverse!");
        prose.remove(2);
        vm.stopPrank();
        Prose.Entry memory entry = prose.getEntry(2);
        assertEq(entry.createdAtBlock, 0);
        assertEq(entry.content, "");
        assertFalse(entry.exists);
    }
}
