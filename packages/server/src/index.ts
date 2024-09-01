import { zValidator } from "@hono/zod-validator";
import { SyndicateClient } from "@syndicateio/syndicate-node";
import { waitForHash } from "@syndicateio/syndicate-node/utils";

import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { getAddress } from "viem";
import { getAllWriterCreatedEvents } from "./chain";
import { prisma } from "./db";
import { env } from "./env";
import { createSchema } from "./schema";

const app = new Hono();
const syndicate = new SyndicateClient({ token: env.SYNDICATE_API_KEY });
const projectId = env.SYNDICATE_PROJECT_ID;

app.use("*", serveStatic({ root: "../ui/dist" }));
app.use("*", serveStatic({ path: "../ui/dist/index.html" }));

const api = app
	.basePath("/api")
	.get("/account/:address", async (c) => {
		const address = getAddress(c.req.param("address"));
		const writers = await prisma.writer.findMany({
			where: {
				admin: address,
			},
		});
		return c.json({ writers });
	})
	.post("/create", zValidator("json", createSchema), async (c) => {
		const body = c.req.valid("json");
		const { admin, managers, title } = body;
		console.log(
			`creating new writing with admin: ${admin} and managers: ${managers}`,
		);
		const { transactionId } = await syndicate.transact.sendTransaction({
			projectId,
			contractAddress: env.FACTORY_ADDRESS,
			chainId: 10,
			functionSignature:
				"create(string title, address admin, address[] managers)",
			args: {
				title,
				admin,
				managers,
			},
		});
		const hash = await waitForHash(syndicate, { projectId, transactionId });
		console.log(
			`Transaction ID: ${transactionId} was broadcast with hash: ${hash}`,
		);
		return c.json({ hash }, 200);
	});

getAllWriterCreatedEvents();

export type Api = typeof api;
export default app;
