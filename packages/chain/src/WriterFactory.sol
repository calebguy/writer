// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Writer} from "./Writer.sol";
import {WriterStorage} from "./WriterStorage.sol";

contract WriterFactory {
    mapping(address => address[]) internal authorToWriter;

    event WriterCreated(
        address indexed writerAddress, address indexed storeAddress, address indexed author, address[] writers
    );

    function create(address admin, address[] memory managers) external returns (address) {
        WriterStorage store = new WriterStorage();
        Writer writer = new Writer(address(store), admin, managers);
        store.setLogic(address(writer));
        store.setNewAdmin(admin);

        authorToWriter[admin].push(address(writer));
        emit WriterCreated(address(writer), address(store), admin, managers);
        return address(writer);
    }

    function get(address author) external view returns (address[] memory) {
        return authorToWriter[author];
    }
}
