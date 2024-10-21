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
import { CREATE_FUNCTION_SIGNATURE, TARGET_CHAIN_ID } from "./constants";
import { prisma } from "./db";
import { env } from "./env";
import { jsonSafe } from "./helpers";
import { createSchema } from "./schema";

const app = new Hono();
export const syndicate = new SyndicateClient({ token: env.SYNDICATE_API_KEY });
const projectId = env.SYNDICATE_PROJECT_ID;

app.use("*", serveStatic({ root: "../ui/dist" }));
app.use("*", serveStatic({ path: "../ui/dist/index.html" }));

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
			},
		});
		return c.json(jsonSafe(writer));
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
			},
		});
		return c.json({ writers: jsonSafe(writers) });
	})
	.post("/create", zValidator("json", createSchema), async (c) => {
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
		});
		console.log("created new writer", writer);
		return c.json({ writer: jsonSafe(writer) }, 200);
	});

getAllWriterCreatedEvents();
listenToNewWriterCreatedEvents();

export type Api = typeof api;
export default app;
