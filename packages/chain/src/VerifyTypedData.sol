// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

abstract contract VerifyTypedData {
    bytes32 private DOMAIN_SEPERATOR;

    constructor(bytes memory name, bytes memory version) {
        DOMAIN_SEPERATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(name), // name
                keccak256(version), // version
                block.chainid, // chainId
                address(this) // verifyingContract
            )
        );
    }

    function getSigner(bytes memory signature, bytes32 typeHash) internal view returns (address) {
        return _getSigner(
            signature,
            keccak256(
                abi.encodePacked(
                    "\x19\x01", // EIP-191 header
                    DOMAIN_SEPERATOR,
                    typeHash
                )
            )
        );
    }

    function _getSigner(bytes memory _signature, bytes32 hash) internal pure returns (address) {
        bytes32 r;
        bytes32 s;
        uint8 v;
        if (_signature.length != 65) {
            return address(0);
        }
        assembly {
            r := mload(add(_signature, 32))
            s := mload(add(_signature, 64))
            v := byte(0, mload(add(_signature, 96)))
        }
        if (v < 27) {
            v += 27;
        }
        if (v != 27 && v != 28) {
            return address(0);
        }

        return ecrecover(hash, v, r, s);
    }
}
