// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {VerifyTypedData} from "./VerifyTypedData.sol";

contract ColorRegistry is VerifyTypedData {
    bytes public DOMAIN_NAME = "ColorRegistry";
    bytes public DOMAIN_VERSION = "1";
    bytes32 public constant SET_PRIMARY_TYPEHASH = keccak256("SetHex(uint256 nonce,bytes32 hexColor)");

    mapping(address => bytes32) public userToHex;
    mapping(bytes32 => bool) public signatureWasExecuted;

    event HexSet(address indexed user, bytes32 indexed hexColor);

    constructor() VerifyTypedData(DOMAIN_NAME, DOMAIN_VERSION) {}

    function setHex(bytes32 hexColor) public {
        userToHex[msg.sender] = hexColor;
        emit HexSet(msg.sender, hexColor);
    }

    function setHexWithSig(bytes memory signature, uint256 nonce, bytes32 hexColor) public {
        bytes32 signatureHash = keccak256(signature);
        require(!signatureWasExecuted[signatureHash], "ColorRegistry: Signature has already been executed");

        address signer = getSigner(signature, keccak256(abi.encode(SET_PRIMARY_TYPEHASH, nonce, hexColor)));
        userToHex[signer] = hexColor;
        emit HexSet(signer, hexColor);

        signatureWasExecuted[signatureHash] = true;
    }

    function getPrimary(address user) public view returns (bytes32) {
        return userToHex[user];
    }
}
