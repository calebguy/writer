import type { ConnectedWallet } from "@privy-io/react-auth";
import { type Hex, getAddress, keccak256 } from "viem";
import { env } from "./env";

const COLOR_REGISTRY_ADDRESS = env.NEXT_PUBLIC_COLOR_REGISTRY_ADDRESS as Hex;
const TARGET_CHAIN_ID = env.NEXT_PUBLIC_TARGET_CHAIN_ID;

// EIP-712 domain helper. New writers use a chain-portable domain (no
// chainId) — see VerifyTypedData.sol for the rationale. Legacy writers
// (created by the old factory, before the redeploy) still use the old
// domain WITH chainId because their on-chain VerifyTypedData embeds it.
//
// The `legacyDomain` flag is read from the writer's DB row (exposed via
// the API as `writer.legacyDomain`). It defaults to `true` for old writers
// and is flipped to `false` when a logic migration (setLogic) happens.
function writerDomain(address: string, legacyDomain: boolean) {
	if (legacyDomain) {
		return {
			domain: {
				name: "Writer",
				version: "1",
				chainId: TARGET_CHAIN_ID,
				verifyingContract: getAddress(address),
			},
			domainTypes: [
				{ name: "name", type: "string" },
				{ name: "version", type: "string" },
				{ name: "chainId", type: "uint256" },
				{ name: "verifyingContract", type: "address" },
			],
		};
	}
	return {
		domain: {
			name: "Writer",
			version: "1",
			verifyingContract: getAddress(address),
		},
		domainTypes: [
			{ name: "name", type: "string" },
			{ name: "version", type: "string" },
			{ name: "verifyingContract", type: "address" },
		],
	};
}

export async function signSetColor(
	wallet: ConnectedWallet,
	{ hexColor }: { hexColor: string },
) {
	const provider = await wallet.getEthereumProvider();
	const method = "eth_signTypedData_v4";
	const nonce = getRandomNonce();
	const payload = {
		domain: {
			name: "ColorRegistry",
			version: "1",
			verifyingContract: getAddress(COLOR_REGISTRY_ADDRESS),
		},
		message: {
			nonce,
			hexColor,
		},
		primaryType: "SetHex",
		types: {
			EIP712Domain: [
				{ name: "name", type: "string" },
				{ name: "version", type: "string" },
				{ name: "verifyingContract", type: "address" },
			],
			SetHex: [
				{ name: "nonce", type: "uint256" },
				{ name: "hexColor", type: "bytes32" },
			],
		},
	};
	const signature = await provider.request({
		method,
		params: [wallet.address, JSON.stringify(payload)],
	});

	return {
		signature,
		nonce,
		hexColor,
	};
}

export async function signRemove(
	wallet: ConnectedWallet,
	{
		id,
		address,
		legacyDomain = false,
	}: { id: number; address: string; legacyDomain?: boolean },
) {
	const provider = await wallet.getEthereumProvider();
	const method = "eth_signTypedData_v4";
	const nonce = getRandomNonce();
	const { domain, domainTypes } = writerDomain(address, legacyDomain);
	const payload = {
		domain,
		message: {
			nonce,
			id,
		},
		primaryType: "Remove",
		types: {
			EIP712Domain: domainTypes,
			Remove: [
				{ name: "nonce", type: "uint256" },
				{ name: "id", type: "uint256" },
			],
		},
	};

	const signature = await provider.request({
		method,
		params: [wallet.address, JSON.stringify(payload)],
	});

	return {
		signature,
		nonce,
	};
}

export async function signUpdate(
	wallet: ConnectedWallet,
	{
		entryId,
		address,
		content,
		legacyDomain = false,
	}: {
		entryId: number;
		address: string;
		content: string;
		legacyDomain?: boolean;
	},
) {
	const totalChunks = 1;
	const nonce = getRandomNonce();

	const provider = await wallet.getEthereumProvider();
	const method = "eth_signTypedData_v4";
	const { domain, domainTypes } = writerDomain(address, legacyDomain);
	const payload = {
		domain,
		message: {
			nonce,
			entryId,
			totalChunks,
			content,
		},
		primaryType: "Update",
		types: {
			EIP712Domain: domainTypes,
			Update: [
				{ name: "nonce", type: "uint256" },
				{ name: "entryId", type: "uint256" },
				{ name: "totalChunks", type: "uint256" },
				{ name: "content", type: "string" },
			],
		},
	};

	const signature = await provider.request({
		method,
		params: [wallet.address, JSON.stringify(payload)],
	});

	return {
		signature,
		nonce,
		entryId,
		totalChunks,
		content,
	};
}

