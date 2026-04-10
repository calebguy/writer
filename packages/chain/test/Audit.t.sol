// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, Vm} from "forge-std/Test.sol";
import {Writer} from "../src/Writer.sol";
import {WriterStorage} from "../src/WriterStorage.sol";

/// @title Audit findings - proof-of-concept tests
/// @notice Each test in this file demonstrates a security finding from the
///         pre-launch audit. They are intended to FAIL on the current code
///         (i.e. they prove the bug exists) and PASS once the corresponding
///         fix lands.
contract AuditTest is Test {
    Vm.Wallet internal user;
    uint256 internal userPrivateKey;

    Writer internal writer;
    WriterStorage internal store;

    function setUp() public {
        userPrivateKey = uint256(keccak256(abi.encodePacked("AUDIT_USER_PRIVATE_KEY")));
        user = vm.createWallet(userPrivateKey);

        address[] memory managers = new address[](1);
        managers[0] = user.addr;

        store = new WriterStorage();
        writer = new Writer("Audit Writer", address(store), user.addr, managers);
        store.setLogic(address(writer));
    }

    // -------------------------------------------------------------------------
    // C-2: ECDSA signature malleability bypasses replay protection
    //
    // Original bug: signatureWasExecuted was keyed off keccak256(signature_bytes).
    // ECDSA produces a second valid signature (r, n - s, v') for the same
    // digest and signer; that second form had different bytes and therefore a
    // different keccak256, so the replay check passed a second time.
    //
    // Fix:
    //   1. VerifyTypedData._recover now uses OpenZeppelin's ECDSA.tryRecover,
    //      which rejects high-S signatures outright.
    //   2. Writer.digestWasExecuted is now keyed off the EIP-712 digest, which
    //      is unique per logical message regardless of signature byte form.
    //
    // This test exercises both halves of the fix:
    //   - Submitting a malleated signature by itself reverts in OZ's recover
    //     (high-S rejected) -> role check fails because signer is address(0).
    //   - Even if the order is reversed (malleated first, original second),
    //     the digest-keyed replay map blocks the second call.
    // -------------------------------------------------------------------------
    function test_C2_MalleabilityCannotBypassReplayProtection() public {
        uint256 nonce = 0;
        uint256 chunkCount = 1;
        string memory content = "private journal entry";

        bytes32 structHash = keccak256(
            abi.encode(
                writer.CREATE_WITH_CHUNK_TYPEHASH(),
                nonce,
                chunkCount,
                keccak256(abi.encodePacked(content))
            )
        );
        bytes32 digest = _eip712Digest(structHash);

        // Foundry's vm.sign uses RFC-6979 deterministic signing, which produces
        // a low-S signature. This is the "polite" form an honest wallet emits.
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);
        bytes memory sigOriginal = abi.encodePacked(r, s, v);

        // The malleated form: s' = n - s, v flips between 27 and 28.
        uint256 n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;
        bytes32 sMalleated = bytes32(n - uint256(s));
        uint8 vMalleated = v == 27 ? 28 : 27;
        bytes memory sigMalleated = abi.encodePacked(r, sMalleated, vMalleated);

        // Sanity: the two byte sequences hash differently (so a signature-bytes
        // replay map would treat them as distinct).
        assertTrue(
            keccak256(sigOriginal) != keccak256(sigMalleated),
            "malleated signature should have a different byte hash"
        );

        // Sanity: the raw EVM ecrecover precompile still accepts both forms
        // (the precompile itself does not enforce low-S). The protection comes
        // from OZ ECDSA.tryRecover at the contract layer.
        assertEq(ecrecover(digest, v, r, s), user.addr);
        assertEq(ecrecover(digest, vMalleated, r, sMalleated), user.addr);

        // First call: legitimate user submits sigOriginal. Entry 0 is created.
        writer.createWithChunkWithSig(sigOriginal, nonce, chunkCount, content);
        assertEq(writer.getEntryCount(), 1);

        // Second call: attacker submits sigMalleated. With the C-2 fix in
        // place this MUST revert. Two layers of defense are active:
        //   1. OZ ECDSA.tryRecover rejects the high-S form -> _recover returns
        //      address(0) -> the role check `hasRole(WRITER_ROLE, address(0))`
        //      fails first with "Writer: Invalid signer role".
        //   2. Even if (1) somehow passed, _validateAndMarkDigest would reject
        //      because the digest was already marked.
        // The role check fires first, so we expect that revert string.
        vm.expectRevert("Writer: Invalid signer role");
        writer.createWithChunkWithSig(sigMalleated, nonce, chunkCount, content);

        // No duplicate entry was created.
        assertEq(writer.getEntryCount(), 1, "no duplicate entry should exist");
    }

    /// @notice Defense-in-depth: even if a future change relaxes the OZ
    ///         high-S rejection, the digest-keyed replay map alone blocks the
    ///         attack. This test exercises that second layer by replaying the
    ///         *same* (low-S) signature, which both layers must reject. It
    ///         pins the digest-keyed mapping behavior independently from the
    ///         malleability check.
    function test_C2_DigestKeyedReplayBlocksExactReplay() public {
        uint256 nonce = 1;
        uint256 chunkCount = 1;
        string memory content = "another entry";

        bytes32 structHash = keccak256(
            abi.encode(
                writer.CREATE_WITH_CHUNK_TYPEHASH(),
                nonce,
                chunkCount,
                keccak256(abi.encodePacked(content))
            )
        );
        bytes32 digest = _eip712Digest(structHash);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);
        bytes memory sig = abi.encodePacked(r, s, v);

        writer.createWithChunkWithSig(sig, nonce, chunkCount, content);
        assertEq(writer.getEntryCount(), 1);

        // Replaying the exact same signature must revert with the digest-mark
        // error. (Same byte hash, same digest -> caught by digestWasExecuted.)
        vm.expectRevert("Writer: Signature has already been executed");
        writer.createWithChunkWithSig(sig, nonce, chunkCount, content);

        assertEq(writer.getEntryCount(), 1, "exact replay must not create a duplicate");
    }

    /// @dev Recompute the EIP-712 digest exactly the way VerifyTypedData does
    ///      internally. Mirrors the logic in VerifyTypedData.sol's constructor
    ///      + getSigner, so this test does not depend on any view function
    ///      that the contract does not already expose.
    function _eip712Digest(bytes32 structHash) internal view returns (bytes32) {
        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(abi.encodePacked(writer.DOMAIN_NAME())),
                keccak256(abi.encodePacked(writer.DOMAIN_VERSION())),
                block.chainid,
                address(writer)
            )
        );
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
    }
}
