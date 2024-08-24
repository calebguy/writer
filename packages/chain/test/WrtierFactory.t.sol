// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {Writer} from "../src/Writer.sol";
import {WriterFactory} from "../src/WriterFactory.sol";

contract WrtierFactoryTest is Test {
    WriterFactory public writerFactory;

    address[] managers = [address(0x1)];

    function setUp() public {
        writerFactory = new WriterFactory();
    }

    function test_Create() public {}
}
