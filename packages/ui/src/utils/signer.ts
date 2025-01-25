import type { ConnectedWallet } from "@privy-io/react-auth";
import { getAddress } from "viem";
import { TARGET_CHAIN_ID } from "../constants";

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
			verifyingContract: getAddress(
				"0x7Bf5B616f5431725bCE61E397173cd6FbFaAC6F1",
			),
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

export async function signDelete(
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

export async function signEdit(
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
