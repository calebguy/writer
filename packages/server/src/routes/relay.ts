import { Hono } from "hono";
import { relay } from "../relay";

const relayRoutes = new Hono().get("/relay/wallets", async (c) => {
	const data = await relay.getWallets();
	return c.json(data);
});

export default relayRoutes;
