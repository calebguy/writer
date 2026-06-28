import { Hono } from "hono";
import { cors } from "hono/cors";
import { runWithHyperdriveDatabase } from "./constants";
import { pollPendingTransactions } from "./poller";
import { runWithRelayBinding } from "./relay";
import adminRoutes from "./routes/admin";
import relayRoutes from "./routes/relay";
import savedRoutes from "./routes/saved";
import writerRoutes from "./routes/writer";
import x402Routes from "./routes/x402";

interface WorkerExecutionContext {
	waitUntil(promise: Promise<unknown>): void;
	passThroughOnException(): void;
	props: unknown;
}

interface WorkerEnv {
	HYPERDRIVE: {
		connectionString: string;
	};
	RELAY?: {
		fetch(request: Request): Promise<Response>;
	};
}

const app = new Hono<{ Bindings: WorkerEnv }>();

app.use("*", cors());
app.get("/", (c) => c.text("write today, forever"));

app.use("*", async (c, next) =>
	runWithHyperdriveDatabase(c.env.HYPERDRIVE.connectionString, () =>
		runWithRelayBinding(c.env.RELAY, next),
	),
);

const api = app
	.basePath("/")
	.route("/", adminRoutes)
	.route("/", relayRoutes)
	.route("/", savedRoutes)
	.route("/", x402Routes)
	.route("/", writerRoutes);

export type Api = typeof api;

export default {
	fetch(request: Request, env: WorkerEnv, ctx: WorkerExecutionContext) {
		return app.fetch(request, env, ctx);
	},
	scheduled(_event: unknown, env: WorkerEnv, ctx: WorkerExecutionContext) {
		ctx.waitUntil(
			runWithHyperdriveDatabase(env.HYPERDRIVE.connectionString, () =>
				runWithRelayBinding(env.RELAY, () => pollPendingTransactions()),
			),
		);
	},
};
