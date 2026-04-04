import { Hono } from "hono";
import { cors } from "hono/cors";
import { startPoller } from "./poller";
import adminRoutes from "./routes/admin";
import savedRoutes from "./routes/saved";
import writerRoutes from "./routes/writer";

const app = new Hono();

app.use("*", cors());

app.get("/", (c) => c.text("write today, forever"));

const api = app.basePath("/").route("/", adminRoutes).route("/", savedRoutes).route("/", writerRoutes);

startPoller();

export type Api = typeof api;
export default app;
