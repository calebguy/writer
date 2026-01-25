import type { ConnectedWallet } from "@privy-io/react-auth";
import { type Hex, getAddress, keccak256 } from "viem";

if (!process.env.NEXT_PUBLIC_COLOR_REGISTRY_ADDRESS) {
	throw new Error("NEXT_PUBLIC_COLOR_REGISTRY_ADDRESS is not set");
}

if (!process.env.NEXT_PUBLIC_TARGET_CHAIN_ID) {
	throw new Error("NEXT_PUBLIC_TARGET_CHAIN_ID is not set");
}

const COLOR_REGISTRY_ADDRESS = process.env
	.NEXT_PUBLIC_COLOR_REGISTRY_ADDRESS as Hex;
const TARGET_CHAIN_ID = process.env.NEXT_PUBLIC_TARGET_CHAIN_ID;

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
			chainId: TARGET_CHAIN_ID,
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
				{ name: "chainId", type: "uint256" },
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
	{ id, address }: { id: number; address: string },
) {
	const provider = await wallet.getEthereumProvider();
	const method = "eth_signTypedData_v4";
	const nonce = getRandomNonce();
	const payload = {
		domain: {
			name: "Writer",
			version: "1",
			chainId: TARGET_CHAIN_ID,
			verifyingContract: getAddress(address),
		},
		message: {
			nonce,
			id,
		},
		primaryType: "Remove",
		types: {
			EIP712Domain: [
				{ name: "name", type: "string" },
				{ name: "version", type: "string" },
				{ name: "chainId", type: "uint256" },
				{ name: "verifyingContract", type: "address" },
			],
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
	}: { entryId: number; address: string; content: string },
) {
	const totalChunks = 1;
	const nonce = getRandomNonce();

	const provider = await wallet.getEthereumProvider();
	const method = "eth_signTypedData_v4";
	const payload = {
		domain: {
			name: "Writer",
			version: "1",
			chainId: TARGET_CHAIN_ID,
			verifyingContract: getAddress(address),
		},
		message: {
			nonce,
			entryId,
			totalChunks,
			content,
		},
		primaryType: "Update",
		types: {
			EIP712Domain: [
				{ name: "name", type: "string" },
				{ name: "version", type: "string" },
				{ name: "chainId", type: "uint256" },
				{ name: "verifyingContract", type: "address" },
			],
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
	{ content, address }: { content: string; address: string },
) {
	const chunkCount = 1;
	const nonce = getRandomNonce();
	const chunkContent = content;

	const provider = await wallet.getEthereumProvider();
	const method = "eth_signTypedData_v4";
	const payload = {
		domain: {
			name: "Writer",
			version: "1",
			chainId: TARGET_CHAIN_ID,
			verifyingContract: getAddress(address),
		},
		message: {
			nonce,
			chunkContent,
			chunkCount,
		},
		primaryType: "CreateWithChunk",
		types: {
			EIP712Domain: [
				{ name: "name", type: "string" },
				{ name: "version", type: "string" },
				{ name: "chainId", type: "uint256" },
				{ name: "verifyingContract", type: "address" },
			],
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
	return Math.floor(Math.random() * 1000000000000);
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

// Default export uses v2 for new encryptions
export const getDerivedSigningKey = getDerivedSigningKeyV2;
