import { PrivyClient } from "@privy-io/server-auth";
import type { Context, Next } from "hono";
import type { Hex } from "viem";
import { getAddress } from "viem";
import { db } from "./constants";
import { env } from "./env";

// Tell Hono about the variables our middlewares stash on the request
// context, so route handlers get type-safe access to `c.var.walletAddresses`.
declare module "hono" {
	interface ContextVariableMap {
		walletAddresses: Set<Hex>;
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
	const walletAddresses = user.linkedAccounts
		.filter((a): a is Extract<typeof a, { type: "wallet" }> => a.type === "wallet")
		.map((a) => a.address);
	return walletAddresses;
}

/**
 * Verifies the Privy token and checks that the authenticated user's wallet
 * matches the :userAddress route param.
 *
 * Note: this middleware reads the URL param raw via `c.req.param`, BEFORE
 * the zod validator (the validator is registered after the middleware in
 * routes/saved.ts). A malformed param could throw inside `getAddress`,
 * which previously bubbled up as a 500. The try/catch around the address
 * normalization converts those into a clean 401, matching the behavior
 * for invalid tokens.
 */
export async function requireSavedAuth(c: Context, next: Next) {
	const token = getAuthenticatedWallet(c);
	if (!token) {
		return c.json({ error: "unauthorized" }, 401);
	}

	let walletAddresses: string[];
	try {
		walletAddresses = await verifyPrivyToken(token);
	} catch {
		return c.json({ error: "unauthorized" }, 401);
	}

	const userAddress = c.req.param("userAddress");
	if (!userAddress || walletAddresses.length === 0) {
		return c.json({ error: "unauthorized" }, 401);
	}

	let normalizedUser: Hex;
	try {
		normalizedUser = getAddress(userAddress) as Hex;
	} catch {
		return c.json({ error: "unauthorized" }, 401);
	}

	const normalizedWallets = new Set(
		walletAddresses.map((a) => getAddress(a) as Hex),
	);
	if (!normalizedWallets.has(normalizedUser)) {
		return c.json({ error: "forbidden" }, 403);
	}

	await next();
}

/**
 * Verifies the Privy token and stashes the authenticated wallet address on
 * the Hono context as `c.var.walletAddresses`. Used by every endpoint that
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

	let walletAddresses: string[];
	try {
		walletAddresses = await verifyPrivyToken(token);
	} catch {
		return c.json({ error: "unauthorized" }, 401);
	}
	if (walletAddresses.length === 0) {
		return c.json({ error: "unauthorized" }, 401);
	}

	c.set(
		"walletAddresses",
		new Set(walletAddresses.map((a) => getAddress(a) as Hex)),
	);
	await next();
}

/**
 * Verifies the Privy token and checks that the authenticated user's wallet
 * is the admin of the writer at :address.
 *
 * Same defensive note as requireSavedAuth: the URL param is read raw via
 * `c.req.param` before any zod validator, so getAddress() is wrapped in
 * try/catch to convert malformed inputs into a clean 401 instead of a 500.
 */
export async function requireWriterAdminAuth(c: Context, next: Next) {
	const token = getAuthenticatedWallet(c);
	if (!token) {
		return c.json({ error: "unauthorized" }, 401);
	}

	let walletAddresses: string[];
	try {
		walletAddresses = await verifyPrivyToken(token);
	} catch {
		return c.json({ error: "unauthorized" }, 401);
	}

	if (walletAddresses.length === 0) {
		return c.json({ error: "unauthorized" }, 401);
	}

	const address = c.req.param("address");
	if (!address) {
		return c.json({ error: "unauthorized" }, 401);
	}

	let normalizedWriterAddress: Hex;
	try {
		normalizedWriterAddress = getAddress(address) as Hex;
	} catch {
		return c.json({ error: "unauthorized" }, 401);
	}

	const writer = await db.getWriter(normalizedWriterAddress);
	if (!writer) {
		return c.json({ error: "writer not found" }, 404);
	}

	let normalizedDbAdmin: Hex;
	try {
		normalizedDbAdmin = getAddress(writer.admin) as Hex;
	} catch {
		return c.json({ error: "forbidden" }, 403);
	}

	const normalizedWallets = new Set(
		walletAddresses.map((a) => getAddress(a) as Hex),
	);
	if (!normalizedWallets.has(normalizedDbAdmin)) {
		return c.json({ error: "forbidden" }, 403);
	}

	await next();
}
