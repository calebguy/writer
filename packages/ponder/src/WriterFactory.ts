import type { TransactionStatus } from "@syndicateio/syndicate-node/api/resources/wallet/types";
import { ponder } from "ponder:registry";
import { env } from "../env";
import { getSynIdFromRawInput, syndicate } from "../utils/syndicate";
import { db } from "./index";
ponder.on("WriterFactory:WriterCreated", async ({ event, context }) => {
	const { writerAddress, storeAddress, admin, managers, title } = event.args;
	const transactionId = getSynIdFromRawInput(event.transaction.input);
	if (transactionId) {
		const tx = await syndicate.wallet.getTransactionRequest(
			env.SYNDICATE_PROJECT_ID,
			transactionId,
		);
		const confirmedTx = tx.transactionAttempts?.filter((tx) =>
			["SUBMITTED", "CONFIRMED"].includes(tx.status),
		)[0];
		if (!confirmedTx) {
			throw new Error("Transaction not confirmed");
		}
		await db.upsertTx({
			id: transactionId,
			chainId: BigInt(10),
			functionSignature: tx.functionSignature,
			args: tx.decodedData,
			blockNumber: BigInt(confirmedTx.block),
			hash: confirmedTx.hash,
			status: confirmedTx.status as TransactionStatus,
		});
	}

	await db.upsertWriter({
		address: writerAddress,
		storageAddress: storeAddress,
		admin,
		managers: managers.map((m) => m.toString()),
		title,
		createdAtHash: event.transaction.hash,
		createdAtBlock: event.block.number,
		createdAtBlockDatetime: new Date(Number(event.block.timestamp) * 1000),
	});

	console.log(`Writer new Writer Created @ ${event.log.address}`);
	console.log("writer created", event);
});
