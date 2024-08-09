// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console, Vm} from "forge-std/Test.sol";
import {Prose} from "../src/Prose.sol";
import {ProseStorage} from "../src/ProseStorage.sol";

// @note REMOVE
import "forge-std/console.sol";

contract ProseDirectCallerTest is Test {
    ProseStorage public store;
    Prose public prose;
    address admin = address(0x1);
    address manager = address(0x2);

    function setUp() public {
        address[] memory managers = new address[](1);
        managers[0] = manager;

        console.log("CALLER", address(this));
        store = new ProseStorage();
        prose = new Prose(address(store), admin, managers);
        store.setLogic(address(prose));
    }

    function test_Create() public {
        vm.prank(manager);
        prose.create("Hey");
        assertEq(prose.getEntryCount(), 1);
    }

    function test_Update() public {
        vm.startPrank(manager);
        prose.create("Hi");
        string memory newContent = "Oh";
        uint256 entryId = 0;
        prose.update(entryId, newContent);
        vm.stopPrank();
        assertEq(prose.getEntryCount(), 1);
        assertEq(prose.getEntry(entryId).content, newContent);
    }

    function test_Remove() public {
        vm.startPrank(manager);
        prose.create("Hello, World!");
        prose.remove(0);
        vm.stopPrank();
        assertEq(prose.getEntryCount(), 0);
    }

    function test_GetEntryCount() public {
        assertEq(prose.getEntryCount(), 0);
        vm.startPrank(manager);
        prose.create("World!");
        prose.create("Universe!");
        prose.create("Multiverse!");
        vm.stopPrank();
        assertEq(prose.getEntryCount(), 3);
    }

    function test_GetEntryIds() public {
        vm.startPrank(manager);
        prose.create("World!");
        prose.create("Universe!");
        prose.create("Multiverse!");
        vm.stopPrank();
        uint256[] memory entryIds = prose.getEntryIds();
        assertEq(entryIds.length, 3);
        assertEq(entryIds[0], 0);
        assertEq(entryIds[1], 1);
        assertEq(entryIds[2], 2);
    }

    function test_GetEntry() public {
        vm.startPrank(manager);
        prose.create("World!");
        prose.create("Universe!");
        prose.create("Multiverse!");
        vm.stopPrank();
        ProseStorage.Entry memory entry = prose.getEntry(1);
        assertEq(entry.createdAtBlock, block.number);
        assertEq(entry.content, "Universe!");
        assertTrue(entry.exists);
    }

    function test_GetEntryAfterRemoved() public {
        vm.startPrank(manager);
        prose.create("World!");
        prose.create("Universe!");
        prose.create("Multiverse!");
        prose.remove(2);
        vm.stopPrank();

        ProseStorage.Entry memory entry = prose.getEntry(2);
        assertEq(entry.createdAtBlock, 0);
        assertEq(entry.content, "");
        assertFalse(entry.exists);
    }

    // @note: Tests for setting new adming & setProseStorage
}

contract ProseWithSigTest is Test {
    Vm.Wallet public admin;
    Vm.Wallet public manager;

    Prose public prose;
    ProseStorage public store;
    uint256 internal managerPrivateKey;

    function setUp() public {
        // set signer private key
        admin = vm.createWallet(uint256(keccak256(abi.encodePacked("ADMIN_PRIVATE_KEY"))));
        managerPrivateKey = uint256(keccak256(abi.encodePacked("MANAGER_PRIVATE_KEY")));
        manager = vm.createWallet(managerPrivateKey);

        address[] memory managers = new address[](1);
        managers[0] = manager.addr;
        console.log("Manager", manager.addr);
        store = new ProseStorage();
        prose = new Prose(address(store), admin.addr, managers);
        store.setLogic(address(prose));
    }

    function test_ManagerHasRole() public view {
        assertEq(prose.hasRole(prose.MANAGER_ROLE(), manager.addr), true);
    }

    function test_AdminHasRole() public view {
        assertEq(prose.hasRole(prose.DEFAULT_ADMIN_ROLE(), admin.addr), true);
        assertEq(prose.hasRole(prose.MANAGER_ROLE(), admin.addr), false);
    }

    function test_CreateWithSig() public {
        string memory content = "Hey";
        uint256 nonce = 0;
        bytes memory signature =
            _sign(managerPrivateKey, address(prose), keccak256(abi.encode(prose.CREATE_TYPEHASH(), nonce, content)));
        prose.createwithSig(signature, nonce, content);
        assertEq(prose.getEntryCount(), 1);
    }

    function test_UpdateWithSig() public {
        string memory content = "Hi";
        uint256 nonce = 0;
        bytes memory signature =
            _sign(managerPrivateKey, address(prose), keccak256(abi.encode(prose.CREATE_TYPEHASH(), nonce, content)));
        prose.createwithSig(signature, nonce, content);
        assertEq(prose.getEntry(0).content, content);

        uint256 entryId = 0;
        string memory newContent = "Oh";
        signature = _sign(
            managerPrivateKey,
            address(prose),
            keccak256(abi.encode(prose.UPDATE_TYPEHASH(), nonce, entryId, newContent))
        );
        prose.updateWithSig(signature, nonce, entryId, newContent);
        assertEq(prose.getEntryCount(), 1);
        assertEq(prose.getEntry(entryId).content, newContent);
    }

    function test_RemoveWithSig() public {
        string memory content = "Hello, World!";
        uint256 nonce = 0;
        bytes memory signature =
            _sign(managerPrivateKey, address(prose), keccak256(abi.encode(prose.CREATE_TYPEHASH(), nonce, content)));
        prose.createwithSig(signature, nonce, content);
        assertEq(prose.getEntryCount(), 1);

        uint256 entryId = 0;
        signature =
            _sign(managerPrivateKey, address(prose), keccak256(abi.encode(prose.REMOVE_TYPEHASH(), nonce, entryId)));
        prose.removeWithSig(signature, nonce, entryId);
        assertEq(prose.getEntryCount(), 0);
    }

    function _sign(uint256 _signerPrivateKey, address verifyingContract, bytes32 hashStruct)
        internal
        view
        returns (bytes memory)
    {
        bytes32 DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(abi.encodePacked(prose.DOMAIN_NAME())),
                keccak256(abi.encodePacked(prose.DOMAIN_VERSION())),
                block.chainid,
                verifyingContract
            )
        );

        // bytes32 hashStruct = keccak256(abi.encode(prose.MAINSTRUCT_TYPEHASH(), nonce, _content));

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, hashStruct));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(_signerPrivateKey, digest);
        return abi.encodePacked(r, s, v);
    }
}
