// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Writer} from "./Writer.sol";
import {WriterStorage} from "./WriterStorage.sol";

contract WriterFactory {
    // current ID for the entry
    uint256 public writerIdCounter;

    mapping(address => address[]) internal adminToManagers;

    event WriterCreated(
        uint256 indexed id,
        address indexed writerAddress,
        address indexed admin,
        string title,
        address storeAddress,
        address[] managers
    );

    function create(string calldata title, address admin, address[] memory managers) external returns (address) {
        WriterStorage store = new WriterStorage();
        Writer writer = new Writer(title, address(store), admin, managers);
        store.setLogic(address(writer));
        store.setNewAdmin(admin);

        adminToManagers[admin].push(address(writer));
        writerIdCounter++;
        emit WriterCreated(writerIdCounter, address(writer), admin, title, address(store), managers);
        return address(writer);
    }

    function get(address author) external view returns (address[] memory) {
        return adminToManagers[author];
    }
}
