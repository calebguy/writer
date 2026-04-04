import { type Hex, formatEther } from "viem";
import { Hono } from "hono";
import { publicClient } from "../constants";
import { relay } from "../relay";

const relayRoutes = new Hono().get("/relay/wallets", async (c) => {
	const data = await relay.getWallets();
	const wallets = await Promise.all(
		data.wallets.map(async (address) => {
			const balance = await publicClient.getBalance({
				address: address as Hex,
			});
			return { address, balance: formatEther(balance) };
		}),
	);
	return c.json({ wallets });
});

export default relayRoutes;
