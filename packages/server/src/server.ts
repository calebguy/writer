import { zValidator } from "@hono/zod-validator";
import { TransactionStatus } from "@prisma/client";
import { PrivyClient, type WalletWithMetadata } from "@privy-io/server-auth";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { getCookie } from "hono/cookie";
import { getAddress } from "viem";
import {
	CREATE_FUNCTION_SIGNATURE,
	CREATE_WITH_CHUNK_WITH_SIG_FUNCTION_SIGNATURE,
	TARGET_CHAIN_ID,
} from "./constants";
import { prisma, writerToJsonSafe } from "./db";
import { env } from "./env";
import factoryListener from "./listener/factoryListener";
import { createWithChunkSchema, createWriterSchema } from "./requestSchema";
import { syndicate } from "./syndicate";

const app = new Hono();

app.use("*", serveStatic({ root: "../ui/dist" }));
app.use("*", serveStatic({ path: "../ui/dist/index.html" }));

factoryListener.init();

const privy = new PrivyClient(env.PRIVY_APP_ID, env.PRIVY_SECRET);

const api = app
	.basePath("/api")
	.get("/writer/:address", async (c) => {
		const address = getAddress(c.req.param("address"));
		const writer = await prisma.writer.findFirst({
			where: {
				address,
			},
			include: {
				entries: true,
				transaction: true,
			},
			orderBy: {
				onChainId: "desc",
			},
		});
		return c.json(writer ? writerToJsonSafe(writer) : null);
	})
	.get("/author/:address", async (c) => {
		const address = getAddress(c.req.param("address"));
		const writers = await prisma.writer.findMany({
			where: {
				admin: address,
			},
			include: {
				entries: true,
				transaction: true,
			},
			orderBy: {
				onChainId: "desc",
			},
		});
		return c.json({
			writers: writers.map(writerToJsonSafe),
		});
	})
	.post(
		"/factory/create",
		zValidator("json", createWriterSchema),
		async (c) => {
			const { admin, managers, title } = c.req.valid("json");
			const args = { title, admin, managers };
			const { transactionId } = await syndicate.transact.sendTransaction({
				projectId: env.SYNDICATE_PROJECT_ID,
				contractAddress: env.FACTORY_ADDRESS,
				chainId: TARGET_CHAIN_ID,
				functionSignature: CREATE_FUNCTION_SIGNATURE,
				args,
			});
			await prisma.syndicateTransaction.create({
				data: {
					id: transactionId,
					chainId: TARGET_CHAIN_ID,
					projectId: env.SYNDICATE_PROJECT_ID,
					functionSignature: CREATE_FUNCTION_SIGNATURE,
					args,
					status: TransactionStatus.PENDING,
				},
			});
			const writer = await prisma.writer.create({
				data: {
					title,
					admin,
					managers,
					transactionId,
				},
				include: {
					entries: true,
					transaction: true,
				},
			});
			return c.json({ writer: writerToJsonSafe(writer) }, 200);
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
			const writer = await prisma.writer.findFirst({
				where: {
					address: getAddress(contractAddress),
				},
			});
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
			await prisma.syndicateTransaction.create({
				data: {
					id: transactionId,
					chainId: TARGET_CHAIN_ID,
					projectId: env.SYNDICATE_PROJECT_ID,
					functionSignature: CREATE_WITH_CHUNK_WITH_SIG_FUNCTION_SIGNATURE,
					args,
					status: TransactionStatus.PENDING,
				},
			});
			const entry = await prisma.entry.create({
				data: {
					exists: true,
					writerId: writer.id,
					transactionId,
					content: chunkContent,
				},
			});
			return c.json({ entry }, 200);
		},
	);

export type Api = typeof api;
export default app;
