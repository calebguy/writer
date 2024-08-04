// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {Prose} from "../src/Prose.sol";
import {ProseFactory} from "../src/ProseFactory.sol";

contract ProseFactoryTest is Test {
    ProseFactory public proseFactory;

    function setUp() public {
        proseFactory = new ProseFactory();
    }

    function test_Create() public {
        address proseAddress = proseFactory.create("Hello, World!");
        Prose prose = Prose(proseAddress);
        assertEq(prose.getEntryCount(), 1);
        assertEq(prose.getEntry(1).content, "Hello, World!");
    }
}
