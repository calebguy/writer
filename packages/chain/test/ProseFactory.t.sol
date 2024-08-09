// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {Prose} from "../src/Prose.sol";
import {ProseFactory} from "../src/ProseFactory.sol";

contract ProseFactoryTest is Test {
    ProseFactory public proseFactory;

    address[] managers = [address(0x1)];

    function setUp() public {
        proseFactory = new ProseFactory();
    }

    function test_Create() public {
        Prose prose = Prose(proseFactory.create(managers));
        assertEq(prose.getEntryCount(), 0);

        address[] memory proseAddresses = proseFactory.getCreations(address(this));
        assertEq(proseAddresses.length, 1);
        assertEq(proseAddresses[0], address(prose));
    }
}
