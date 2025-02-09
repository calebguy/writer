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
            exists: true,
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
        emit WriterStorage.EntryUpdated(0, user);
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
            exists: true,
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
            exists: false,
            chunks: new string[](0),
            author: user
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
            exists: true,
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
            exists: true,
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
            exists: false,
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