export async function signCreateWithChunk(
	wallet: ConnectedWallet,
	{
		content,
		address,
		legacyDomain = false,
	}: { content: string; address: string; legacyDomain?: boolean },
) {
	const chunkCount = 1;
	const nonce = getRandomNonce();
	const chunkContent = content;

	const provider = await wallet.getEthereumProvider();
	const method = "eth_signTypedData_v4";
	const { domain, domainTypes } = writerDomain(address, legacyDomain);
	const payload = {
		domain,
		message: {
			nonce,
			chunkContent,
			chunkCount,
		},
		primaryType: "CreateWithChunk",
		types: {
			EIP712Domain: domainTypes,
			CreateWithChunk: [
				{ name: "nonce", type: "uint256" },
				{ name: "chunkCount", type: "uint256" },
				{ name: "chunkContent", type: "string" },
			],
		},
	};

	const signature = await provider.request({
		method,
		params: [wallet.address, JSON.stringify(payload)],
	});

	return {
		signature,
		nonce,
		chunkCount,
		chunkContent,
	};
}

function getRandomNonce() {
	// Generate 53 bits of entropy — the maximum that fits in a JavaScript
	// `Number` without precision loss (Number.MAX_SAFE_INTEGER === 2^53 - 1).
	//
	// Birthday-collision threshold goes from ~2^16 (~65k entries per user,
	// the previous 32-bit nonce) to ~2^26.5 (~95M entries per user). Way
	// beyond any realistic per-user write volume.
	//
	// We stay inside Number rather than upgrading to bigint because the
	// nonce flows through the JSON wire format (frontend → /writer/...
	// endpoints → relay → calldata) and is currently typed as `number`
	// throughout. Switching to bigint would force every layer to know
	// about it. 53 bits is plenty given the actual threat model and avoids
	// the type-plumbing churn.
	const buf = new Uint32Array(2);
	crypto.getRandomValues(buf);
	// high21 (21 bits from buf[0]) × 2^32 + low32 (32 bits from buf[1])
	// = 53 bits total.
	const high21 = buf[0] & 0x1fffff;
	const low32 = buf[1];
	return high21 * 0x100000000 + low32;
}

// Keep old function for reading legacy entries
export async function getDerivedSigningKeyV1(
	wallet: ConnectedWallet,
): Promise<Uint8Array> {
	const message = "encryption-key-derivation";
	const encodedMessage = `0x${Buffer.from(message, "utf8").toString("hex")}`;
	const provider = await wallet.getEthereumProvider();
	const method = "personal_sign";

	// Sign the message with the wallet
	const signature = await provider.request({
		method,
		params: [encodedMessage, wallet.address],
	});

	// Hash the signature using Keccak-256 to derive a 256-bit key
	const hash = keccak256(signature);

	// Convert the hash to a Uint8Array
	const key = Uint8Array.from(Buffer.from(hash.slice(2), "hex"));

	// Truncate or expand the key to match AES requirements (e.g., 128 bits = 16 bytes)
	return key.slice(0, 16); // Use the first 16 bytes for a 128-bit key
}

// New function with user-friendly message
export async function getDerivedSigningKeyV2(
	wallet: ConnectedWallet,
): Promise<Uint8Array> {
	const message = "Writer: write (privately) today, forever";
	const encodedMessage = `0x${Buffer.from(message, "utf8").toString("hex")}`;
	const provider = await wallet.getEthereumProvider();
	const method = "personal_sign";

	// Sign the message with the wallet
	const signature = await provider.request({
		method,
		params: [encodedMessage, wallet.address],
	});

	// Hash the signature using Keccak-256 to derive a 256-bit key
	const hash = keccak256(signature);

	// Convert the hash to a Uint8Array
	const key = Uint8Array.from(Buffer.from(hash.slice(2), "hex"));

	// Truncate or expand the key to match AES requirements (e.g., 128 bits = 16 bytes)
	return key.slice(0, 16); // Use the first 16 bytes for a 128-bit key
}

// V3 key with security warning message
export async function getDerivedSigningKeyV3(
	wallet: ConnectedWallet,
): Promise<Uint8Array> {
	const message =
		"Writer: write (privately) today, forever.\n\nNOTE: Only sign this message on https://writer.place.";
	const encodedMessage = `0x${Buffer.from(message, "utf8").toString("hex")}`;
	const provider = await wallet.getEthereumProvider();
	const method = "personal_sign";

	const signature = await provider.request({
		method,
		params: [encodedMessage, wallet.address],
	});

	const hash = keccak256(signature);
	const key = Uint8Array.from(Buffer.from(hash.slice(2), "hex"));
	return key.slice(0, 16);
}

