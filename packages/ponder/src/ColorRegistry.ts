import { ponder } from "ponder:registry";
import { db } from ".";

ponder.on("ColorRegistry:HexSet", async ({ event, context }) => {
	const { user: address, hexColor } = event.args;
	console.log("address", address);
	console.log("hexColor", hexColor);

	await db.upsertUser({
		address,
		color: hexColor
	});
});
