// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Prose} from "./Prose.sol";

contract ProseFactory {
    event ProseCreated(address indexed prose, address indexed author);

    function create(string memory content) external returns (address) {
        address proseAddress = address(new Prose(msg.sender, content));
        emit ProseCreated(msg.sender, proseAddress);
        return proseAddress;
    }
}
