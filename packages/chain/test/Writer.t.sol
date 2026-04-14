// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console, Vm} from "forge-std/Test.sol";
import {Writer} from "../src/Writer.sol";
import {WriterStorage} from "../src/WriterStorage.sol";

import "forge-std/console.sol";

contract TestBase is Test {
    function entryEq(WriterStorage.Entry memory entry, WriterStorage.Entry memory expectedEntry) internal pure {
        assertEq(entry.createdAtBlock, expectedEntry.createdAtBlock);
        assertEq(entry.updatedAtBlock, expectedEntry.updatedAtBlock);
        assertEq(entry.totalChunks, expectedEntry.totalChunks);
        assertEq(entry.receivedChunks, expectedEntry.receivedChunks);
        assertEq(entry.chunks.length, expectedEntry.chunks.length);
        for (uint256 i = 0; i < entry.chunks.length; i++) {
            assertEq(entry.chunks[i], expectedEntry.chunks[i]);
        }
    }
}

contract WriterDirectCallerTest is TestBase {
    WriterStorage public store;
    Writer public writer;
    address user = address(0x1);

    function setUp() public {
        address[] memory writers = new address[](1);
        writers[0] = user;

        store = new WriterStorage();
        writer = new Writer("Notes for today", address(store), user, writers, false);
        store.setLogic(address(writer));
    }

    function test_Create() public {
        vm.prank(user);
        uint256 currentBlock = block.number;

        vm.expectEmit();
        emit WriterStorage.EntryCreated(0, user);

        writer.create(2);
        assertEq(writer.getEntryCount(), 1);
        assertEq(writer.getEntryIds().length, 1);

        WriterStorage.Entry memory entry = writer.getEntry(0);
        WriterStorage.Entry memory expectedEntry = WriterStorage.Entry({
            createdAtBlock: currentBlock,
            updatedAtBlock: currentBlock,
            totalChunks: 2,
            receivedChunks: 0,
            chunks: new string[](2),
            author: user
        });
        entryEq(entry, expectedEntry);

        uint256[] memory expectedEntryIds = new uint256[](1);
        expectedEntryIds[0] = 0;
        assertEq(writer.getEntryIds(), expectedEntryIds);
    }

    function test_CreateWithChunk() public {
        vm.prank(user);
        uint256 currentBlock = block.number;

        vm.expectEmit();
        emit WriterStorage.EntryCreated(0, user);

        uint256 totalChunks = 1;

        string memory chunkContent = "Hello";
        writer.createWithChunk(totalChunks, chunkContent);
        assertEq(writer.getEntryCount(), 1);
        assertEq(writer.getEntryIds().length, 1);

        string[] memory expectedChunks = new string[](1);
        expectedChunks[0] = chunkContent;

        WriterStorage.Entry memory entry = writer.getEntry(0);
        WriterStorage.Entry memory expectedEntry = WriterStorage.Entry({
            createdAtBlock: currentBlock,
            updatedAtBlock: currentBlock,
            totalChunks: totalChunks,
            receivedChunks: totalChunks,
            chunks: expectedChunks,
            author: user
        });

        entryEq(entry, expectedEntry);

        uint256[] memory expectedEntryIds = new uint256[](1);
        expectedEntryIds[0] = 0;
        assertEq(writer.getEntryIds(), expectedEntryIds);
    }

    function test_CreateAndAddChunks() public {
        vm.startPrank(user);
        uint256 size = 2;
        writer.create(size);

        vm.expectEmit();
        emit WriterStorage.ChunkReceived(user, 0, 0, "Hello");
        writer.addChunk(0, 0, "Hello");

        vm.expectEmit();
        emit WriterStorage.EntryCompleted(0, user);
        emit WriterStorage.ChunkReceived(user, 0, 0, "World");
        writer.addChunk(0, 1, "World");
        vm.stopPrank();

        WriterStorage.Entry memory entry = writer.getEntry(0);
        string[] memory expectedChunks = new string[](2);
        expectedChunks[0] = "Hello";
        expectedChunks[1] = "World";
        WriterStorage.Entry memory expectedEntry = WriterStorage.Entry({
            createdAtBlock: block.number,
            updatedAtBlock: block.number,
            totalChunks: size,
            receivedChunks: size,
            chunks: expectedChunks,
            author: user
        });
        entryEq(entry, expectedEntry);

        string memory content = writer.getEntryContent(0);
        assertEq(content, "Hello World");
    }

    function test_MaxBytesPerChunkBeforeGasLimit() public {
        uint256 maxBytes = 0;
        uint256 step = 32; // Start with a reasonable step size
        bool reachedGasLimit = false;

        vm.startPrank(user);

        writer.create(1);
        while (!reachedGasLimit) {
            string memory chunkContent = new string(maxBytes + step);
            try writer.addChunk(0, 0, chunkContent) {
                maxBytes += step;
            } catch (bytes memory reason) {
                console.logBytes(reason);
                reachedGasLimit = true;
            }
        }
        vm.stopPrank();

        emit log_named_uint("Maximum chunk size before gas limit", maxBytes);
    }

    function test_Remove() public {
        vm.startPrank(user);
        writer.create(2);
        writer.addChunk(0, 0, "Hello");
        writer.addChunk(0, 1, "World");

        uint256 entryId = 0;

        vm.expectEmit();
        emit WriterStorage.EntryRemoved(entryId, user);
        writer.remove(entryId);
        vm.stopPrank();

        WriterStorage.Entry memory entry = writer.getEntry(entryId);
        WriterStorage.Entry memory expectedEntry = WriterStorage.Entry({
            createdAtBlock: 0,
            updatedAtBlock: 0,
            totalChunks: 0,
            receivedChunks: 0,
            chunks: new string[](0),
            author: user
        });
        entryEq(entry, expectedEntry);

        uint256[] memory expectedEntryIds = new uint256[](0);
        assertEq(writer.getEntryIds(), expectedEntryIds);
    }

    function test_Update() public {
        vm.startPrank(user);
        writer.create(2);
        writer.addChunk(0, 0, "Hello");
        writer.addChunk(0, 1, "World");

        uint256 entryId = 0;

        vm.expectEmit();
        emit WriterStorage.ChunkReceived(user, entryId, 0, "Hello World");
        emit WriterStorage.EntryUpdated(entryId, user);
        writer.update(entryId, 2, "Hello World");
        vm.stopPrank();

        WriterStorage.Entry memory entry = writer.getEntry(entryId);
        string[] memory expectedChunks = new string[](2);
        expectedChunks[0] = "Hello World";
        WriterStorage.Entry memory expectedEntry = WriterStorage.Entry({
            createdAtBlock: block.number,
            updatedAtBlock: block.number,
            totalChunks: 2,
            receivedChunks: 1,
            chunks: expectedChunks,
            author: user
        });
        entryEq(entry, expectedEntry);
    }

    function test_SetNewAuthorizedWriter() public {
        address newUser = makeAddr("newUser");
        bytes32 writerRole = writer.WRITER_ROLE();
        vm.prank(user);
        writer.grantRole(writerRole, newUser);

        assertEq(writer.hasRole(writer.WRITER_ROLE(), newUser), true);

        vm.expectEmit();
        emit WriterStorage.EntryCreated(0, newUser);

        vm.prank(newUser);
        writer.create(1);
    }

    function test_SetNewWriterStorage() public {
        WriterStorage newStore = new WriterStorage();
        vm.prank(user);
        writer.setStorage(address(newStore));

        assertEq(address(writer.store()), address(newStore));
    }
}

