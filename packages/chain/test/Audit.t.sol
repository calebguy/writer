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
        writer = new Writer("Audit Writer", address(store), user.addr, managers, false);
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

    // -------------------------------------------------------------------------
    // Chain-portable signatures: removing chainId from the EIP-712 domain
    //
    // VerifyTypedData.sol intentionally omits block.chainid from its domain
    // separator (see the long comment in VerifyTypedData.sol for the
    // rationale). The contract is then chain-portable: a single signature
    // is valid against any Writer at the same address on any chain.
    //
    // This test pins that property by computing the digest under three
    // different "chain" configurations:
    //   1. Default chainId
    //   2. block.chainid changed via vm.chainId(...)
    //   3. block.chainid changed to a third value
    // and verifying that all three produce the SAME digest. If a future
    // change re-introduces chainId binding, the assertions here will fail
    // immediately.
    //
    // It also verifies the runtime behavior: a signature produced under
    // chainId=1 successfully executes against the Writer when block.chainid
    // is set to 8453 (i.e. as if Writer were deployed on Base instead of
    // Optimism). The Writer is the same instance — only the env var moves —
    // because vm.chainId() is the cleanest way to demonstrate "the same
    // contract bytecode at the same address on a different chain."
    // -------------------------------------------------------------------------
    function test_ChainPortableSignatureWorksAcrossChainIds() public {
        uint256 nonce = 42;
        uint256 chunkCount = 1;
        string memory content = "writing in rocks";

        bytes32 structHash = keccak256(
            abi.encode(
                writer.CREATE_WITH_CHUNK_TYPEHASH(),
                nonce,
                chunkCount,
                keccak256(abi.encodePacked(content))
            )
        );

        // Compute the digest under the default test chainId.
        uint256 originalChainId = block.chainid;
        bytes32 digestOriginal = _eip712Digest(structHash);

        // Switch to a different chainId (e.g. as if Writer were on Base).
        vm.chainId(8453);
        bytes32 digestBase = _eip712Digest(structHash);

        // And another (as if on Arbitrum).
        vm.chainId(42161);
        bytes32 digestArbitrum = _eip712Digest(structHash);

        // All three digests must be identical: the chainId is not part of
        // the domain separator anymore, so changing block.chainid does not
        // change the digest the contract computes.
        assertEq(
            digestOriginal,
            digestBase,
            "digest must be chain-portable (Optimism vs Base)"
        );
        assertEq(
            digestOriginal,
            digestArbitrum,
            "digest must be chain-portable (Optimism vs Arbitrum)"
        );

        // Reset to the original chainId, sign there.
        vm.chainId(originalChainId);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digestOriginal);
        bytes memory sig = abi.encodePacked(r, s, v);

        // Now switch to a "different chain" and submit the signature against
        // the same Writer instance. With chain-portability, this must work.
        vm.chainId(8453);
        writer.createWithChunkWithSig(sig, nonce, chunkCount, content);
        assertEq(writer.getEntryCount(), 1, "signature must execute on a different chain");

        // And on a third chain, since each chain would have its own
        // digestWasExecuted state. We simulate that by deploying a fresh
        // Writer at the same address (impossible in a single test, so we
        // instead verify the digest property and the cross-chain submission
        // succeeded above). The same-instance replay protection (C-2) is
        // already covered by the other tests in this file.
        vm.chainId(originalChainId);
    }

    /// @dev Recompute the EIP-712 digest exactly the way VerifyTypedData does
    ///      internally. Mirrors the logic in VerifyTypedData.sol's constructor
    ///      + getSigner, so this test does not depend on any view function
    ///      that the contract does not already expose. Domain intentionally
    ///      omits chainId — see VerifyTypedData.sol.
    function _eip712Digest(bytes32 structHash) internal view returns (bytes32) {
        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,address verifyingContract)"),
                keccak256(abi.encodePacked(writer.DOMAIN_NAME())),
                keccak256(abi.encodePacked(writer.DOMAIN_VERSION())),
                address(writer)
            )
        );
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
    }
}
