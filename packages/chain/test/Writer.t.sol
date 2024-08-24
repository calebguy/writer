// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console, Vm} from "forge-std/Test.sol";
import {Writer} from "../src/Writer.sol";
import {WriterStorage} from "../src/WriterStorage.sol";

import "forge-std/console.sol";

contract WriterDirectCallerTest is Test {
    WriterStorage public store;
    Writer public writer;
    address user = address(0x1);

    function setUp() public {
        address[] memory writers = new address[](1);
        writers[0] = user;

        store = new WriterStorage();
        writer = new Writer(address(store), user, writers);
        store.setLogic(address(writer));
    }

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

    function test_CreateWithChunks() public {
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
            receivedChunks: size,
            exists: true,
            chunks: expectedChunks
        });
        entryEq(entry, expectedEntry);
    }

    // function test_Remove() public {
    //     vm.startPrank(manager);
    //     writer.create("Hello, World!");
    //     writer.remove(0);
    //     vm.stopPrank();
    //     assertEq(writer.getEntryCount(), 0);
    // }

    // function test_GetEntryAfterRemoved() public {
    //     vm.startPrank(manager);
    //     writer.create("World!");
    //     writer.create("Universe!");
    //     writer.create("Multiverse!");
    //     writer.remove(2);
    //     vm.stopPrank();

    //     WriterStorage.Entry memory entry = writer.getEntry(2);
    //     assertEq(entry.createdAtBlock, 0);
    //     assertEq(entry.content, "");
    //     assertFalse(entry.exists);
    // }

    // @note: Tests for setting new adming & setWriterStorage
}

// contract WriterWithSigTest is Test {
//     Vm.Wallet public admin;
//     Vm.Wallet public manager;

//     Prose public prose;
//     WriterStorage public store;
//     uint256 internal managerPrivateKey;

//     function setUp() public {
//         // set signer private key
//         admin = vm.createWallet(uint256(keccak256(abi.encodePacked("ADMIN_PRIVATE_KEY"))));
//         managerPrivateKey = uint256(keccak256(abi.encodePacked("MANAGER_PRIVATE_KEY")));
//         manager = vm.createWallet(managerPrivateKey);

//         address[] memory managers = new address[](1);
//         managers[0] = manager.addr;
//         console.log("Manager", manager.addr);
//         store = new WriterStorage();
//         prose = new Prose(address(store), admin.addr, managers);
//         store.setLogic(address(prose));
//     }

//     function test_ManagerHasRole() public view {
//         assertEq(prose.hasRole(prose.MANAGER_ROLE(), manager.addr), true);
//     }

//     function test_AdminHasRole() public view {
//         assertEq(prose.hasRole(prose.DEFAULT_ADMIN_ROLE(), admin.addr), true);
//         assertEq(prose.hasRole(prose.MANAGER_ROLE(), admin.addr), false);
//     }

//     function test_CreateWithSig() public {
//         string memory content = "Hey";
//         uint256 nonce = 0;
//         bytes memory signature =
//             _sign(managerPrivateKey, address(prose), keccak256(abi.encode(prose.CREATE_TYPEHASH(), nonce, content)));
//         prose.createwithSig(signature, nonce, content);
//         assertEq(prose.getEntryCount(), 1);
//     }

//     function test_UpdateWithSig() public {
//         string memory content = "Hi";
//         uint256 nonce = 0;
//         bytes memory signature =
//             _sign(managerPrivateKey, address(prose), keccak256(abi.encode(prose.CREATE_TYPEHASH(), nonce, content)));
//         prose.createwithSig(signature, nonce, content);
//         assertEq(prose.getEntry(0).content, content);

//         uint256 entryId = 0;
//         string memory newContent = "Oh";
//         signature = _sign(
//             managerPrivateKey,
//             address(prose),
//             keccak256(abi.encode(prose.UPDATE_TYPEHASH(), nonce, entryId, newContent))
//         );
//         prose.updateWithSig(signature, nonce, entryId, newContent);
//         assertEq(prose.getEntryCount(), 1);
//         assertEq(prose.getEntry(entryId).content, newContent);
//     }

//     function test_RemoveWithSig() public {
//         string memory content = "Hello, World!";
//         uint256 nonce = 0;
//         bytes memory signature =
//             _sign(managerPrivateKey, address(prose), keccak256(abi.encode(prose.CREATE_TYPEHASH(), nonce, content)));
//         prose.createwithSig(signature, nonce, content);
//         assertEq(prose.getEntryCount(), 1);

//         uint256 entryId = 0;
//         signature =
//             _sign(managerPrivateKey, address(prose), keccak256(abi.encode(prose.REMOVE_TYPEHASH(), nonce, entryId)));
//         prose.removeWithSig(signature, nonce, entryId);
//         assertEq(prose.getEntryCount(), 0);
//     }

//     function _sign(uint256 _signerPrivateKey, address verifyingContract, bytes32 hashStruct)
//         internal
//         view
//         returns (bytes memory)
//     {
//         bytes32 DOMAIN_SEPARATOR = keccak256(
//             abi.encode(
//                 keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
//                 keccak256(abi.encodePacked(prose.DOMAIN_NAME())),
//                 keccak256(abi.encodePacked(prose.DOMAIN_VERSION())),
//                 block.chainid,
//                 verifyingContract
//             )
//         );

//         // bytes32 hashStruct = keccak256(abi.encode(prose.MAINSTRUCT_TYPEHASH(), nonce, _content));

//         bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, hashStruct));
//         (uint8 v, bytes32 r, bytes32 s) = vm.sign(_signerPrivateKey, digest);
//         return abi.encodePacked(r, s, v);
//     }
// }