contract WriterWithSigTest is TestBase {
    Vm.Wallet public user;
    uint256 internal userPrivateKey;

    Writer public writer;
    WriterStorage public store;

    function setUp() public {
        // set signer private key
        userPrivateKey = uint256(keccak256(abi.encodePacked("USER_PRIVATE_KEY")));
        user = vm.createWallet(userPrivateKey);
        address[] memory managers = new address[](1);
        managers[0] = user.addr;
        store = new WriterStorage();
        writer = new Writer("Notes for today", address(store), user.addr, managers, false);
        store.setLogic(address(writer));
    }

    function test_CreateWithSig() public {
        uint256 nonce = 0;
        uint256 chunkCount = 3;
        bytes memory signature =
            _sign(userPrivateKey, address(writer), keccak256(abi.encode(writer.CREATE_TYPEHASH(), nonce, chunkCount)));

        vm.expectEmit();
        emit WriterStorage.EntryCreated(0, user.addr);

        writer.createWithSig(signature, nonce, chunkCount);
        assertEq(writer.getEntryCount(), 1);
    }

    function test_CreateWithSigThenAndAddChunksWithSig() public {
        uint256 nonce = 0;
        uint256 size = 2;
        uint256 entryId = 0;
        bytes memory signature =
            _sign(userPrivateKey, address(writer), keccak256(abi.encode(writer.CREATE_TYPEHASH(), nonce, size)));

        vm.expectEmit();
        emit WriterStorage.EntryCreated(entryId, user.addr);
        writer.createWithSig(signature, nonce, size);

        string memory content1 = "Hello";
        uint256 chunkIndex1 = 0;
        signature = _sign(
            userPrivateKey,
            address(writer),
            keccak256(
                abi.encode(
                    writer.ADD_CHUNK_TYPEHASH(), nonce, entryId, chunkIndex1, keccak256(abi.encodePacked(content1))
                )
            )
        );

        vm.expectEmit();
        emit WriterStorage.ChunkReceived(user.addr, entryId, chunkIndex1, content1);
        emit WriterStorage.EntryUpdated(entryId, user.addr);
        writer.addChunkWithSig(signature, nonce, entryId, chunkIndex1, content1);

        string memory content2 = "World";
        uint256 chunkIndex2 = 1;
        signature = _sign(
            userPrivateKey,
            address(writer),
            keccak256(
                abi.encode(
                    writer.ADD_CHUNK_TYPEHASH(), nonce, entryId, chunkIndex2, keccak256(abi.encodePacked(content2))
                )
            )
        );

        vm.expectEmit();
        emit WriterStorage.ChunkReceived(user.addr, entryId, chunkIndex2, content2);
        emit WriterStorage.EntryCompleted(entryId, user.addr);
        writer.addChunkWithSig(signature, nonce, entryId, chunkIndex2, content2);

        WriterStorage.Entry memory entry = writer.getEntry(0);
        string[] memory expectedChunks = new string[](2);
        expectedChunks[0] = content1;
        expectedChunks[1] = content2;
        WriterStorage.Entry memory expectedEntry = WriterStorage.Entry({
            createdAtBlock: block.number,
            updatedAtBlock: block.number,
            totalChunks: size,
            receivedChunks: size,
            chunks: expectedChunks,
            author: user.addr
        });
        entryEq(entry, expectedEntry);
    }

    function test_CreateWithChunkWithSig() public {
        uint256 nonce = 0;
        uint256 chunkCount = 1;
        string memory chunkContent = "Hello";
        bytes memory signature = _sign(
            userPrivateKey,
            address(writer),
            keccak256(
                abi.encode(
                    writer.CREATE_WITH_CHUNK_TYPEHASH(), nonce, chunkCount, keccak256(abi.encodePacked(chunkContent))
                )
            )
        );

        vm.expectEmit();
        emit WriterStorage.EntryCreated(0, user.addr);
        emit WriterStorage.ChunkReceived(user.addr, 0, 0, chunkContent);
        writer.createWithChunkWithSig(signature, nonce, chunkCount, chunkContent);

        WriterStorage.Entry memory entry = writer.getEntry(0);
        string[] memory expectedChunks = new string[](1);
        expectedChunks[0] = chunkContent;
        WriterStorage.Entry memory expectedEntry = WriterStorage.Entry({
            createdAtBlock: block.number,
            updatedAtBlock: block.number,
            totalChunks: chunkCount,
            receivedChunks: chunkCount,
            chunks: expectedChunks,
            author: user.addr
        });
        entryEq(entry, expectedEntry);
    }

    function test_RemoveWithSig() public {
        uint256 nonce = 0;
        uint256 size = 2;
        uint256 entryId = 0;
        bytes memory signature =
            _sign(userPrivateKey, address(writer), keccak256(abi.encode(writer.CREATE_TYPEHASH(), nonce, size)));

        vm.expectEmit();
        emit WriterStorage.EntryCreated(entryId, user.addr);
        writer.createWithSig(signature, nonce, size);

        string memory content1 = "Hello";
        uint256 chunkIndex1 = 0;
        signature = _sign(
            userPrivateKey,
            address(writer),
            keccak256(
                abi.encode(
                    writer.ADD_CHUNK_TYPEHASH(), nonce, entryId, chunkIndex1, keccak256(abi.encodePacked(content1))
                )
            )
        );

        vm.expectEmit();
        emit WriterStorage.ChunkReceived(user.addr, entryId, chunkIndex1, content1);
        emit WriterStorage.EntryUpdated(entryId, user.addr);
        writer.addChunkWithSig(signature, nonce, entryId, chunkIndex1, content1);

        string memory content2 = "World";
        uint256 chunkIndex2 = 1;
        signature = _sign(
            userPrivateKey,
            address(writer),
            keccak256(
                abi.encode(
                    writer.ADD_CHUNK_TYPEHASH(), nonce, entryId, chunkIndex2, keccak256(abi.encodePacked(content2))
                )
            )
        );

        vm.expectEmit();
        emit WriterStorage.ChunkReceived(user.addr, entryId, chunkIndex2, content2);
        emit WriterStorage.EntryCompleted(entryId, user.addr);
        writer.addChunkWithSig(signature, nonce, entryId, chunkIndex2, content2);

        signature =
            _sign(userPrivateKey, address(writer), keccak256(abi.encode(writer.REMOVE_TYPEHASH(), nonce, entryId)));
        vm.expectEmit();
        emit WriterStorage.EntryRemoved(entryId, user.addr);
        writer.removeWithSig(signature, nonce, entryId);

        WriterStorage.Entry memory entry = writer.getEntry(entryId);
        WriterStorage.Entry memory expectedEntry = WriterStorage.Entry({
            createdAtBlock: 0,
            updatedAtBlock: 0,
            totalChunks: 0,
            receivedChunks: 0,
            chunks: new string[](0),
            author: user.addr
        });
        entryEq(entry, expectedEntry);
    }

    function test_MaxBytesPerChunk() public {
        uint256 nonce = 0;
        uint256 chunkCount = 1;
        string memory chunkContent = "Hello";
        bytes memory signature = _sign(
            userPrivateKey,
            address(writer),
            keccak256(
                abi.encode(
                    writer.CREATE_WITH_CHUNK_TYPEHASH(), nonce, chunkCount, keccak256(abi.encodePacked(chunkContent))
                )
            )
        );

        vm.expectEmit();
        emit WriterStorage.EntryCreated(0, user.addr);
        writer.createWithChunkWithSig(signature, nonce, chunkCount, chunkContent);
    }

    function _sign(uint256 signerPrivateKey, address verifyingContract, bytes32 hashStruct)
        internal
        view
        returns (bytes memory)
    {
        // Domain intentionally omits chainId — see VerifyTypedData.sol for the
        // chain-portable signature design.
        bytes32 DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,address verifyingContract)"),
                keccak256(abi.encodePacked(writer.DOMAIN_NAME())),
                keccak256(abi.encodePacked(writer.DOMAIN_VERSION())),
                verifyingContract
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, hashStruct));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, digest);
        return abi.encodePacked(r, s, v);
    }
}

