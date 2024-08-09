// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {AccessControl} from "oz/access/AccessControl.sol";
import {VerifyTypedData} from "./VerifyTypedData.sol";
import {ProseStorage} from "./ProseStorage.sol";

contract Prose is AccessControl, VerifyTypedData {
    bytes32 public constant CREATE_TYPEHASH = keccak256("Create(uint256 nonce,string content)");
    bytes32 public constant UPDATE_TYPEHASH = keccak256("Update(uint256 nonce,uint256 id,string content)");
    bytes32 public constant REMOVE_TYPEHASH = keccak256("Remove(uint256 nonce,uint256 id)");

    bytes public DOMAIN_NAME = "Prose";
    bytes public DOMAIN_VERSION = "1";
    bytes32 public MANAGER_ROLE = keccak256("MANAGER");

    ProseStorage public store;
    mapping(bytes32 => bool) public signatureWasExecuted;

    modifier authedBySig(bytes memory signature, bytes32 structHash) {
        address signer = getSigner(signature, structHash);
        require(hasRole(MANAGER_ROLE, signer), "Prose: Signer is not a manager");
        require(!signatureWasExecuted[keccak256(signature)], "Prose: Signature has already been executed");
        _;
        signatureWasExecuted[keccak256(signature)] = true;
    }

    constructor(address storageAddress, address admin, address[] memory managers)
        VerifyTypedData(DOMAIN_NAME, DOMAIN_VERSION)
    {
        store = ProseStorage(storageAddress);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        for (uint256 i = 0; i < managers.length; i++) {
            _grantRole(MANAGER_ROLE, managers[i]);
        }
    }

    function setNewAdmin(address newAdmin) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(DEFAULT_ADMIN_ROLE, newAdmin);
        _revokeRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setProseStorage(address storageAddress) public onlyRole(DEFAULT_ADMIN_ROLE) {
        store = ProseStorage(storageAddress);
    }

    function getEntryCount() public view returns (uint256) {
        return store.getEntryCount();
    }

    function getEntryIds() public view returns (uint256[] memory) {
        return store.getEntryIds();
    }

    function getEntry(uint256 id) public view returns (ProseStorage.Entry memory) {
        return store.getEntry(id);
    }

    function create(string memory content) public onlyRole(MANAGER_ROLE) {
        _create(content, msg.sender);
    }

    function createwithSig(bytes memory signature, uint256 nonce, string memory content)
        public
        authedBySig(signature, keccak256(abi.encode(CREATE_TYPEHASH, nonce, content)))
    {
        address signer = getSigner(signature, keccak256(abi.encode(CREATE_TYPEHASH, nonce, content)));
        _create(content, signer);
    }

    function update(uint256 id, string memory content) public onlyRole(MANAGER_ROLE) {
        _update(id, content, msg.sender);
    }

    function updateWithSig(bytes memory signature, uint256 nonce, uint256 id, string memory content)
        public
        authedBySig(signature, keccak256(abi.encode(UPDATE_TYPEHASH, nonce, id, content)))
    {
        address signer = getSigner(signature, keccak256(abi.encode(UPDATE_TYPEHASH, nonce, id, content)));
        _update(id, content, signer);
    }

    function remove(uint256 id) public onlyRole(MANAGER_ROLE) {
        _remove(id);
    }

    function removeWithSig(bytes memory signature, uint256 nonce, uint256 id)
        public
        authedBySig(signature, keccak256(abi.encode(REMOVE_TYPEHASH, nonce, id)))
    {
        _remove(id);
    }

    function _create(string memory content, address creator) internal {
        ProseStorage.Entry memory entry = ProseStorage.Entry(block.number, block.number, content, true, creator);
        store.create(entry);
    }

    function _update(uint256 id, string memory content, address creator) internal {
        ProseStorage.Entry memory entry = ProseStorage.Entry(block.number, block.number, content, true, creator);
        store.update(id, entry);
    }

    function _remove(uint256 id) internal {
        store.remove(id);
    }
}
