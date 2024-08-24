// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Writer} from "./Writer.sol";
import {WriterStorage} from "./WriterStorage.sol";

contract WriterFactory {
    mapping(address => address[]) public authorToWriter;

    event WriterCreated(address indexed writerAddress, address indexed author, address[] writers);

    function create(address[] memory managers) external returns (address) {
        address author = msg.sender;

        WriterStorage store = new WriterStorage();
        Writer writer = new Writer(address(store), author, managers);
        store.setLogic(address(writer));
        store.setNewAdmin(author);

        authorToWriter[author].push(address(writer));
        emit WriterCreated(address(writer), author, managers);
        return address(writer);
    }

    function get(address author) external view returns (address[] memory) {
        return authorToWriter[author];
    }
}