// -----------------------------------------------------------------------------
// WriterPublicTest — exercises the publicWritable=true path
//
// On a public writer:
//   - any non-zero address can call create*/createWithChunk* directly
//   - any non-zero address's signature is accepted by *WithSig paths
//   - the per-entry author check is still enforced (only the original
//     author can update or remove their entry)
//   - admin operations remain locked to DEFAULT_ADMIN_ROLE
// -----------------------------------------------------------------------------
contract WriterPublicTest is TestBase {
    Writer public writer;
    WriterStorage public store;

    Vm.Wallet public alice;
    uint256 internal alicePrivateKey;
    Vm.Wallet public bob;
    uint256 internal bobPrivateKey;
    address public admin = makeAddr("admin");
    address public stranger = makeAddr("stranger");

    function setUp() public {
        alicePrivateKey = uint256(keccak256(abi.encodePacked("PUBLIC_ALICE_KEY")));
        alice = vm.createWallet(alicePrivateKey);
        bobPrivateKey = uint256(keccak256(abi.encodePacked("PUBLIC_BOB_KEY")));
        bob = vm.createWallet(bobPrivateKey);

        // Empty initial managers list — proves the public flag alone is
        // sufficient to allow writes from anyone.
        address[] memory managers = new address[](0);
        store = new WriterStorage();
        writer = new Writer("Town Square", address(store), admin, managers, true);
        store.setLogic(address(writer));
    }

    // -------------------------------------------------------------------------
    // Direct-caller paths
    // -------------------------------------------------------------------------

    function test_PublicWriter_StrangerCanCreateDirectly() public {
        // `stranger` was never granted WRITER_ROLE, but the public flag
        // means hasRole(WRITER_ROLE, anyAccount) returns true.
        vm.prank(stranger);
        vm.expectEmit();
        emit WriterStorage.EntryCreated(0, stranger);
        writer.createWithChunk(1, "hello world");

        WriterStorage.Entry memory entry = writer.getEntry(0);
        assertEq(entry.author, stranger);
        assertEq(entry.chunks[0], "hello world");
    }

    function test_PublicWriter_NonAuthorCannotUpdate() public {
        // alice creates an entry directly
        vm.prank(alice.addr);
        writer.createWithChunk(1, "alice's post");

        // bob (also a non-manager but a valid public writer) tries to update
        // alice's entry — should revert because of the author check
        vm.prank(bob.addr);
        vm.expectRevert("Writer: Only author can perform this action");
        writer.update(0, 1, "bob's edit");
    }

    function test_PublicWriter_NonAuthorCannotRemove() public {
        vm.prank(alice.addr);
        writer.createWithChunk(1, "alice's post");

        vm.prank(bob.addr);
        vm.expectRevert("Writer: Only author can perform this action");
        writer.remove(0);
    }

    function test_PublicWriter_AuthorCanUpdateOwnEntry() public {
        vm.startPrank(alice.addr);
        writer.createWithChunk(1, "alice's first draft");
        writer.update(0, 1, "alice's revised draft");
        vm.stopPrank();

        WriterStorage.Entry memory entry = writer.getEntry(0);
        assertEq(entry.chunks[0], "alice's revised draft");
        assertEq(entry.author, alice.addr);
    }

    function test_PublicWriter_AuthorCanRemoveOwnEntry() public {
        vm.startPrank(alice.addr);
        writer.createWithChunk(1, "alice's post");
        writer.remove(0);
        vm.stopPrank();
        assertEq(writer.getEntryCount(), 0);
    }

    // -------------------------------------------------------------------------
    // Signature-relayed paths (the production / relay flow)
    // -------------------------------------------------------------------------

    function test_PublicWriter_SignatureFromStrangerAccepted() public {
        uint256 nonce = 0;
        uint256 chunkCount = 1;
        string memory content = "stranger's first post";
        bytes memory signature = _sign(
            alicePrivateKey,
            address(writer),
            keccak256(
                abi.encode(
                    writer.CREATE_WITH_CHUNK_TYPEHASH(),
                    nonce,
                    chunkCount,
                    keccak256(abi.encodePacked(content))
                )
            )
        );

        // Anyone can submit the signature (the relay), and the recovered
        // signer (alice, who has no role grants) becomes the author.
        writer.createWithChunkWithSig(signature, nonce, chunkCount, content);

        WriterStorage.Entry memory entry = writer.getEntry(0);
        assertEq(entry.author, alice.addr);
        assertEq(entry.chunks[0], content);
    }

    function test_PublicWriter_SignatureFromBobCannotEditAlicesEntry() public {
        // alice creates entry 0 via signature
        {
            uint256 nonce = 0;
            uint256 chunkCount = 1;
            string memory content = "alice's post";
            bytes memory signature = _sign(
                alicePrivateKey,
                address(writer),
                keccak256(
                    abi.encode(
                        writer.CREATE_WITH_CHUNK_TYPEHASH(),
                        nonce,
                        chunkCount,
                        keccak256(abi.encodePacked(content))
                    )
                )
            );
            writer.createWithChunkWithSig(signature, nonce, chunkCount, content);
        }

        // bob tries to update entry 0 with a signature from his own wallet
        {
            uint256 nonce = 1;
            uint256 totalChunks = 1;
            string memory content = "bob trying to overwrite";
            bytes memory signature = _sign(
                bobPrivateKey,
                address(writer),
                keccak256(
                    abi.encode(
                        writer.UPDATE_TYPEHASH(),
                        nonce,
                        uint256(0), // entry id
                        totalChunks,
                        keccak256(abi.encodePacked(content))
                    )
                )
            );
            vm.expectRevert("Writer: Signer must be the author");
            writer.updateWithSig(signature, nonce, 0, totalChunks, content);
        }

        // alice's entry is unchanged
        WriterStorage.Entry memory entry = writer.getEntry(0);
        assertEq(entry.chunks[0], "alice's post");
        assertEq(entry.author, alice.addr);
    }

    // -------------------------------------------------------------------------
    // Admin operations stay locked even on public writers
    // -------------------------------------------------------------------------

    function test_PublicWriter_StrangerCannotSetTitle() public {
        vm.prank(stranger);
        vm.expectRevert();
        writer.setTitle("hijacked");
        // Title unchanged
        assertEq(writer.title(), "Town Square");
    }

    function test_PublicWriter_StrangerSetTitleWithSigRejected() public {
        // A stranger signs setTitleWithSig — even though their signature is
        // valid, the role check is for DEFAULT_ADMIN_ROLE, not WRITER_ROLE,
        // so the public flag does not bypass it.
        uint256 nonce = 0;
        string memory newTitle = "hijacked";
        bytes memory signature = _sign(
            alicePrivateKey,
            address(writer),
            keccak256(abi.encode(writer.SET_TITLE_TYPEHASH(), nonce, keccak256(abi.encodePacked(newTitle))))
        );
        vm.expectRevert("Writer: Invalid signer role");
        writer.setTitleWithSig(signature, nonce, newTitle);
        assertEq(writer.title(), "Town Square");
    }

    // -------------------------------------------------------------------------
    // Sanity check: a malformed signature recovers to address(0), which the
    // hasRole override explicitly rejects even on public writers.
    // -------------------------------------------------------------------------

    function test_PublicWriter_ZeroAddressSignerRejected() public {
        // Build a "signature" of the wrong length — OZ ECDSA returns
        // address(0) on length errors. The role check should fail.
        bytes memory garbage = hex"deadbeef";
        vm.expectRevert("Writer: Invalid signer role");
        writer.createWithChunkWithSig(garbage, 0, 1, "should not work");
    }

    // -------------------------------------------------------------------------
    // helper (matches the one in WriterWithSigTest)
    // -------------------------------------------------------------------------
    function _sign(uint256 signerPrivateKey, address verifyingContract, bytes32 hashStruct)
        internal
        view
        returns (bytes memory)
    {
        bytes32 DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,address verifyingContract)"),
                keccak256(abi.encodePacked(writer.DOMAIN_NAME())),
                keccak256(abi.encodePacked(writer.DOMAIN_VERSION())),
                verifyingContract
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, hashStruct));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, digest);
        return abi.encodePacked(r, s, v);
    }
}

