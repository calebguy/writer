// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {ECDSA} from "oz/utils/cryptography/ECDSA.sol";

abstract contract VerifyTypedData {
    bytes32 internal immutable DOMAIN_SEPARATOR;

    /// @notice Build the EIP-712 domain separator WITHOUT `chainId`.
    ///
    /// @dev This is a deliberate, considered omission. The standard reason
    ///      to bind chainId in an EIP-712 domain is to prevent cross-chain
    ///      replay of *financial* transactions: e.g. a "transfer 100 USDC"
    ///      signature on chain A being replayed against the same USDC
    ///      contract address on chain B.
    ///
    ///      Writer is not a financial protocol. Every signature here
    ///      authorizes the signer to author/edit/remove their own content.
    ///      A "replayed" signature on a second chain just creates an
    ///      identical entry authored by the same person, with no value
    ///      transfer and no privilege escalation. The threat model that
    ///      makes cross-chain replay dangerous (asset extraction, nonce
    ///      burning, role grants via signature) does not apply.
    ///
    ///      Removing chainId turns this into a feature: when Writer is
    ///      deployed at the same address on multiple chains (via the
    ///      Arachnid deterministic deployer + identical bytecode + the same
    ///      CREATE2 salts), a single user signature is portable across
    ///      every chain it appears on. This enables:
    ///        - "Write in rocks" mode: publish the same entry to multiple
    ///          chains with one signature, no per-chain re-signing.
    ///        - Lossless future migrations: launch on a new chain by
    ///          replaying historical signatures from the DB. Original
    ///          author provenance is preserved on every chain — no admin
    ///          override, no "trust me" bulk import.
    ///        - Idempotent retries: if a multi-chain publish partially
    ///          fails, the same signature can be resubmitted to the failed
    ///          chain later because each chain has its own independent
    ///          digestWasExecuted map.
    ///
    ///      Replay protection inside a single chain is unaffected: the
    ///      digest is still unique per (verifyingContract, structHash) and
    ///      `digestWasExecuted` (in Writer.sol) blocks any second
    ///      execution against the same digest on the same instance.
    ///
    ///      If a future security analyzer flags this, the rationale is
    ///      this comment block. Do not "fix" by re-adding chainId without
    ///      understanding what you'd lose.
    constructor(string memory name, string memory version) {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,address verifyingContract)"),
                keccak256(bytes(name)), // name (per EIP-712 spec, hashed as bytes)
                keccak256(bytes(version)), // version
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
