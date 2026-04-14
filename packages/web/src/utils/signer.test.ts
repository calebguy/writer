import { describe, expect, test } from "bun:test";
import type { ConnectedWallet } from "@privy-io/react-auth";
import { getDerivedSigningKeyV4 } from "./signer";
import { decrypt, encrypt } from "./utils";

// -----------------------------------------------------------------------------
// v4 encryption: end-to-end round-trip + property tests for audit C-1.
//
// These tests pin the security-critical properties of v4 key derivation and
// AES-256-GCM round trips. They use a stub wallet whose `getEthereumProvider`
// returns a controllable provider, so we can drive the EIP-712 signing path
// deterministically without a real wallet.
// -----------------------------------------------------------------------------

const WALLET_ADDRESS = "0x1111111111111111111111111111111111111111";
const STORAGE_ID_A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const STORAGE_ID_B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

/**
 * Build a stub wallet whose provider.request returns the given signature
 * regardless of input. Type-cast through unknown because ConnectedWallet has
 * many fields we don't care about for this test.
 */
function stubWallet(signature: string): ConnectedWallet {
	return {
		address: WALLET_ADDRESS,
		getEthereumProvider: async () => ({
			request: async (_params: unknown) => signature,
		}),
	} as unknown as ConnectedWallet;
}

/**
 * Build a stub wallet whose provider.request inspects the EIP-712 payload
 * and returns a different signature depending on the storageId in the
 * message body. This lets us simulate "the wallet really would produce a
 * different signature for a different storageId."
 */
function payloadSensitiveWallet(): ConnectedWallet {
	return {
		address: WALLET_ADDRESS,
		getEthereumProvider: async () => ({
			request: async (params: { method: string; params: unknown[] }) => {
				const payloadJson = params.params[1] as string;
				const payload = JSON.parse(payloadJson);
				const storageId = payload.message.storageId as string;
				// Deterministic but distinct signature per storageId. The exact
				// bytes don't matter as long as they're 65 bytes (130 hex + 0x).
				// We pad the storageId out to 130 hex chars.
				const padded = storageId
					.replace(/^0x/, "")
					.padStart(130, "f")
					.slice(0, 130);
				return `0x${padded}`;
			},
		}),
	} as unknown as ConnectedWallet;
}

// A real-looking 65-byte signature (r || s || v). Low-S, valid v=27.
const FIXED_SIG =
	"0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789" +
	"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" +
	"1b";

describe("getDerivedSigningKeyV4", () => {
	test("produces a 32-byte AES-256 key", async () => {
		const wallet = stubWallet(FIXED_SIG);
		const key = await getDerivedSigningKeyV4(wallet, STORAGE_ID_A);
		expect(key).toBeInstanceOf(Uint8Array);
		expect(key.length).toBe(32);
	});

	test("is deterministic for the same signature input", async () => {
		const wallet1 = stubWallet(FIXED_SIG);
		const wallet2 = stubWallet(FIXED_SIG);
		const key1 = await getDerivedSigningKeyV4(wallet1, STORAGE_ID_A);
		const key2 = await getDerivedSigningKeyV4(wallet2, STORAGE_ID_A);
		expect(Array.from(key1)).toEqual(Array.from(key2));
	});

	test("produces different keys for different signatures", async () => {
		// HKDF-SHA256 is collision-resistant, so any two distinct signatures
		// must produce distinct keys.
		const sigA = FIXED_SIG;
		const sigB =
			"0x1111111111111111111111111111111111111111111111111111111111111111" +
			"2222222222222222222222222222222222222222222222222222222222222222" +
			"1c";

		const keyA = await getDerivedSigningKeyV4(stubWallet(sigA), STORAGE_ID_A);
		const keyB = await getDerivedSigningKeyV4(stubWallet(sigB), STORAGE_ID_A);
		expect(Array.from(keyA)).not.toEqual(Array.from(keyB));
	});

	test("produces different keys for different storageIds (when wallet honors the payload)", async () => {
		// A real wallet would produce a different signature for a different
		// EIP-712 message, which in turn produces a different HKDF output.
		// Using a payload-sensitive stub to simulate this.
		const wallet = payloadSensitiveWallet();
		const keyForA = await getDerivedSigningKeyV4(wallet, STORAGE_ID_A);
		const keyForB = await getDerivedSigningKeyV4(wallet, STORAGE_ID_B);
		expect(Array.from(keyForA)).not.toEqual(Array.from(keyForB));
	});

	test("calls the wallet with eth_signTypedData_v4 and a Writer Encryption domain", async () => {
		// Capture the request params to verify we're using the EIP-712 path,
		// not personal_sign, and that the domain is what we expect. Using a
		// mutable container instead of two `let`s so TypeScript's narrowing
		// inside the async callback doesn't get confused.
		type CapturedPayload = {
			domain: { name: string; version: string };
			primaryType: string;
			message: { storageId: string };
		};
		const captured: { method?: string; payload?: CapturedPayload } = {};
		const wallet = {
			address: WALLET_ADDRESS,
			getEthereumProvider: async () => ({
				request: async (params: { method: string; params: unknown[] }) => {
					captured.method = params.method;
					captured.payload = JSON.parse(
						params.params[1] as string,
					) as CapturedPayload;
					return FIXED_SIG;
				},
			}),
		} as unknown as ConnectedWallet;

		await getDerivedSigningKeyV4(wallet, STORAGE_ID_A);

		expect(captured.method).toBe("eth_signTypedData_v4");
		expect(captured.payload).toBeDefined();
		const payload = captured.payload as CapturedPayload;
		expect(payload.domain.name).toBe("Writer Encryption");
		expect(payload.domain.version).toBe("1");
		// chainId and verifyingContract MUST NOT appear in the domain (the
		// derivation is intentionally chain-portable + contract-portable).
		expect("chainId" in payload.domain).toBe(false);
		expect("verifyingContract" in payload.domain).toBe(false);
		// The storageId is in the message body, lowercased.
		expect(payload.message.storageId).toBe(STORAGE_ID_A.toLowerCase());
		expect(payload.primaryType).toBe("DeriveKey");
	});
});

