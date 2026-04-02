import { PrivyClient } from "@privy-io/server-auth";
import type { Context, Next } from "hono";
import { getAddress } from "viem";
import { env } from "./env";

const privy = new PrivyClient(env.PRIVY_APP_ID, env.PRIVY_SECRET);

/**
 * Hono middleware that verifies the Privy access token from the Authorization header
 * and checks that the authenticated user's wallet matches the :userAddress route param.
 */
export async function requireSavedAuth(c: Context, next: Next) {
	const authHeader = c.req.header("Authorization");
	if (!authHeader?.startsWith("Bearer ")) {
		return c.json({ error: "unauthorized" }, 401);
	}

	const token = authHeader.slice(7);
	let user;
	try {
		const verifiedClaims = await privy.verifyAuthToken(token);
		user = await privy.getUser(verifiedClaims.userId);
	} catch {
		return c.json({ error: "unauthorized" }, 401);
	}

	const userAddress = c.req.param("userAddress");
	if (!userAddress) {
		return c.json({ error: "unauthorized" }, 401);
	}

	const walletAddress = user.wallet?.address;
	if (
		!walletAddress ||
		getAddress(walletAddress) !== getAddress(userAddress)
	) {
		return c.json({ error: "forbidden" }, 403);
	}

	await next();
}
