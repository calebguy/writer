// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {AccessControl} from "oz/access/AccessControl.sol";
import {VerifyTypedData} from "./VerifyTypedData.sol";
import {WriterStorage} from "./WriterStorage.sol";

contract Writer is AccessControl, VerifyTypedData {
    bytes32 public constant CREATE_TYPEHASH = keccak256("Create(uint256 nonce,uint256 chunkCount)");
    bytes32 public constant CREATE_WITH_CHUNK_TYPEHASH =
        keccak256("CreateWithChunk(uint256 nonce,uint256 chunkCount,string chunkContent)");
    // @note TODO sync entryId & id in typehashes here
    bytes32 public constant REMOVE_TYPEHASH = keccak256("Remove(uint256 nonce,uint256 id)");
    bytes32 public constant ADD_CHUNK_TYPEHASH =
        keccak256("AddChunk(uint256 nonce,uint256 entryId,uint256 chunkIndex,string chunkContent)");
    bytes32 public constant UPDATE_TYPEHASH =
        keccak256("Update(uint256 nonce,uint256 entryId,uint256 totalChunks,string content)");
    bytes32 public constant SET_TITLE_TYPEHASH = keccak256("SetTitle(uint256 nonce,string title)");

    bytes public DOMAIN_NAME = "Writer";
    bytes public DOMAIN_VERSION = "1";
    bytes32 public WRITER_ROLE = keccak256("WRITER");

    WriterStorage public store;
    mapping(bytes32 => bool) public signatureWasExecuted;

    string public title;

    modifier signedByWithRole(bytes memory signature, bytes32 structHash, bytes32 role) {
        address signer = getSigner(signature, structHash);
        require(hasRole(role, signer), "Writer: Invalid signer role");
        _validateAndMarkSignature(signature);
        _;
    }

    modifier signedByAuthorWithRole(bytes memory signature, bytes32 structHash, uint256 id, bytes32 role) {
        address signer = getSigner(signature, structHash);
        require(store.getEntry(id).author == signer, "Writer: Signer must be the author");
        require(hasRole(role, signer), "Writer: Signer must be a writer");
        _validateAndMarkSignature(signature);
        _;
    }

    modifier onlyAuthorWithRole(uint256 id, bytes32 role) {
        require(store.getEntry(id).author == msg.sender, "Writer: Only author can perform this action");
        require(hasRole(role, msg.sender), "Writer: Author must be a writer");
        _;
    }

    function _validateAndMarkSignature(bytes memory signature) internal {
        bytes32 signatureHash = keccak256(signature);
        require(!signatureWasExecuted[signatureHash], "Writer: Signature has already been executed");
        signatureWasExecuted[signatureHash] = true;
    }

    event StorageSet(address indexed storageAddress);
    event TitleSet(string indexed title);

    constructor(string memory newTitle, address storageAddress, address admin, address[] memory writers)
        VerifyTypedData(DOMAIN_NAME, DOMAIN_VERSION)
    {
        store = WriterStorage(storageAddress);
        title = newTitle;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        uint256 length = writers.length;
        for (uint256 i = 0; i < length; i++) {
            _grantRole(WRITER_ROLE, writers[i]);
        }
        emit StorageSet(storageAddress);
        emit TitleSet(newTitle);
    }

    function replaceAdmin(address newAdmin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(DEFAULT_ADMIN_ROLE, newAdmin);
        _revokeRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setStorage(address storageAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        store = WriterStorage(storageAddress);
        emit StorageSet(storageAddress);
    }

    function setTitle(string calldata newTitle) external onlyRole(DEFAULT_ADMIN_ROLE) {
        title = newTitle;
        emit TitleSet(newTitle);
    }

    function setTitleWithSig(bytes memory signature, uint256 nonce, string calldata newTitle)
        external
        signedByWithRole(
            signature,
            keccak256(abi.encode(SET_TITLE_TYPEHASH, nonce, keccak256(abi.encodePacked(newTitle)))),
            DEFAULT_ADMIN_ROLE
        )
    {
        title = newTitle;
        emit TitleSet(newTitle);
    }

    function getEntryCount() external view returns (uint256) {
        return store.getEntryCount();
    }

    function getEntryIds() external view returns (uint256[] memory) {
        return store.getEntryIds();
    }

    function getEntry(uint256 id) external view returns (WriterStorage.Entry memory) {
        return store.getEntry(id);
    }

    function getEntryContent(uint256 id) external view returns (string memory) {
        return store.getEntryContent(id);
    }

    function getEntryChunk(uint256 id, uint256 index) external view returns (string memory) {
        return store.getEntry(id).chunks[index];
    }

    function getEntryTotalChunks(uint256 id) external view returns (uint256) {
        return store.getEntryTotalChunks(id);
    }

    function create(uint256 chunkCount)
        external
        onlyRole(WRITER_ROLE)
        returns (uint256 entryId, WriterStorage.Entry memory entry)
    {
        return store.create(chunkCount, msg.sender);
    }

    function createWithSig(bytes memory signature, uint256 nonce, uint256 chunkCount)
        external
        signedByWithRole(signature, keccak256(abi.encode(CREATE_TYPEHASH, nonce, chunkCount)), WRITER_ROLE)
        returns (uint256, WriterStorage.Entry memory)
    {
        address signer = getSigner(signature, keccak256(abi.encode(CREATE_TYPEHASH, nonce, chunkCount)));
        return store.create(chunkCount, signer);
    }

    function createWithChunk(uint256 chunkCount, string calldata content)
        external
        onlyRole(WRITER_ROLE)
        returns (uint256 entryId, WriterStorage.Entry memory entry)
    {
        return store.createWithChunk(chunkCount, content, msg.sender);
    }

    function createWithChunkWithSig(bytes memory signature, uint256 nonce, uint256 chunkCount, string calldata content)
        external
        signedByWithRole(
            signature,
            keccak256(abi.encode(CREATE_WITH_CHUNK_TYPEHASH, nonce, chunkCount, keccak256(abi.encodePacked(content)))),
            WRITER_ROLE
        )
        returns (uint256, WriterStorage.Entry memory)
    {
        address signer = getSigner(
            signature,
            keccak256(abi.encode(CREATE_WITH_CHUNK_TYPEHASH, nonce, chunkCount, keccak256(abi.encodePacked(content))))
        );
        return store.createWithChunk(chunkCount, content, signer);
    }

    function addChunk(uint256 id, uint256 index, string calldata content)
        external
        onlyAuthorWithRole(id, WRITER_ROLE)
        returns (WriterStorage.Entry memory entry)
    {
        return store.addChunk(id, index, content, msg.sender);
    }

    function addChunkWithSig(bytes memory signature, uint256 nonce, uint256 id, uint256 index, string calldata content)
        external
        signedByAuthorWithRole(
            signature,
            keccak256(abi.encode(ADD_CHUNK_TYPEHASH, nonce, id, index, keccak256(abi.encodePacked(content)))),
            id,
            WRITER_ROLE
        )
        returns (WriterStorage.Entry memory entry)
    {
        address signer = getSigner(
            signature, keccak256(abi.encode(ADD_CHUNK_TYPEHASH, nonce, id, index, keccak256(abi.encodePacked(content))))
        );
        return store.addChunk(id, index, content, signer);
    }

    function remove(uint256 id) external onlyAuthorWithRole(id, WRITER_ROLE) {
        store.remove(id, msg.sender);
    }

    function removeWithSig(bytes memory signature, uint256 nonce, uint256 id)
        external
        signedByAuthorWithRole(signature, keccak256(abi.encode(REMOVE_TYPEHASH, nonce, id)), id, WRITER_ROLE)
    {
        address signer = getSigner(signature, keccak256(abi.encode(REMOVE_TYPEHASH, nonce, id)));
        store.remove(id, signer);
    }

    function update(uint256 id, uint256 totalChunks, string calldata content)
        external
        onlyAuthorWithRole(id, WRITER_ROLE)
        returns (WriterStorage.Entry memory entry)
    {
        return store.update(id, totalChunks, content, msg.sender);
    }

    function updateWithSig(
        bytes memory signature,
        uint256 nonce,
        uint256 id,
        uint256 totalChunks,
        string calldata content
    )
        external
        signedByAuthorWithRole(
            signature,
            keccak256(abi.encode(UPDATE_TYPEHASH, nonce, id, totalChunks, keccak256(abi.encodePacked(content)))),
            id,
            WRITER_ROLE
        )
    {
        address signer = getSigner(
            signature,
            keccak256(abi.encode(UPDATE_TYPEHASH, nonce, id, totalChunks, keccak256(abi.encodePacked(content))))
        );
        store.update(id, totalChunks, content, signer);
    }
}
