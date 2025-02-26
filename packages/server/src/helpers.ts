import { type Hex, getAddress, recoverTypedDataAddress } from "viem";

import { env } from "./env";

const getDomain = (address: Hex) => ({
	name: "Writer",
	version: "1",
	chainId: env.TARGET_CHAIN_ID,
	verifyingContract: getAddress(address),
});

export function recoverCreateWithChunkSigner({
	signature,
	nonce,
	chunkContent,
	chunkCount,
	address,
}: {
	signature: Hex;
	nonce: bigint;
	chunkContent: string;
	chunkCount: bigint;
	address: Hex;
}) {
	return recoverTypedDataAddress({
		domain: getDomain(address),
		message: {
			nonce,
			chunkCount,
			chunkContent,
		},
		primaryType: "CreateWithChunk",
		types: {
			CreateWithChunk: [
				{ name: "nonce", type: "uint256" },
				{ name: "chunkCount", type: "uint256" },
				{ name: "chunkContent", type: "string" },
			],
		},
		signature,
	});
}

export function recoverUpdateEntryWithChunkSigner({
	signature,
	nonce,
	totalChunks,
	content,
	entryId,
	address,
}: {
	signature: Hex;
	nonce: bigint;
	totalChunks: bigint;
	content: string;
	entryId: bigint;
	address: Hex;
}) {
	// Recover the address
	return recoverTypedDataAddress({
		domain: getDomain(address),
		message: {
			nonce,
			totalChunks,
			content,
			entryId,
		},
		primaryType: "Update",
		types: {
			Update: [
				{ name: "nonce", type: "uint256" },
				{ name: "entryId", type: "uint256" },
				{ name: "totalChunks", type: "uint256" },
				{ name: "content", type: "string" },
			],
		},
		signature,
	});
}

export function recoverRemoveEntrySigner({
	signature,
	nonce,
	id,
	address,
}: {
	signature: Hex;
	nonce: bigint;
	id: bigint;
	address: Hex;
}) {
	return recoverTypedDataAddress({
		domain: getDomain(address),
		message: {
			nonce,
			id,
		},
		primaryType: "Remove",
		types: {
			Remove: [
				{ name: "nonce", type: "uint256" },
				{ name: "id", type: "uint256" },
			],
		},
		signature,
	});
}

export function recoverSetColorSigner({
	signature,
	nonce,
	hexColor,
	address,
}: {
	signature: Hex;
	nonce: bigint;
	hexColor: Hex;
	address: Hex;
}) {
	return recoverTypedDataAddress({
		domain: {
			name: "ColorRegistry",
			version: "1",
			chainId: env.TARGET_CHAIN_ID,
			verifyingContract: getAddress(address),
		},
		message: {
			nonce,
			hexColor,
		},
		primaryType: "SetHex",
		types: {
			SetHex: [
				{ name: "nonce", type: "uint256" },
				{ name: "hexColor", type: "bytes32" },
			],
		},
		signature,
	});
}
