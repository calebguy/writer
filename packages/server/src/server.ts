import { zValidator } from "@hono/zod-validator";
import { SyndicateClient } from "@syndicateio/syndicate-node";

import { TransactionStatus } from "@prisma/client";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { getAddress } from "viem";
import {
	getAllWriterCreatedEvents,
	listenToNewWriterCreatedEvents,
} from "./chain";
import {
	CREATE_FUNCTION_SIGNATURE,
	CREATE_WITH_CHUNK_WITH_SIG_FUNCTION_SIGNATURE,
	TARGET_CHAIN_ID,
} from "./constants";
import { prisma, writerToJsonSafe } from "./db";
import { env } from "./env";
import { getChunksFromContent } from "./helpers";
import { createWithChunkSchema, createWriterSchema } from "./requestSchema";

const app = new Hono();
export const syndicate = new SyndicateClient({ token: env.SYNDICATE_API_KEY });
const projectId = env.SYNDICATE_PROJECT_ID;

app.use("*", serveStatic({ root: "../ui/dist" }));
app.use("*", serveStatic({ path: "../ui/dist/index.html" }));

listenToNewWriterCreatedEvents();
getAllWriterCreatedEvents();

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
		});
		return c.json(writer ? writerToJsonSafe(writer) : null);
	})
	.get("/account/:address", async (c) => {
		const address = getAddress(c.req.param("address"));
		const writers = await prisma.writer.findMany({
			orderBy: {
				createdAt: "desc",
			},
			where: {
				admin: address,
			},
			include: {
				entries: true,
				transaction: true,
			},
		});
		return c.json({
			writers: writers.map(writerToJsonSafe),
		});
	})
	.post("/writer", zValidator("json", createWriterSchema), async (c) => {
		const { admin, managers, title } = c.req.valid("json");
		console.log(
			`creating new writing with admin: ${admin} and managers: ${managers}`,
		);
		const args = { title, admin, managers };
		const { transactionId } = await syndicate.transact.sendTransaction({
			projectId,
			contractAddress: env.FACTORY_ADDRESS,
			chainId: TARGET_CHAIN_ID,
			functionSignature: CREATE_FUNCTION_SIGNATURE,
			args,
		});
		console.log("got transaction id", transactionId);
		await prisma.syndicateTransaction.create({
			data: {
				id: transactionId,
				chainId: TARGET_CHAIN_ID,
				projectId,
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
		console.log("created new writer", writer);
		return c.json({ writer: writerToJsonSafe(writer) }, 200);
	})
	.post(
		"/writer/:address/entry",
		zValidator("json", createWithChunkSchema),
		async (c) => {
			const address = getAddress(c.req.param("address"));
			const { content, signature, nonce } = c.req.valid("json");

			const writer = await prisma.writer.findFirst({
				where: {
					address,
				},
			});
			if (!writer) {
				return c.json({ error: "Writer not found" }, 404);
			}

			const chunks = getChunksFromContent(content);
			if (chunks.length === 1) {
				const args = {
					signature,
					nonce,
					totalChunks: 1,
					chunkContent: chunks[0],
				};
				const { transactionId } = await syndicate.transact.sendTransaction({
					projectId,
					contractAddress: address,
					chainId: TARGET_CHAIN_ID,
					functionSignature: CREATE_WITH_CHUNK_WITH_SIG_FUNCTION_SIGNATURE,
					args,
				});
				console.log(
					"got transaction id for single chunk entry creation",
					transactionId,
				);
				await prisma.syndicateTransaction.create({
					data: {
						id: transactionId,
						chainId: TARGET_CHAIN_ID,
						projectId,
						functionSignature: CREATE_WITH_CHUNK_WITH_SIG_FUNCTION_SIGNATURE,
						args,
						status: TransactionStatus.PENDING,
					},
				});
				// @note TODO: implement this
			} else {
				console.log("multiple chunks received", chunks);
			}
			// @note based on the chunks here we can either call createEntryWithContent or createEntry
			return c.json({ content });
		},
	);

export type Api = typeof api;
export default app;
