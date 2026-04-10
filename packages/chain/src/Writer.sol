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
    bytes32 public constant GRANT_WRITER_ROLE_TYPEHASH =
        keccak256("GrantWriterRole(uint256 nonce,address account)");
    bytes32 public constant REVOKE_WRITER_ROLE_TYPEHASH =
        keccak256("RevokeWriterRole(uint256 nonce,address account)");
    bytes32 public constant RENOUNCE_WRITER_ROLE_TYPEHASH =
        keccak256("RenounceWriterRole(uint256 nonce)");

    string public constant DOMAIN_NAME = "Writer";
    string public constant DOMAIN_VERSION = "1";
    bytes32 public constant WRITER_ROLE = keccak256("WRITER");

    WriterStorage public store;
    /// @notice Tracks which EIP-712 digests have already been executed.
    ///         Keyed off the digest (not the raw signature bytes) so that
    ///         malleated signatures `(r, n - s, v')` cannot bypass replay
    ///         protection — both byte representations of a malleable
    ///         signature resolve to the same digest.
    mapping(bytes32 => bool) public digestWasExecuted;

    /// @notice If true, anyone can author entries on this Writer (the
    ///         WRITER_ROLE check is implicitly satisfied for every non-zero
    ///         address). Authors are still tracked per-entry, and only the
    ///         original author can edit or remove their own entries.
    /// @dev    Set at construction and never changed afterwards. A Writer
    ///         is either a private journal/blog (publicWritable=false,
    ///         requires WRITER_ROLE) or a public message board
    ///         (publicWritable=true, anyone can write). The choice is
    ///         immutable so existing authors on a public board can never
    ///         have their write access revoked.
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
        // Even on public writers we still grant WRITER_ROLE to the initial
        // managers list — the role becomes effectively meaningless for
        // create/addChunk on a public writer (everyone passes the role
        // check via the hasRole override below) but stays as a "founding
        // team" concept for off-chain UI / future features.
        uint256 length = writers.length;
        for (uint256 i = 0; i < length; i++) {
            _grantRole(WRITER_ROLE, writers[i]);
        }
        emit StorageSet(storageAddress);
        emit TitleSet(newTitle);
    }

    /// @notice Override OZ AccessControl's hasRole with two changes:
    ///   1. address(0) can never hold any role, even if `_grantRole` was
    ///      somehow called for it. This is defense-in-depth so a malformed
    ///      signature that recovers to address(0) cannot pass any role
    ///      check, including the implicit "everyone has WRITER_ROLE" rule
    ///      for public writers.
    ///   2. On public writers (`publicWritable == true`), every non-zero
    ///      address implicitly holds WRITER_ROLE. This is what makes the
    ///      contract behave as a public message board: anyone can author
    ///      entries, while the per-entry author check (enforced by
    ///      `_verifyAndMarkAuthor` and `onlyAuthorWithRole`) still
    ///      restricts edits / removals to the original author.
    /// @dev   Only WRITER_ROLE is granted publicly. DEFAULT_ADMIN_ROLE
    ///       (used by setTitle, setStorage, replaceAdmin, etc.) is NOT
    ///       affected, so admin operations remain locked to the actual
    ///       admin even on public writers.
    function hasRole(bytes32 role, address account)
        public
        view
        virtual
        override
        returns (bool)
    {
        if (account == address(0)) {
            return false;
        }
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
        bytes32 structHash =
            keccak256(abi.encode(SET_TITLE_TYPEHASH, nonce, keccak256(abi.encodePacked(newTitle))));
        _verifyAndMark(signature, structHash, DEFAULT_ADMIN_ROLE);
        title = newTitle;
        emit TitleSet(newTitle);
    }

    // -------------------------------------------------------------------------
    // Role management via signature (gasless admin operations)
    //
    // These three functions let the writer admin (and individual writers, in
    // the case of renounce) manage WRITER_ROLE membership without needing a
    // funded wallet. The signed payload is relayed via the same Privy/relay
    // path as content writes.
    //
    // Scope is intentionally narrow: only WRITER_ROLE can be granted /
    // revoked / renounced this way. DEFAULT_ADMIN_ROLE management is NOT
    // exposed via signature — admin transfers must happen via the direct
    // `replaceAdmin` call from a funded wallet, so they're slow and
    // deliberate enough to not be typo'd.
    //
    // All three revert on `publicWritable == true` writers because every
    // address implicitly holds WRITER_ROLE on a public writer (via the
    // hasRole override). Granting / revoking the underlying storage slot
    // would have no effect on the actual access check, which is exactly
    // the kind of silent confusion that produces footguns.
    // -------------------------------------------------------------------------

    /// @notice Admin grants WRITER_ROLE to `account`. Signed by an account
    ///         that holds DEFAULT_ADMIN_ROLE.
    function grantWriterRoleWithSig(bytes memory signature, uint256 nonce, address account) external {
        require(!publicWritable, "Writer: role grants are no-ops on public writers");
        require(account != address(0), "Writer: cannot grant to zero address");
        bytes32 structHash = keccak256(abi.encode(GRANT_WRITER_ROLE_TYPEHASH, nonce, account));
        _verifyAndMark(signature, structHash, DEFAULT_ADMIN_ROLE);
        _grantRole(WRITER_ROLE, account);
    }

    /// @notice Admin revokes WRITER_ROLE from `account`. Signed by an
    ///         account that holds DEFAULT_ADMIN_ROLE.
    function revokeWriterRoleWithSig(bytes memory signature, uint256 nonce, address account) external {
        require(!publicWritable, "Writer: role revokes are no-ops on public writers");
        bytes32 structHash = keccak256(abi.encode(REVOKE_WRITER_ROLE_TYPEHASH, nonce, account));
        _verifyAndMark(signature, structHash, DEFAULT_ADMIN_ROLE);
        _revokeRole(WRITER_ROLE, account);
    }

    /// @notice Voluntary self-revocation. Signer renounces their own
    ///         WRITER_ROLE. Useful for "I'm done contributing to this
    ///         shared writer, take me off the list" without needing the
    ///         admin to revoke them.
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
        bytes32 structHash =
            keccak256(abi.encode(UPDATE_TYPEHASH, nonce, id, totalChunks, keccak256(abi.encodePacked(content))));
        address signer = _verifyAndMarkAuthor(signature, structHash, id, WRITER_ROLE);
        store.update(id, totalChunks, content, signer);
    }
}
