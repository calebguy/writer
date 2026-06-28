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

const app = new Hono<{ Bindings: Env }>();

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
	fetch(request, env, ctx) {
		return app.fetch(request, env, ctx);
	},
	scheduled(_event, env, ctx) {
		ctx.waitUntil(
			runWithHyperdriveDatabase(env.HYPERDRIVE.connectionString, () =>
				runWithRelayBinding(env.RELAY, () => pollPendingTransactions()),
			),
		);
	},
} satisfies ExportedHandler<Env>;
