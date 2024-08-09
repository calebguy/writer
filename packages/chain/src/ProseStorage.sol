// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {AccessControl} from "oz/access/AccessControl.sol";
import "forge-std/console.sol";

contract ProseStorage is AccessControl {
    address public logic;

    modifier onlyProseLogic() {
        require(msg.sender == logic, "ProseStorage: Can only be called by logic");
        _;
    }

    constructor() {
        console.log("SENDER", msg.sender);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setLogic(address newLogic) public onlyRole(DEFAULT_ADMIN_ROLE) {
        logic = newLogic;
    }

    uint256 public entryIdCounter;
    uint256[] public entryIds;
    mapping(uint256 => Entry) public entries;
    mapping(uint256 => uint256) public entryIdToIndex;

    struct Entry {
        uint256 createdAtBlock;
        uint256 updatedAtBlock;
        string content;
        bool exists;
        address creator;
    }

    event EntryCreated(uint256 indexed id, string content);
    event EntryUpdated(uint256 indexed id, string content);
    event EntryRemoved(uint256 indexed id);

    function setNewAdmin(address newAdmin) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(DEFAULT_ADMIN_ROLE, newAdmin);
        _revokeRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function create(Entry calldata entry) public onlyProseLogic {
        uint256 id = entryIdCounter;
        entries[id] = entry;
        entryIds.push(id);
        entryIdToIndex[id] = entryIds.length - 1;
        entryIdCounter++;
        emit EntryCreated(id, entry.content);
    }

    function update(uint256 id, Entry calldata entry) public onlyProseLogic {
        require(entries[id].exists, "ProseStorage: Entry does not exist");
        entries[id] = entry;
        emit EntryUpdated(id, entry.content);
    }

    function remove(uint256 id) public onlyProseLogic {
        require(entries[id].exists, "ProseStorage: Entry does not exist");

        uint256 index = entryIdToIndex[id];
        uint256 lastIndex = entryIds[entryIds.length - 1];
        require(index < entryIds.length, "ProseStorage: Index out of bounds");

        delete entries[id];
        delete entryIdToIndex[id];

        if (index != lastIndex) {
            uint256 lastId = entryIds[lastIndex];
            entryIds[index] = lastId;
            entryIdToIndex[lastId] = index;
        }

        entryIds.pop();
        emit EntryRemoved(id);
    }

    function getEntryCount() public view returns (uint256) {
        return entryIds.length;
    }

    function getEntryIds() public view returns (uint256[] memory) {
        return entryIds;
    }

    function getEntry(uint256 id) public view returns (Entry memory) {
        return entries[id];
    }
}
