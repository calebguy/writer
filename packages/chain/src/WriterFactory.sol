// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Writer} from "./Writer.sol";
import {WriterStorage} from "./WriterStorage.sol";

contract WriterFactory {
    event WriterCreated(
        address indexed writerAddress,
        address indexed storeAddress,
        address indexed admin,
        string title,
        address[] managers
    );

    function create(string calldata title, address admin, address[] memory managers) external returns (address) {
        WriterStorage store = new WriterStorage();
        Writer writer = new Writer(title, address(store), admin, managers);
        store.setLogic(address(writer));
        store.replaceAdmin(admin);

        emit WriterCreated(address(writer), address(store), admin, title, managers);
        return address(writer);
    }
}
