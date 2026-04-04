import { ponder } from "ponder:registry";
import { db } from ".";

async function confirmRelayTxByHash(event: {
	block: { number: bigint };
	transaction: { hash: string };
}): Promise<string | null> {
	const tx = await db.getTxByHash(event.transaction.hash);
	if (!tx) return null;

	await db.upsertTx({
		id: tx.id,
		wallet: tx.wallet,
		nonce: tx.nonce,
		chainId: tx.chainId,
		functionSignature: tx.functionSignature,
		args: tx.args,
		blockNumber: event.block.number,
		hash: event.transaction.hash,
		status: "CONFIRMED",
	});

	return tx.id;
}

ponder.on("WriterStorage:ChunkReceived", async ({ event }) => {
	const transactionId = await confirmRelayTxByHash(event);

	console.log(
		"Chunk received",
		event.log.address,
		event.args.id,
		event.args.index,
	);
	const entry = await db.getEntryByOnchainId(event.log.address, event.args.id);
	if (!entry) {
		console.error("Entry not found", event.log.address, event.args.id);
		return;
	}

	console.log("Upserting chunk", entry.id, event.args.index, transactionId);
	await db.upsertChunk({
		index: Number(event.args.index),
		entryId: entry.id,
		content: event.args.content,
		createdAtTransactionId: transactionId,
	});
});

ponder.on("WriterStorage:EntryCreated", async ({ event }) => {
	const transactionId = await confirmRelayTxByHash(event);
	await db.upsertEntry({
		storageAddress: event.log.address,
		exists: true,
		onChainId: event.args.id,
		author: event.args.author,
		createdAtHash: event.transaction.hash,
		createdAtBlock: event.block.number,
		createdAtBlockDatetime: new Date(Number(event.block.timestamp) * 1000),
		createdAtTransactionId: transactionId,
	});
});

ponder.on("WriterStorage:EntryRemoved", async ({ event }) => {
	const transactionId = await confirmRelayTxByHash(event);

	const deletedAt = new Date(Number(event.block.timestamp) * 1000);
	await db.upsertEntry({
		storageAddress: event.log.address,
		exists: false,
		onChainId: event.args.id,
		deletedAtHash: event.transaction.hash,
		deletedAtBlock: event.block.number,
		deletedAtBlockDatetime: deletedAt,
		deletedAt,
		deletedAtTransactionId: transactionId,
		author: event.args.author,
	});
});

ponder.on("WriterStorage:EntryUpdated", async ({ event }) => {
	const transactionId = await confirmRelayTxByHash(event);

	await db.upsertEntry({
		storageAddress: event.log.address,
		exists: true,
		onChainId: event.args.id,
		author: event.args.author,
		updatedAtHash: event.transaction.hash,
		updatedAtBlock: event.block.number,
		updatedAtBlockDatetime: new Date(Number(event.block.timestamp) * 1000),
		updatedAtTransactionId: transactionId,
	});
});
