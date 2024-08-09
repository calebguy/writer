// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Prose} from "./Prose.sol";
import {ProseStorage} from "./ProseStorage.sol";

contract ProseFactory {
    mapping(address => address[]) public creatorToProse;

    event ProseCreated(address indexed prose, address indexed creator, address[] managers);

    function create(address[] memory managers) external returns (address) {
        address creator = msg.sender;

        ProseStorage store = new ProseStorage();
        Prose prose = new Prose(address(store), creator, managers);
        store.setLogic(address(prose));
        store.setNewAdmin(creator);

        creatorToProse[creator].push(address(prose));
        emit ProseCreated(creator, address(prose), managers);
        return address(prose);
    }

    function getCreations(address creator) external view returns (address[] memory) {
        return creatorToProse[creator];
    }
}
