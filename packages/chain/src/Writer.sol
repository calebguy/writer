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
    bytes32 public constant GRANT_WRITER_ROLE_TYPEHASH = keccak256("GrantWriterRole(uint256 nonce,address account)");
    bytes32 public constant REVOKE_WRITER_ROLE_TYPEHASH = keccak256("RevokeWriterRole(uint256 nonce,address account)");
    bytes32 public constant RENOUNCE_WRITER_ROLE_TYPEHASH = keccak256("RenounceWriterRole(uint256 nonce)");

    string public constant DOMAIN_NAME = "Writer";
    string public constant DOMAIN_VERSION = "1";
    bytes32 public constant WRITER_ROLE = keccak256("WRITER");

    WriterStorage public store;
    mapping(bytes32 => bool) public digestWasExecuted;

    bool public immutable publicWritable;

    string public title;

    modifier onlyAuthorWithRole(uint256 id, bytes32 role) {
        require(store.getEntry(id).author == msg.sender, "Writer: Only author can perform this action");
        require(hasRole(role, msg.sender), "Writer: Author must be a writer");
        _;
    }

    /// @dev Recover the EIP-712 signer for `structHash`, enforce that they
    ///      hold `role`, and consume the digest in `digestWasExecuted` so it
    ///      cannot be replayed. Returns the recovered signer so the caller
    ///      can use it (e.g. as the entry author) without paying for a
    ///      second ECDSA recover.
    function _verifyAndMark(bytes memory signature, bytes32 structHash, bytes32 role)
        internal
        returns (address signer)
    {
        bytes32 digest = _hashTypedData(structHash);
        signer = _recover(digest, signature);
        require(hasRole(role, signer), "Writer: Invalid signer role");
        _validateAndMarkDigest(digest);
    }

    /// @dev Same as `_verifyAndMark` plus an additional check that the
    ///      recovered signer is the author of entry `id`. Used by the
    ///      sig-flavored update / remove / addChunk paths.
    function _verifyAndMarkAuthor(bytes memory signature, bytes32 structHash, uint256 id, bytes32 role)
        internal
        returns (address signer)
    {
        bytes32 digest = _hashTypedData(structHash);
        signer = _recover(digest, signature);
        require(store.getEntry(id).author == signer, "Writer: Signer must be the author");
        require(hasRole(role, signer), "Writer: Signer must be a writer");
        _validateAndMarkDigest(digest);
    }

    function _validateAndMarkDigest(bytes32 digest) internal {
        require(!digestWasExecuted[digest], "Writer: Signature has already been executed");
        digestWasExecuted[digest] = true;
    }

    event StorageSet(address indexed storageAddress);
    event TitleSet(string indexed title);

    constructor(
        string memory newTitle,
        address storageAddress,
        address admin,
        address[] memory writers,
        bool _publicWritable
    ) VerifyTypedData(DOMAIN_NAME, DOMAIN_VERSION) {
        store = WriterStorage(storageAddress);
        title = newTitle;
        publicWritable = _publicWritable;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        uint256 length = writers.length;
        for (uint256 i = 0; i < length; i++) {
            _grantRole(WRITER_ROLE, writers[i]);
        }
        emit StorageSet(storageAddress);
        emit TitleSet(newTitle);
    }

    function hasRole(bytes32 role, address account) public view virtual override returns (bool) {
        if (account == address(0)) {
            return false;
        }
        // if public, let anyone be a writer
        if (publicWritable && role == WRITER_ROLE) {
            return true;
        }
        return super.hasRole(role, account);
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

    function setTitleWithSig(bytes memory signature, uint256 nonce, string calldata newTitle) external {
        bytes32 structHash = keccak256(abi.encode(SET_TITLE_TYPEHASH, nonce, keccak256(abi.encodePacked(newTitle))));
        _verifyAndMark(signature, structHash, DEFAULT_ADMIN_ROLE);
        title = newTitle;
        emit TitleSet(newTitle);
    }

    function grantWriterRoleWithSig(bytes memory signature, uint256 nonce, address account) external {
        require(!publicWritable, "Writer: role grants are no-ops on public writers");
        require(account != address(0), "Writer: cannot grant to zero address");
        bytes32 structHash = keccak256(abi.encode(GRANT_WRITER_ROLE_TYPEHASH, nonce, account));
        _verifyAndMark(signature, structHash, DEFAULT_ADMIN_ROLE);
        _grantRole(WRITER_ROLE, account);
    }

    function revokeWriterRoleWithSig(bytes memory signature, uint256 nonce, address account) external {
        require(!publicWritable, "Writer: role revokes are no-ops on public writers");
        bytes32 structHash = keccak256(abi.encode(REVOKE_WRITER_ROLE_TYPEHASH, nonce, account));
        _verifyAndMark(signature, structHash, DEFAULT_ADMIN_ROLE);
        _revokeRole(WRITER_ROLE, account);
    }

    function renounceWriterRoleWithSig(bytes memory signature, uint256 nonce) external {
        require(!publicWritable, "Writer: role renounce is a no-op on public writers");
        bytes32 structHash = keccak256(abi.encode(RENOUNCE_WRITER_ROLE_TYPEHASH, nonce));
        // _verifyAndMark requires the signer to currently hold WRITER_ROLE.
        // The recovered signer is the wallet that's leaving.
        address signer = _verifyAndMark(signature, structHash, WRITER_ROLE);
        _revokeRole(WRITER_ROLE, signer);
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
        returns (uint256, WriterStorage.Entry memory)
    {
        bytes32 structHash = keccak256(abi.encode(CREATE_TYPEHASH, nonce, chunkCount));
        address signer = _verifyAndMark(signature, structHash, WRITER_ROLE);
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
        returns (uint256, WriterStorage.Entry memory)
    {
        bytes32 structHash =
            keccak256(abi.encode(CREATE_WITH_CHUNK_TYPEHASH, nonce, chunkCount, keccak256(abi.encodePacked(content))));
        address signer = _verifyAndMark(signature, structHash, WRITER_ROLE);
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
        returns (WriterStorage.Entry memory entry)
    {
        bytes32 structHash =
            keccak256(abi.encode(ADD_CHUNK_TYPEHASH, nonce, id, index, keccak256(abi.encodePacked(content))));
        address signer = _verifyAndMarkAuthor(signature, structHash, id, WRITER_ROLE);
        return store.addChunk(id, index, content, signer);
    }

    function remove(uint256 id) external onlyAuthorWithRole(id, WRITER_ROLE) {
        store.remove(id, msg.sender);
    }

    function removeWithSig(bytes memory signature, uint256 nonce, uint256 id) external {
        bytes32 structHash = keccak256(abi.encode(REMOVE_TYPEHASH, nonce, id));
        address signer = _verifyAndMarkAuthor(signature, structHash, id, WRITER_ROLE);
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
    ) external {
        bytes32 structHash = keccak256(
            abi.encode(UPDATE_TYPEHASH, nonce, id, totalChunks, keccak256(abi.encodePacked(content)))
        );
        address signer = _verifyAndMarkAuthor(signature, structHash, id, WRITER_ROLE);
        store.update(id, totalChunks, content, signer);
    }
}
