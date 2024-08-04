// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {AccessControl} from "oz/access/AccessControl.sol";

contract Prose is AccessControl {
    struct Entry {
        uint256 createdAtBlock;
        uint256 updatedAtBlock;
        string content;
        bool exists;
    }

    event EntryCreated(uint256 indexed id, string content);
    event EntryUpdated(uint256 indexed id, string content);
    event EntryRemoved(uint256 indexed id);

    bytes32 MANAGER_ROLE = keccak256("MANAGER");

    uint256 public entryCount;
    uint256[] public entryIds;
    mapping(uint256 => Entry) public entries;

    constructor(address _admin, string memory _firstEntryContent) {
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(MANAGER_ROLE, _admin);
        _create(_firstEntryContent);
    }

    function _create(string memory content) internal {
        entryCount++;
        entries[entryCount] = Entry(block.number, block.number, content, true);
        entryIds.push(entryCount);
        emit EntryCreated(entryCount, content);
    }

    function create(string memory content) public onlyRole(MANAGER_ROLE) {
        _create(content);
    }

    function update(uint256 id, string memory content) public onlyRole(MANAGER_ROLE) {
        require(entries[id].exists, "Entry does not exist");
        entries[id].content = content;
        entries[id].updatedAtBlock = block.number;
        emit EntryUpdated(id, content);
    }

    function remove(uint256 id) public onlyRole(MANAGER_ROLE) {
        require(entries[id].exists, "Entry does not exist");
        delete entries[id];
        for (uint256 i = 0; i < entryIds.length; i++) {
            if (entryIds[i] == id) {
                entryIds[i] = entryIds[entryIds.length - 1];
                entryIds.pop();
                break;
            }
        }
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
