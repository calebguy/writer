import { ponder } from "ponder:registry";
import { db } from ".";

ponder.on("ColorRegistry:HexSet", async ({ event, context }) => {
	const { user: address, hexColor } = event.args;
	await db.upsertUser({
		address,
		color: hexColor,
	});
});