// V4 key derivation — fixes audit finding C-1.
//
// v1/v2/v3 all use personal_sign of a fixed string. personal_sign has no
// domain binding, so any malicious site that prompts the user to sign the
// same string can recover the same encryption key. The v3 message tries to
// mitigate this with a textual warning, but textual warnings are not a
// security boundary.
//
// v4 fixes this with three changes:
//
//   1. Sign EIP-712 typed data instead of personal_sign. The EIP-712 domain
//      is structured data that wallets render distinctively, and the schema
//      is committed to via the typehash, so a malicious site cannot prompt
//      a different schema to recover the same key.
//
//   2. Bind the derivation to the writer's *frozen storage_id*, passed as a
//      string field in the message body. The storage_id is set at writer
//      creation time and never changes, even across chain migrations or
//      contract redeploys. This means each writer has its own encryption
//      key (limiting blast radius if any one key is ever compromised) AND
//      that key survives any migration scenario where the storage_id is
//      preserved in the DB.
//
//      We deliberately do NOT use `verifyingContract = currentStorageAddress`
//      in the EIP-712 domain because the contract address can drift across
//      chains or after a non-deterministic redeploy. The storage_id stays
//      constant.
//
//      We deliberately do NOT include `chainId` in the domain. The signature
//      is consumed entirely client-side as HKDF input — it is never
//      submitted to any chain and there is no cross-chain replay scenario
//      to defend against. Omitting chainId makes the derivation chain-
//      portable, matching the chain-portable Writer signatures.
//
//   3. Run the signature through HKDF-SHA256 to derive a 32-byte AES-256
//      key, replacing the v1/v2/v3 pattern of truncating a keccak hash to
//      16 bytes (AES-128).
//
// The wallet UI shows the user:
//   Domain:  Writer Encryption v1
//   Message: storageId: 0x...  purpose: Derive encryption key for ...
// The storageId is a structured field, not a free-text claim, so a phishing
// attempt would have to either know the user's exact storageId in advance
// (it does not — storage_ids are unique per writer and not publicly
// discoverable as belonging to a specific user) or use a different one
// (which would derive a different key, defeating the attack).
export async function getDerivedSigningKeyV4(
	wallet: ConnectedWallet,
	storageId: string,
): Promise<Uint8Array> {
	const provider = await wallet.getEthereumProvider();
	const payload = {
		domain: {
			name: "Writer Encryption",
			version: "1",
		},
		message: {
			storageId: storageId.toLowerCase(),
			purpose:
				"Derive encryption key for private entries on this place. Each Writer has its own key.",
		},
		primaryType: "DeriveKey",
		types: {
			EIP712Domain: [
				{ name: "name", type: "string" },
				{ name: "version", type: "string" },
			],
			DeriveKey: [
				{ name: "storageId", type: "string" },
				{ name: "purpose", type: "string" },
			],
		},
	};

	const signature = (await provider.request({
		method: "eth_signTypedData_v4",
		params: [wallet.address, JSON.stringify(payload)],
	})) as Hex;

	const signatureBytes = Uint8Array.from(
		Buffer.from(signature.slice(2), "hex"),
	);
	const ikm = await crypto.subtle.importKey(
		"raw",
		signatureBytes as BufferSource,
		"HKDF",
		false,
		["deriveBits"],
	);
	const derivedBits = await crypto.subtle.deriveBits(
		{
			name: "HKDF",
			hash: "SHA-256",
			salt: new Uint8Array(0),
			info: new TextEncoder().encode("Writer:enc:v4:AES-256-GCM"),
		},
		ikm,
		256,
	);
	return new Uint8Array(derivedBits);
}

// V5 key derivation — updates the EIP-712 domain name to "writer.place
// encryption" and adds an origin warning to the purpose field. This makes
// the signature request visually identifiable as belonging to writer.place,
// giving users a social signal to reject the prompt on phishing sites.
//
// Cryptographically identical to v4 (same HKDF, same AES-256-GCM), but
// the different domain name produces a different domain separator → different
// signature → different key. Existing v4 entries must be migrated.
export async function getDerivedSigningKeyV5(
	wallet: ConnectedWallet,
	storageId: string,
): Promise<Uint8Array> {
	const provider = await wallet.getEthereumProvider();
	const payload = {
		domain: {
			name: "writer.place encryption",
			version: "1",
		},
		message: {
			storageId: storageId.toLowerCase(),
			purpose:
				"Get your encryption key for this Writer. \n\nNote: Only sign this message from writer.place.",
		},
		primaryType: "DeriveKey",
		types: {
			EIP712Domain: [
				{ name: "name", type: "string" },
				{ name: "version", type: "string" },
			],
			DeriveKey: [
				{ name: "storageId", type: "string" },
				{ name: "purpose", type: "string" },
			],
		},
	};

	const signature = (await provider.request({
		method: "eth_signTypedData_v4",
		params: [wallet.address, JSON.stringify(payload)],
	})) as Hex;

	const signatureBytes = Uint8Array.from(
		Buffer.from(signature.slice(2), "hex"),
	);
	const ikm = await crypto.subtle.importKey(
		"raw",
		signatureBytes as BufferSource,
		"HKDF",
		false,
		["deriveBits"],
	);
	const derivedBits = await crypto.subtle.deriveBits(
		{
			name: "HKDF",
			hash: "SHA-256",
			salt: new Uint8Array(0),
			info: new TextEncoder().encode("Writer:enc:v5:AES-256-GCM"),
		},
		ikm,
		256,
	);
	return new Uint8Array(derivedBits);
}

// Default export uses v5 for new encryptions
export const getDerivedSigningKey = getDerivedSigningKeyV5;
