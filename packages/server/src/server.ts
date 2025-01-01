import { zValidator } from "@hono/zod-validator";
import { PrivyClient, type WalletWithMetadata } from "@privy-io/server-auth";
import { Db } from "db";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { getCookie } from "hono/cookie";
import { randomBytes } from "node:crypto";
import { computeWriterAddress, computeWriterStorageAddress } from "utils";
import { type Hex, getAddress, toHex } from "viem";
import {
	CREATE_FUNCTION_SIGNATURE,
	CREATE_WITH_CHUNK_WITH_SIG_FUNCTION_SIGNATURE,
	TARGET_CHAIN_ID,
} from "./constants";
import { env } from "./env";
import { createWithChunkSchema, createWriterSchema } from "./requestSchema";
import { syndicate } from "./syndicate";

const app = new Hono();

app.use("*", serveStatic({ root: "../ui/dist" }));
app.use("*", serveStatic({ path: "../ui/dist/index.html" }));

const privy = new PrivyClient(env.PRIVY_APP_ID, env.PRIVY_SECRET);
const db = new Db(env.DATABASE_URL);

const api = app
	.basePath("/api")
	.get("/writer/:address", async (c) => {
		const address = getAddress(c.req.param("address"));
		const writer = await db.getWriter(address);
		return c.json(writer);
	})
	.get("/author/:address", async (c) => {
		const address = getAddress(c.req.param("address"));
		const writers = await db.getWriters(address);
		return c.json(writers);
	})
	.post(
		"/factory/create",
		zValidator("json", createWriterSchema),
		async (c) => {
			const { admin, managers, title } = c.req.valid("json");
			const salt = toHex(randomBytes(32));
			const args = { title, admin, managers, salt };
			const [address, storageAddress] = await Promise.all([
				computeWriterAddress({
					address: env.FACTORY_ADDRESS as Hex,
					salt,
					title,
					admin: getAddress(admin),
					managers: managers.map(getAddress),
				}),
				computeWriterStorageAddress({
					address: env.FACTORY_ADDRESS as Hex,
					salt,
				}),
			]);
			const { transactionId } = await syndicate.transact.sendTransaction({
				projectId: env.SYNDICATE_PROJECT_ID,
				contractAddress: env.FACTORY_ADDRESS,
				chainId: TARGET_CHAIN_ID,
				functionSignature: CREATE_FUNCTION_SIGNATURE,
				args,
			});
			await db.createTx({
				id: transactionId,
				chainId: BigInt(TARGET_CHAIN_ID),
				functionSignature: CREATE_FUNCTION_SIGNATURE,
				args,
				status: "PENDING",
			});
			const writer = await db.createWriter({
				title,
				admin,
				managers,
				transactionId,
				address,
				storageAddress,
			});
			return c.json(writer);
		},
	)
	.post(
		"/writer/:address/create",
		zValidator("json", createWithChunkSchema),
		async (c) => {
			// @note TODO: wrap this in middleware probably
			const privyIdToken = getCookie(c, "privy-id-token");
			if (!privyIdToken) {
				return c.json({ error: "privy-id-token not found" }, 401);
			}
			const privyUser = await privy.getUser({ idToken: privyIdToken });
			const userWallet: WalletWithMetadata = privyUser.linkedAccounts.filter(
				(accnt) =>
					accnt.type === "wallet" && accnt.walletClientType === "privy",
			)?.[0] as WalletWithMetadata;
			const userAddress = getAddress(userWallet.address);
			if (!userAddress) {
				return c.json({ error: "user address not found" }, 401);
			}
			// @note TODO: you should also check that the userAddress has WRITER_ROLE on the contract

			const contractAddress = getAddress(c.req.param("address"));
			const writer = await db.getWriter(contractAddress);
			if (!writer) {
				return c.json({ error: "writer not found" }, 404);
			}

			const { signature, nonce, chunkCount, chunkContent } =
				c.req.valid("json");
			const args = { signature, nonce, chunkCount, chunkContent };
			const { transactionId } = await syndicate.transact.sendTransaction({
				projectId: env.SYNDICATE_PROJECT_ID,
				contractAddress,
				chainId: TARGET_CHAIN_ID,
				functionSignature: CREATE_WITH_CHUNK_WITH_SIG_FUNCTION_SIGNATURE,
				args,
			});
			await db.createTx({
				id: transactionId,
				chainId: BigInt(TARGET_CHAIN_ID),
				functionSignature: CREATE_WITH_CHUNK_WITH_SIG_FUNCTION_SIGNATURE,
				args,
				status: "PENDING",
			});

			const entry = await db.createEntry({
				exists: true,
				storageAddress: contractAddress,
				transactionId,
				content: chunkContent,
			});
			return c.json({ entry }, 200);
		},
	);

export type Api = typeof api;
export default app;
