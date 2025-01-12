import type { ConnectedWallet } from "@privy-io/react-auth";
import { getAddress } from "viem";
import { TARGET_CHAIN_ID } from "../constants";

export async function signDelete(
	wallet: ConnectedWallet,
	{ id, address }: { id: number; address: string },
) {
	const provider = await wallet.getEthereumProvider();
	const method = "eth_signTypedData_v4";
	const nonce = Math.floor(Math.random() * 1000000000000);
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

export async function signCreateWithChunk(
	wallet: ConnectedWallet,
	{ content, address }: { content: string; address: string },
) {
	const chunkCount = 1;
	const nonce = Math.floor(Math.random() * 1000000000000);
	const chunkContent = content;

	const provider = await wallet.getEthereumProvider();
	const method = "eth_signTypedData_v4";
	// To avoid signature collision, a random nonce is used
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
