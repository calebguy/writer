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
        assertEq(entry.exists, expectedEntry.exists);
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
        writer = new Writer("Notes for today", address(store), user, writers);
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
            exists: true,
            chunks: new string[](2)
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
            exists: true,
            chunks: expectedChunks
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
        emit WriterStorage.EntryUpdated(0, user);
        emit WriterStorage.ChunkReceived(0, 0, "Hello", user);
        writer.addChunk(0, 0, "Hello");

        vm.expectEmit();
        emit WriterStorage.EntryCompleted(0, user);
        emit WriterStorage.ChunkReceived(0, 0, "World", user);
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
            exists: true,
            chunks: expectedChunks
        });
        entryEq(entry, expectedEntry);

        string memory content = writer.getEntryContent(0);
        assertEq(content, "Hello World");
    }

    function test_UpdateChunk() public {
        vm.startPrank(user);
        uint256 size = 3;
        writer.create(size);

        uint256 entryId = 0;

        writer.addChunk(entryId, 0, "Writer");
        writer.addChunk(entryId, 1, "is");
        writer.addChunk(entryId, 2, "here");

        WriterStorage.Entry memory entry = writer.getEntry(entryId);
        string[] memory expectedChunks = new string[](3);
        expectedChunks[0] = "Writer";
        expectedChunks[1] = "is";
        expectedChunks[2] = "here";
        WriterStorage.Entry memory expectedEntry = WriterStorage.Entry({
            createdAtBlock: block.number,
            updatedAtBlock: block.number,
            totalChunks: size,
            receivedChunks: size,
            exists: true,
            chunks: expectedChunks
        });
        entryEq(entry, expectedEntry);

        string memory totalContent = writer.getEntryContent(entryId);
        assertEq(totalContent, "Writer is here");

        vm.expectEmit();
        emit WriterStorage.EntryUpdated(0, user);
        emit WriterStorage.ChunkReceived(0, 1, "was", user);
        writer.update(entryId, 1, "was");
        vm.stopPrank();

        entry = writer.getEntry(entryId);
        expectedChunks[1] = "was";
        expectedEntry = WriterStorage.Entry({
            createdAtBlock: block.number,
            updatedAtBlock: block.number,
            totalChunks: size,
            receivedChunks: size + 1,
            exists: true,
            chunks: expectedChunks
        });
        entryEq(entry, expectedEntry);
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
            exists: false,
            chunks: new string[](0)
        });
        entryEq(entry, expectedEntry);

        uint256[] memory expectedEntryIds = new uint256[](0);
        assertEq(writer.getEntryIds(), expectedEntryIds);
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
        writer = new Writer("Notes for today", address(store), user.addr, managers);
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
            keccak256(abi.encode(writer.ADD_CHUNK_TYPEHASH(), nonce, entryId, chunkIndex1, content1))
        );

        vm.expectEmit();
        emit WriterStorage.ChunkReceived(entryId, chunkIndex1, content1, user.addr);
        emit WriterStorage.EntryUpdated(entryId, user.addr);
        writer.addChunkWithSig(signature, nonce, entryId, chunkIndex1, content1);

        string memory content2 = "World";
        uint256 chunkIndex2 = 1;
        signature = _sign(
            userPrivateKey,
            address(writer),
            keccak256(abi.encode(writer.ADD_CHUNK_TYPEHASH(), nonce, entryId, chunkIndex2, content2))
        );

        vm.expectEmit();
        emit WriterStorage.ChunkReceived(entryId, chunkIndex2, content2, user.addr);
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
            exists: true,
            chunks: expectedChunks
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
            keccak256(abi.encode(writer.CREATE_WITH_CHUNK_TYPEHASH(), nonce, chunkCount, chunkContent))
        );

        vm.expectEmit();
        emit WriterStorage.EntryCreated(0, user.addr);
        emit WriterStorage.ChunkReceived(0, 0, chunkContent, user.addr);
        writer.createWithChunkWithSig(signature, nonce, chunkCount, chunkContent);

        WriterStorage.Entry memory entry = writer.getEntry(0);
        string[] memory expectedChunks = new string[](1);
        expectedChunks[0] = chunkContent;
        WriterStorage.Entry memory expectedEntry = WriterStorage.Entry({
            createdAtBlock: block.number,
            updatedAtBlock: block.number,
            totalChunks: chunkCount,
            receivedChunks: chunkCount,
            exists: true,
            chunks: expectedChunks
        });
        entryEq(entry, expectedEntry);
    }

    function test_UpdateWithSig() public {
        uint256 nonce = 0;
        uint256 size = 1;
        uint256 entryId = 0;
        bytes memory signature =
            _sign(userPrivateKey, address(writer), keccak256(abi.encode(writer.CREATE_TYPEHASH(), nonce, size)));

        vm.expectEmit();
        emit WriterStorage.EntryCreated(entryId, user.addr);
        writer.createWithSig(signature, nonce, size);

        string memory content = "Writer";
        uint256 chunkIndex1 = 0;
        signature = _sign(
            userPrivateKey,
            address(writer),
            keccak256(abi.encode(writer.ADD_CHUNK_TYPEHASH(), nonce, entryId, chunkIndex1, content))
        );

        vm.expectEmit();
        emit WriterStorage.ChunkReceived(entryId, chunkIndex1, content, user.addr);
        emit WriterStorage.EntryUpdated(entryId, user.addr);
        writer.addChunkWithSig(signature, nonce, entryId, chunkIndex1, content);

        WriterStorage.Entry memory entry = writer.getEntry(0);
        string[] memory expectedChunks = new string[](size);
        expectedChunks[0] = content;
        WriterStorage.Entry memory expectedEntry = WriterStorage.Entry({
            createdAtBlock: block.number,
            updatedAtBlock: block.number,
            totalChunks: size,
            receivedChunks: size,
            exists: true,
            chunks: expectedChunks
        });
        entryEq(entry, expectedEntry);

        string memory newContent = "WRITER";
        uint256 chunkIndex = 0;
        signature = _sign(
            userPrivateKey,
            address(writer),
            keccak256(abi.encode(writer.UPDATE_TYPEHASH(), nonce, entryId, chunkIndex, newContent))
        );

        vm.expectEmit();
        emit WriterStorage.ChunkReceived(entryId, chunkIndex, newContent, user.addr);
        emit WriterStorage.EntryUpdated(entryId, user.addr);
        writer.updateWithSig(signature, nonce, entryId, chunkIndex, newContent);

        entry = writer.getEntry(0);
        expectedChunks[0] = newContent;
        expectedEntry = WriterStorage.Entry({
            createdAtBlock: block.number,
            updatedAtBlock: block.number,
            totalChunks: size,
            receivedChunks: size + 1,
            exists: true,
            chunks: expectedChunks
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
            keccak256(abi.encode(writer.ADD_CHUNK_TYPEHASH(), nonce, entryId, chunkIndex1, content1))
        );

        vm.expectEmit();
        emit WriterStorage.ChunkReceived(entryId, chunkIndex1, content1, user.addr);
        emit WriterStorage.EntryUpdated(entryId, user.addr);
        writer.addChunkWithSig(signature, nonce, entryId, chunkIndex1, content1);

        string memory content2 = "World";
        uint256 chunkIndex2 = 1;
        signature = _sign(
            userPrivateKey,
            address(writer),
            keccak256(abi.encode(writer.ADD_CHUNK_TYPEHASH(), nonce, entryId, chunkIndex2, content2))
        );

        vm.expectEmit();
        emit WriterStorage.ChunkReceived(entryId, chunkIndex2, content2, user.addr);
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
            exists: false,
            chunks: new string[](0)
        });
        entryEq(entry, expectedEntry);
    }

    function _sign(uint256 signerPrivateKey, address verifyingContract, bytes32 hashStruct)
        internal
        view
        returns (bytes memory)
    {
        bytes32 DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(abi.encodePacked(writer.DOMAIN_NAME())),
                keccak256(abi.encodePacked(writer.DOMAIN_VERSION())),
                block.chainid,
                verifyingContract
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, hashStruct));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, digest);
        return abi.encodePacked(r, s, v);
    }
}
