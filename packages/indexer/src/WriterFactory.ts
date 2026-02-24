import { ponder } from "ponder:registry";
import { env } from "../utils/env";
import { getSynIdFromRawInput, syndicate } from "../utils/syndicate";
import { db } from "./index";

async function upsertConfirmedTxFromSyndicate(
	transactionId: string | null,
	event: {
		block: { number: bigint };
		transaction: { hash: string };
	},
) {
	if (!transactionId) {
		return;
	}

	try {
		const tx = await syndicate.wallet.getTransactionRequest(
			env.SYNDICATE_PROJECT_ID,
			transactionId,
		);
		await db.upsertTx({
			id: transactionId,
			chainId: BigInt(env.TARGET_CHAIN_ID),
			functionSignature: tx.functionSignature,
			args: tx.decodedData,
			blockNumber: event.block.number,
			hash: event.transaction.hash,
			// syndicate's internal status may not be "CONFIRMED" but we can assume it
			// is confirmed since we are only listening to onchain events
			status: "CONFIRMED",
		});
	} catch (error) {
		console.error(
			"Failed to sync syndicate transaction metadata; continuing with onchain event reconciliation",
			{ transactionId, error },
		);
	}
}

ponder.on("WriterFactory:WriterCreated", async ({ event, context }) => {
	const { writerAddress, storeAddress, admin, managers, title } = event.args;
	console.log("WriterFactory:WriterCreated", {
		writerAddress,
		storeAddress,
		admin,
		managers,
		title,
	});
	const transactionId = getSynIdFromRawInput(event.transaction.input);
	await upsertConfirmedTxFromSyndicate(transactionId, event);

	await db.upsertWriter({
		address: writerAddress,
		storageAddress: storeAddress,
		title,
		admin,
		managers: managers.map((m) => m.toString()),
		createdAtHash: event.transaction.hash,
		createdAtBlock: event.block.number,
		createdAtBlockDatetime: new Date(Number(event.block.timestamp) * 1000),
		transactionId,
	});
});
