import { Hono } from "hono";
import { serveStatic } from "hono/bun";

const app = new Hono();

app.use("*", serveStatic({ root: "../ui/dist" }));
app.use("*", serveStatic({ path: "../ui/dist/index.html" }));

const api = app.basePath("/api").get("/", (c) => {
	return c.json({ message: "VONO" });
});

export type Api = typeof api;
export default app;
