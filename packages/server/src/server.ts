import { zValidator } from "@hono/zod-validator";
import { entryToJsonSafe, writerToJsonSafe } from "db";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { randomBytes } from "node:crypto";
import { computeWriterAddress, computeWriterStorageAddress } from "utils";
import { type Hex, getAddress, toHex } from "viem";
import {
	CREATE_FUNCTION_SIGNATURE,
	CREATE_WITH_CHUNK_WITH_SIG_FUNCTION_SIGNATURE,
	TARGET_CHAIN_ID,
	db,
} from "./constants";
import { env } from "./env";
import { privyAuthMiddleware } from "./helpers";
import { createWithChunkSchema, createWriterSchema } from "./requestSchema";
import { syndicate } from "./syndicate";

const app = new Hono();

app.use("*", serveStatic({ root: "../ui/dist" }));
app.use("*", serveStatic({ path: "../ui/dist/index.html" }));

const api = app
	.basePath("/api")
	.get("/manager/:address", async (c) => {
		const address = getAddress(c.req.param("address"));
		const data = await db.getWritersByManager(address);
		const writers = data.map((w) => ({
			...writerToJsonSafe(w),
			entries: w.entries.map(entryToJsonSafe),
		}));
		return c.json({ writers });
	})
	.get("/writer/:address", async (c) => {
		const address = getAddress(c.req.param("address"));
		const data = await db.getWriter(address);
		if (!data) {
			return c.json({ error: "writer not found" }, 404);
		}
		const writer = {
			...writerToJsonSafe(data),
			entries: data.entries.map(entryToJsonSafe),
		};
		return c.json({ writer });
	})
	.post(
		"/writer/:address/createWithChunk",
		zValidator("json", createWithChunkSchema),
		privyAuthMiddleware,
		async (c) => {
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

			const data = await db.upsertEntry({
				exists: true,
				storageAddress: writer.storageAddress,
				transactionId,
				content: chunkContent,
			});
			const entry = entryToJsonSafe(data[0]);
			return c.json({ entry }, 201);
		},
	)
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
			const data = await db.upsertWriter({
				title,
				admin,
				managers,
				transactionId,
				address,
				storageAddress,
			});
			const writer = writerToJsonSafe(data[0]);
			return c.json({ writer }, 201);
		},
	);

export type Api = typeof api;
export default app;
