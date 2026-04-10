import { PrivyClient } from "@privy-io/server-auth";
import type { Context, Next } from "hono";
import type { Hex } from "viem";
import { getAddress } from "viem";
import { db } from "./constants";
import { env } from "./env";

// Tell Hono about the variables our middlewares stash on the request
// context, so route handlers get type-safe access to `c.var.walletAddress`.
declare module "hono" {
	interface ContextVariableMap {
		walletAddress: Hex;
	}
}

const privy = new PrivyClient(env.PRIVY_APP_ID, env.PRIVY_SECRET);

function getAuthenticatedWallet(c: Context) {
	const authHeader = c.req.header("Authorization");
	if (!authHeader?.startsWith("Bearer ")) {
		return null;
	}
	return authHeader.slice(7);
}

async function verifyPrivyToken(token: string) {
	const verifiedClaims = await privy.verifyAuthToken(token);
	const user = await privy.getUser(verifiedClaims.userId);
	return user.wallet?.address;
}

/**
 * Verifies the Privy token and checks that the authenticated user's wallet
 * matches the :userAddress route param.
 */
export async function requireSavedAuth(c: Context, next: Next) {
	const token = getAuthenticatedWallet(c);
	if (!token) {
		return c.json({ error: "unauthorized" }, 401);
	}

	let walletAddress: string | undefined;
	try {
		walletAddress = await verifyPrivyToken(token);
	} catch {
		return c.json({ error: "unauthorized" }, 401);
	}

	const userAddress = c.req.param("userAddress");
	if (
		!userAddress ||
		!walletAddress ||
		getAddress(walletAddress) !== getAddress(userAddress)
	) {
		return c.json({ error: "forbidden" }, 403);
	}

	await next();
}

/**
 * Verifies the Privy token and stashes the authenticated wallet address on
 * the Hono context as `c.var.walletAddress`. Used by every endpoint that
 * fires a relayer transaction (audit fixes for H-2 / H-3): the route handler
 * is then expected to assert that the EIP-712 recovered signer (or, for
 * /factory/create, the request body's `admin` field) matches `walletAddress`.
 *
 * Centralizing the token verification here means individual route handlers
 * only need to do the equality check, not the JWT parse.
 */
export async function requireWalletAuth(c: Context, next: Next) {
	const token = getAuthenticatedWallet(c);
	if (!token) {
		return c.json({ error: "unauthorized" }, 401);
	}

	let walletAddress: string | undefined;
	try {
		walletAddress = await verifyPrivyToken(token);
	} catch {
		return c.json({ error: "unauthorized" }, 401);
	}
	if (!walletAddress) {
		return c.json({ error: "unauthorized" }, 401);
	}

	c.set("walletAddress", getAddress(walletAddress) as Hex);
	await next();
}

/**
 * Verifies the Privy token and checks that the authenticated user's wallet
 * is the admin of the writer at :address.
 */
export async function requireWriterAdminAuth(c: Context, next: Next) {
	const token = getAuthenticatedWallet(c);
	if (!token) {
		return c.json({ error: "unauthorized" }, 401);
	}

	let walletAddress: string | undefined;
	try {
		walletAddress = await verifyPrivyToken(token);
	} catch {
		return c.json({ error: "unauthorized" }, 401);
	}

	if (!walletAddress) {
		return c.json({ error: "unauthorized" }, 401);
	}

	const address = c.req.param("address");
	if (!address) {
		return c.json({ error: "unauthorized" }, 401);
	}

	const writer = await db.getWriter(getAddress(address) as Hex);
	if (!writer) {
		return c.json({ error: "writer not found" }, 404);
	}

	if (getAddress(writer.admin) !== getAddress(walletAddress)) {
		return c.json({ error: "forbidden" }, 403);
	}

	await next();
}
