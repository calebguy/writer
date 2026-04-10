// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {ECDSA} from "oz/utils/cryptography/ECDSA.sol";

abstract contract VerifyTypedData {
    bytes32 internal immutable DOMAIN_SEPARATOR;

    constructor(bytes memory name, bytes memory version) {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(name), // name
                keccak256(version), // version
                block.chainid, // chainId
                address(this) // verifyingContract
            )
        );
    }

    /// @notice Compute the EIP-712 digest for a given struct hash. Exposed so
    ///         derived contracts can key replay-protection mappings off the
    ///         digest (which is unique per logical message), not off the raw
    ///         signature bytes (which are not unique due to ECDSA malleability).
    function _hashTypedData(bytes32 structHash) internal view returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
    }

    function getSigner(bytes memory signature, bytes32 structHash) internal view returns (address) {
        return _recover(_hashTypedData(structHash), signature);
    }

    /// @dev Recover via OpenZeppelin's ECDSA library, which rejects high-S
    ///      signatures (eliminating ECDSA malleability), invalid v values,
    ///      malformed lengths, and zero-address recoveries. Returns
    ///      `address(0)` on any error so existing role-based callers behave
    ///      identically to the previous hand-rolled implementation.
    function _recover(bytes32 digest, bytes memory signature) internal pure returns (address) {
        (address signer, ECDSA.RecoverError err,) = ECDSA.tryRecover(digest, signature);
        if (err != ECDSA.RecoverError.NoError) {
            return address(0);
        }
        return signer;
    }
}
