// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {VerifyTypedData} from "./VerifyTypedData.sol";

contract ColorRegistry is VerifyTypedData {
    bytes public DOMAIN_NAME = "ColorRegistry";
    bytes public DOMAIN_VERSION = "1";
    bytes32 public constant SET_PRIMARY_TYPEHASH = keccak256("SetHex(uint256 nonce,bytes32 hexColor)");

    mapping(address => bytes32) public userToHex;
    /// @notice Tracks which EIP-712 digests have already been executed.
    ///         Keyed off the digest (not the raw signature bytes) so
    ///         malleated `(r, n - s, v')` signatures cannot bypass replay
    ///         protection.
    mapping(bytes32 => bool) public digestWasExecuted;

    event HexSet(address indexed user, bytes32 indexed hexColor);

    constructor() VerifyTypedData(DOMAIN_NAME, DOMAIN_VERSION) {}

    function setHex(bytes32 hexColor) public {
        userToHex[msg.sender] = hexColor;
        emit HexSet(msg.sender, hexColor);
    }

    function setHexWithSig(bytes memory signature, uint256 nonce, bytes32 hexColor) public {
        bytes32 digest = _hashTypedData(keccak256(abi.encode(SET_PRIMARY_TYPEHASH, nonce, hexColor)));
        require(!digestWasExecuted[digest], "ColorRegistry: Signature has already been executed");

        address signer = _recover(digest, signature);
        require(signer != address(0), "ColorRegistry: Invalid signature");
        userToHex[signer] = hexColor;
        emit HexSet(signer, hexColor);

        digestWasExecuted[digest] = true;
    }

    function getPrimary(address user) public view returns (bytes32) {
        return userToHex[user];
    }
}
