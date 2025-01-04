import { type Hex, getAddress } from "viem";

import type { WalletWithMetadata } from "@privy-io/server-auth";

import type { Context } from "hono";
import { createMiddleware } from "hono/factory";

import { getCookie } from "hono/cookie";
import { privy } from "./constants";

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
			return c.json({ error: "privy-id-token not found" }, 401);
		}
		if (e instanceof PrivyUserAddressNotFoundError) {
			return c.json({ error: "user address not found" }, 401);
		}
		return c.json({ error: "internal server error" }, 500);
	}
});