// -----------------------------------------------------------------------------
// WriterRoleSigTest — exercises the gasless role-management functions:
//   grantWriterRoleWithSig
//   revokeWriterRoleWithSig
//   renounceWriterRoleWithSig
//
// Threat invariants:
//   - only DEFAULT_ADMIN_ROLE holders can grant or revoke
//   - only the existing WRITER_ROLE holder can renounce themselves (and
//     they remove their own role, not someone else's)
//   - all three revert on publicWritable=true writers (where the hasRole
//     override would make the underlying _grantRole/_revokeRole a silent
//     no-op)
// -----------------------------------------------------------------------------
contract WriterRoleSigTest is TestBase {
    Vm.Wallet public admin;
    uint256 internal adminPrivateKey;
    Vm.Wallet public alice;
    uint256 internal alicePrivateKey;
    Vm.Wallet public bob;
    uint256 internal bobPrivateKey;

    Writer public writer;
    Writer public publicWriter;
    WriterStorage public store;
    WriterStorage public publicStore;

    function setUp() public {
        adminPrivateKey = uint256(keccak256(abi.encodePacked("ROLE_ADMIN_KEY")));
        admin = vm.createWallet(adminPrivateKey);
        alicePrivateKey = uint256(keccak256(abi.encodePacked("ROLE_ALICE_KEY")));
        alice = vm.createWallet(alicePrivateKey);
        bobPrivateKey = uint256(keccak256(abi.encodePacked("ROLE_BOB_KEY")));
        bob = vm.createWallet(bobPrivateKey);

        // Private writer with admin as the only initial manager.
        address[] memory managers = new address[](1);
        managers[0] = admin.addr;
        store = new WriterStorage();
        writer = new Writer("Shared Notes", address(store), admin.addr, managers, false);
        store.setLogic(address(writer));

        // Public writer for the "no-op revert" tests.
        address[] memory pubManagers = new address[](1);
        pubManagers[0] = admin.addr;
        publicStore = new WriterStorage();
        publicWriter = new Writer("Town Square", address(publicStore), admin.addr, pubManagers, true);
        publicStore.setLogic(address(publicWriter));
    }

    // -------------------------------------------------------------------------
    // grantWriterRoleWithSig
    // -------------------------------------------------------------------------

    function test_GrantWriterRoleWithSig_AdminCanAddNewWriter() public {
        // alice does not yet have WRITER_ROLE on the private writer
        assertEq(writer.hasRole(writer.WRITER_ROLE(), alice.addr), false);

        // admin signs a grant for alice
        bytes memory sig = _signGrant(adminPrivateKey, address(writer), 0, alice.addr);
        writer.grantWriterRoleWithSig(sig, 0, alice.addr);

        // alice now has the role
        assertEq(writer.hasRole(writer.WRITER_ROLE(), alice.addr), true);
    }

    function test_GrantWriterRoleWithSig_GrantedWriterCanThenCreate() public {
        // admin grants alice
        bytes memory sig = _signGrant(adminPrivateKey, address(writer), 0, alice.addr);
        writer.grantWriterRoleWithSig(sig, 0, alice.addr);

        // alice creates an entry directly (no sig path needed — she has the role)
        vm.prank(alice.addr);
        writer.createWithChunk(1, "alice's first post on the shared writer");
        assertEq(writer.getEntryCount(), 1);
        assertEq(writer.getEntry(0).author, alice.addr);
    }

    function test_GrantWriterRoleWithSig_NonAdminSignerRejected() public {
        // alice (no role) tries to grant herself the role by signing
        bytes memory sig = _signGrant(alicePrivateKey, address(writer), 0, alice.addr);
        vm.expectRevert("Writer: Invalid signer role");
        writer.grantWriterRoleWithSig(sig, 0, alice.addr);
    }

    function test_GrantWriterRoleWithSig_ZeroAddressRejected() public {
        bytes memory sig = _signGrant(adminPrivateKey, address(writer), 0, address(0));
        vm.expectRevert("Writer: cannot grant to zero address");
        writer.grantWriterRoleWithSig(sig, 0, address(0));
    }

    function test_GrantWriterRoleWithSig_RevertsOnPublicWriter() public {
        bytes memory sig = _signGrant(adminPrivateKey, address(publicWriter), 0, alice.addr);
        vm.expectRevert("Writer: role grants are no-ops on public writers");
        publicWriter.grantWriterRoleWithSig(sig, 0, alice.addr);
    }

    // -------------------------------------------------------------------------
    // revokeWriterRoleWithSig
    // -------------------------------------------------------------------------

    function test_RevokeWriterRoleWithSig_AdminCanRemoveWriter() public {
        // First, grant alice the role
        bytes memory grantSig = _signGrant(adminPrivateKey, address(writer), 0, alice.addr);
        writer.grantWriterRoleWithSig(grantSig, 0, alice.addr);
        assertEq(writer.hasRole(writer.WRITER_ROLE(), alice.addr), true);

        // Then revoke
        bytes memory revokeSig = _signRevoke(adminPrivateKey, address(writer), 1, alice.addr);
        writer.revokeWriterRoleWithSig(revokeSig, 1, alice.addr);
        assertEq(writer.hasRole(writer.WRITER_ROLE(), alice.addr), false);
    }

    function test_RevokeWriterRoleWithSig_RevokedWriterCanNoLongerCreate() public {
        // Grant + revoke
        bytes memory grantSig = _signGrant(adminPrivateKey, address(writer), 0, alice.addr);
        writer.grantWriterRoleWithSig(grantSig, 0, alice.addr);
        bytes memory revokeSig = _signRevoke(adminPrivateKey, address(writer), 1, alice.addr);
        writer.revokeWriterRoleWithSig(revokeSig, 1, alice.addr);

        // alice tries to create — should revert because she no longer has the role
        vm.prank(alice.addr);
        vm.expectRevert();
        writer.createWithChunk(1, "should fail");
    }

    function test_RevokeWriterRoleWithSig_NonAdminSignerRejected() public {
        // grant alice first so she has a role to be revoked
        bytes memory grantSig = _signGrant(adminPrivateKey, address(writer), 0, alice.addr);
        writer.grantWriterRoleWithSig(grantSig, 0, alice.addr);

        // bob (no admin role) tries to revoke alice
        bytes memory sig = _signRevoke(bobPrivateKey, address(writer), 1, alice.addr);
        vm.expectRevert("Writer: Invalid signer role");
        writer.revokeWriterRoleWithSig(sig, 1, alice.addr);
    }

    function test_RevokeWriterRoleWithSig_RevertsOnPublicWriter() public {
        bytes memory sig = _signRevoke(adminPrivateKey, address(publicWriter), 0, alice.addr);
        vm.expectRevert("Writer: role revokes are no-ops on public writers");
        publicWriter.revokeWriterRoleWithSig(sig, 0, alice.addr);
    }

    // -------------------------------------------------------------------------
    // renounceWriterRoleWithSig
    // -------------------------------------------------------------------------

    function test_RenounceWriterRoleWithSig_WriterCanLeaveVoluntarily() public {
        // Admin grants alice
        bytes memory grantSig = _signGrant(adminPrivateKey, address(writer), 0, alice.addr);
        writer.grantWriterRoleWithSig(grantSig, 0, alice.addr);
        assertEq(writer.hasRole(writer.WRITER_ROLE(), alice.addr), true);

        // alice signs her own renunciation
        bytes memory renounceSig = _signRenounce(alicePrivateKey, address(writer), 1);
        writer.renounceWriterRoleWithSig(renounceSig, 1);

        // alice no longer has the role
        assertEq(writer.hasRole(writer.WRITER_ROLE(), alice.addr), false);
    }

    function test_RenounceWriterRoleWithSig_NonWriterCannotRenounce() public {
        // bob has no role; tries to "renounce" anyway
        bytes memory sig = _signRenounce(bobPrivateKey, address(writer), 0);
        vm.expectRevert("Writer: Invalid signer role");
        writer.renounceWriterRoleWithSig(sig, 0);
    }

    function test_RenounceWriterRoleWithSig_OnlyRemovesSignersOwnRole() public {
        // Grant alice and bob both
        bytes memory grantAlice = _signGrant(adminPrivateKey, address(writer), 0, alice.addr);
        writer.grantWriterRoleWithSig(grantAlice, 0, alice.addr);
        bytes memory grantBob = _signGrant(adminPrivateKey, address(writer), 1, bob.addr);
        writer.grantWriterRoleWithSig(grantBob, 1, bob.addr);

        // alice renounces — only her role should be removed, bob's stays
        bytes memory renounceSig = _signRenounce(alicePrivateKey, address(writer), 2);
        writer.renounceWriterRoleWithSig(renounceSig, 2);

        assertEq(writer.hasRole(writer.WRITER_ROLE(), alice.addr), false);
        assertEq(writer.hasRole(writer.WRITER_ROLE(), bob.addr), true);
    }

    function test_RenounceWriterRoleWithSig_RevertsOnPublicWriter() public {
        bytes memory sig = _signRenounce(alicePrivateKey, address(publicWriter), 0);
        vm.expectRevert("Writer: role renounce is a no-op on public writers");
        publicWriter.renounceWriterRoleWithSig(sig, 0);
    }

    // -------------------------------------------------------------------------
    // Replay protection
    //
    // The C-2 fix is generic — _verifyAndMark uses digestWasExecuted for
    // every *WithSig function in the contract. These tests pin the
    // digest-keyed replay map specifically for the three role-management
    // functions, so any future refactor that accidentally bypasses
    // _verifyAndMark for one of them is caught immediately.
    // -------------------------------------------------------------------------

    function test_GrantWriterRoleWithSig_CannotBeReplayed() public {
        bytes memory sig = _signGrant(adminPrivateKey, address(writer), 0, alice.addr);

        // First call succeeds
        writer.grantWriterRoleWithSig(sig, 0, alice.addr);
        assertEq(writer.hasRole(writer.WRITER_ROLE(), alice.addr), true);

        // Replaying the exact same signature must revert with the digest-mark
        // error (NOT a "role" error — the digest is consumed before the role
        // check fires on a re-execution path).
        vm.expectRevert("Writer: Signature has already been executed");
        writer.grantWriterRoleWithSig(sig, 0, alice.addr);
    }

    function test_RevokeWriterRoleWithSig_CannotBeReplayed() public {
        // grant alice first so there's a role to revoke
        bytes memory grantSig = _signGrant(adminPrivateKey, address(writer), 0, alice.addr);
        writer.grantWriterRoleWithSig(grantSig, 0, alice.addr);

        // Revoke alice
        bytes memory revokeSig = _signRevoke(adminPrivateKey, address(writer), 1, alice.addr);
        writer.revokeWriterRoleWithSig(revokeSig, 1, alice.addr);
        assertEq(writer.hasRole(writer.WRITER_ROLE(), alice.addr), false);

        // Replaying the same revoke signature must revert. (Even though it
        // would be a no-op if it succeeded — alice already has no role —
        // the digest map blocks the replay regardless of state effects.
        // This is what makes the protection robust against semantic-no-op
        // re-executions that could be combined with other state changes
        // for griefing.)
        vm.expectRevert("Writer: Signature has already been executed");
        writer.revokeWriterRoleWithSig(revokeSig, 1, alice.addr);
    }

    function test_RenounceWriterRoleWithSig_CannotBeReplayed() public {
        // grant alice
        bytes memory grantSig = _signGrant(adminPrivateKey, address(writer), 0, alice.addr);
        writer.grantWriterRoleWithSig(grantSig, 0, alice.addr);

        // alice renounces
        bytes memory renounceSig = _signRenounce(alicePrivateKey, address(writer), 1);
        writer.renounceWriterRoleWithSig(renounceSig, 1);
        assertEq(writer.hasRole(writer.WRITER_ROLE(), alice.addr), false);

        // Re-grant alice (admin's choice). Note: a re-granted role is
        // independent of the original — alice's previously-signed
        // renunciation is permanently consumed via digestWasExecuted and
        // cannot be used to remove the new grant. This is the desired
        // behavior: each renunciation is a one-shot signed claim.
        bytes memory regrantSig = _signGrant(adminPrivateKey, address(writer), 2, alice.addr);
        writer.grantWriterRoleWithSig(regrantSig, 2, alice.addr);
        assertEq(writer.hasRole(writer.WRITER_ROLE(), alice.addr), true);

        // Replay the original renunciation signature — must revert.
        // alice's role is preserved.
        vm.expectRevert("Writer: Signature has already been executed");
        writer.renounceWriterRoleWithSig(renounceSig, 1);
        assertEq(writer.hasRole(writer.WRITER_ROLE(), alice.addr), true);
    }

    // -------------------------------------------------------------------------
    // helpers — one per typed-data shape
    // -------------------------------------------------------------------------

    function _signGrant(uint256 pk, address verifyingContract, uint256 nonce, address account)
        internal
        view
        returns (bytes memory)
    {
        Writer w = Writer(verifyingContract);
        bytes32 structHash =
            keccak256(abi.encode(w.GRANT_WRITER_ROLE_TYPEHASH(), nonce, account));
        return _sign(pk, verifyingContract, structHash);
    }

    function _signRevoke(uint256 pk, address verifyingContract, uint256 nonce, address account)
        internal
        view
        returns (bytes memory)
    {
        Writer w = Writer(verifyingContract);
        bytes32 structHash =
            keccak256(abi.encode(w.REVOKE_WRITER_ROLE_TYPEHASH(), nonce, account));
        return _sign(pk, verifyingContract, structHash);
    }

    function _signRenounce(uint256 pk, address verifyingContract, uint256 nonce)
        internal
        view
        returns (bytes memory)
    {
        Writer w = Writer(verifyingContract);
        bytes32 structHash = keccak256(abi.encode(w.RENOUNCE_WRITER_ROLE_TYPEHASH(), nonce));
        return _sign(pk, verifyingContract, structHash);
    }

    /// @dev Builds the EIP-712 digest using the verifyingContract's own
    ///      DOMAIN_NAME / DOMAIN_VERSION (so this works for both the
    ///      private and public writer instances).
    function _sign(uint256 pk, address verifyingContract, bytes32 structHash)
        internal
        view
        returns (bytes memory)
    {
        Writer w = Writer(verifyingContract);
        bytes32 DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,address verifyingContract)"),
                keccak256(abi.encodePacked(w.DOMAIN_NAME())),
                keccak256(abi.encodePacked(w.DOMAIN_VERSION())),
                verifyingContract
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }
}

contract WriterForkTest is TestBase {
    uint256 opFork;
    string OP_RPC_URL = vm.envString("OP_RPC_URL");

    function setUp() public {
        opFork = vm.createFork(OP_RPC_URL);
    }

    function test_ForkCreateWithChunkWithSig() public {
        vm.selectFork(opFork);
        assertEq(vm.activeFork(), opFork);

        Writer myWriter = Writer(0x2590Bfff6F5e2Ca9F87fa7632C1778D0D646db3e);
        assertEq(myWriter.DOMAIN_NAME(), "Writer");
    }
}
