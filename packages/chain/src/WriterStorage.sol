// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {AccessControl} from "oz/access/AccessControl.sol";

// @note commit reveal may be used for private messages
// https://www.gitcoin.co/blog/commit-reveal-scheme-on-ethereum

contract WriterStorage is AccessControl {
    address public logic;

    modifier onlyLogic() {
        require(msg.sender == logic, "WriterStorage: Can only be called by logic");
        _;
    }

    event LogicSet(address indexed logicAddress);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setLogic(address newLogic) public onlyRole(DEFAULT_ADMIN_ROLE) {
        logic = newLogic;
        emit LogicSet(newLogic);
    }

    // current ID for the entry
    uint256 public entryIdCounter;

    // array of current entry IDs (so we can query them)
    uint256[] public entryIds;

    // mapping of entry ID to entry data
    mapping(uint256 => Entry) public entries;

    // mapping of entry ID to index in entryIds array
    mapping(uint256 => uint256) public entryIdToEntryIdsIndex;

    struct Entry {
        uint256 createdAtBlock;
        uint256 updatedAtBlock;
        string[] chunks;
        uint256 totalChunks;
        uint256 receivedChunks;
        bool exists;
    }

    event EntryCreated(uint256 indexed id, address author);
    event EntryUpdated(uint256 indexed id, address author);
    event EntryRemoved(uint256 indexed id, address author);
    event EntryCompleted(uint256 indexed id, address author);

    event ChunkReceived(address indexed author, uint256 indexed id, uint256 indexed index, string content);

    function replaceAdmin(address newAdmin) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(DEFAULT_ADMIN_ROLE, newAdmin);
        _revokeRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function create(uint256 totalChunks, address author) public onlyLogic returns (uint256, Entry memory) {
        return _create(totalChunks, author);
    }

    function createWithChunk(uint256 totalChunks, string calldata content, address author)
        public
        onlyLogic
        returns (uint256, Entry memory)
    {
        require(totalChunks > 0, "WriterStorage: Total chunks must be greater than 0");
        require(bytes(content).length > 0, "WriterStorage: Chunk content cannot be empty");

        (uint256 id,) = _create(totalChunks, author);
        Entry memory updatedEntry = _addChunk(id, 0, content, author);
        return (id, updatedEntry);
    }

    function remove(uint256 id, address author) public onlyLogic {
        require(entries[id].exists, "WriterStorage: Entry does not exist");

        uint256 index = entryIdToEntryIdsIndex[id];
        uint256 lastIndex = entryIds[entryIds.length - 1];
        require(index < entryIds.length, "WriterStorage: Index out of bounds");

        delete entries[id];
        delete entryIdToEntryIdsIndex[id];

        if (index != lastIndex) {
            uint256 lastId = entryIds[lastIndex];
            entryIds[index] = lastId;
            entryIdToEntryIdsIndex[lastId] = index;
        }

        entryIds.pop();
        emit EntryRemoved(id, author);
    }

    function addChunk(uint256 id, uint256 index, string calldata content, address author) public onlyLogic {
        require(bytes(getEntry(id).chunks[index]).length == 0, "WriterStorage: Chunk already exists");

        _addChunk(id, index, content, author);
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

    function getEntryTotalChunks(uint256 id) public view returns (uint256) {
        return entries[id].totalChunks;
    }

    function getEntryContent(uint256 id) external view returns (string memory) {
        WriterStorage.Entry memory entry = this.getEntry(id);
        string memory content = "";
        uint256 length = entry.chunks.length;
        for (uint256 i = 0; i < length; i++) {
            string memory chunk = entry.chunks[i];
            if (i == 0) {
                content = chunk;
            } else {
                content = string(abi.encodePacked(content, " ", chunk));
            }
        }
        return content;
    }

    function _create(uint256 totalChunks, address author) internal returns (uint256, Entry memory) {
        uint256 id = entryIdCounter;
        entries[id] = Entry({
            createdAtBlock: block.number,
            updatedAtBlock: block.number,
            chunks: new string[](totalChunks),
            totalChunks: totalChunks,
            receivedChunks: 0,
            exists: true
        });
        entryIds.push(id);
        entryIdToEntryIdsIndex[id] = entryIds.length - 1;
        entryIdCounter++;
        emit EntryCreated(id, author);
        return (id, entries[id]);
    }

    function _addChunk(uint256 id, uint256 index, string calldata content, address author)
        internal
        returns (Entry storage)
    {
        Entry storage entry = entries[id];
        require(entry.exists, "WriterStorage: Entry does not exist");
        require(index < entry.totalChunks, "WriterStorage: Invalid chunk index");

        entry.chunks[index] = content;
        entry.updatedAtBlock = block.number;
        entry.receivedChunks++;

        emit ChunkReceived(author, id, index, content);

        if (entry.receivedChunks == entry.totalChunks) {
            emit EntryCompleted(id, author);
        } else {
            emit EntryUpdated(id, author);
        }

        return entry;
    }
}
