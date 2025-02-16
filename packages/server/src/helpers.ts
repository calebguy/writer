import { type Hex, getAddress, recoverTypedDataAddress } from "viem";

import type { WalletWithMetadata } from "@privy-io/server-auth";

import type { Context } from "hono";
import { createMiddleware } from "hono/factory";

import { getCookie } from "hono/cookie";
import { privy } from "./constants";
import { env } from "./env";

export class PrivyUserNotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "PrivyUserNotFoundError";
	}
}

export class PrivyUserAddressNotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "PrivyUserAddressNotFoundError";
	}
}

// @note TODO: this should be a middleware
export const getPrivyUserAddress = async (c: Context) => {
	const privyIdToken = getCookie(c, "privy-id-token");
	if (!privyIdToken) {
		throw new PrivyUserNotFoundError("privy-id-token not found");
	}
	const privyUser = await privy.getUser({ idToken: privyIdToken });
	const userWallet: WalletWithMetadata = privyUser.linkedAccounts.filter(
		(accnt) => accnt.type === "wallet" && accnt.walletClientType === "privy",
	)?.[0] as WalletWithMetadata;
	const userAddress = getAddress(userWallet.address);
	if (!userAddress) {
		throw new PrivyUserAddressNotFoundError("user address not found");
	}
	// @note TODO: you should also check that the userAddress has WRITER_ROLE on the contract

	return userAddress;
};

// @note: Currently we do not using privy auth, rather we grab the user address from the signature
export const privyAuthMiddleware = createMiddleware<{
	Variables: {
		privyUserAddress: Hex;
	};
}>(async (c, next) => {
	try {
		const userAddress = await getPrivyUserAddress(c);
		c.set("privyUserAddress", userAddress);
		await next();
	} catch (e) {
		if (e instanceof PrivyUserNotFoundError) {
			console.log("privy-id-token not found");
		}
		if (e instanceof PrivyUserAddressNotFoundError) {
			console.log("user address not found");
		}
		console.log("internal server error");
	}
});

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