describe("encrypt + decrypt round trip with v4 keys", () => {
	test("decrypts what encrypt produced", async () => {
		const wallet = stubWallet(FIXED_SIG);
		const key = await getDerivedSigningKeyV4(wallet, STORAGE_ID_A);

		const plaintext = "this is a private journal entry";
		const ciphertext = await encrypt(key, plaintext);
		expect(ciphertext).not.toBe(plaintext);
		expect(ciphertext.length).toBeGreaterThan(0);

		const recovered = await decrypt(key, ciphertext);
		expect(recovered).toBe(plaintext);
	});

	test("re-encrypting the same plaintext produces different ciphertext (random IV)", async () => {
		const wallet = stubWallet(FIXED_SIG);
		const key = await getDerivedSigningKeyV4(wallet, STORAGE_ID_A);
		const plaintext = "deterministic plaintext";

		const c1 = await encrypt(key, plaintext);
		const c2 = await encrypt(key, plaintext);

		// Random IV → ciphertexts must differ.
		expect(c1).not.toBe(c2);

		// But both decrypt to the same plaintext.
		expect(await decrypt(key, c1)).toBe(plaintext);
		expect(await decrypt(key, c2)).toBe(plaintext);
	});

	test("decryption fails with the wrong key", async () => {
		const walletA = stubWallet(FIXED_SIG);
		const walletB = payloadSensitiveWallet();
		const keyA = await getDerivedSigningKeyV4(walletA, STORAGE_ID_A);
		const keyB = await getDerivedSigningKeyV4(walletB, STORAGE_ID_B);

		const plaintext = "secret";
		const ciphertext = await encrypt(keyA, plaintext);

		// AES-GCM is authenticated; decryption with the wrong key throws.
		await expect(decrypt(keyB, ciphertext)).rejects.toThrow();
	});

	test("handles empty plaintext", async () => {
		const wallet = stubWallet(FIXED_SIG);
		const key = await getDerivedSigningKeyV4(wallet, STORAGE_ID_A);
		const ciphertext = await encrypt(key, "");
		const recovered = await decrypt(key, ciphertext);
		expect(recovered).toBe("");
	});

	test("handles unicode plaintext", async () => {
		const wallet = stubWallet(FIXED_SIG);
		const key = await getDerivedSigningKeyV4(wallet, STORAGE_ID_A);
		const plaintext = "🦊 émojis and unicode ✨ こんにちは";
		const ciphertext = await encrypt(key, plaintext);
		const recovered = await decrypt(key, ciphertext);
		expect(recovered).toBe(plaintext);
	});
});
