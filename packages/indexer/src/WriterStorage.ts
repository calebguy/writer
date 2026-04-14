import { ponder } from "ponder:registry";
import { db } from ".";

function makeRelayTxId(wallet: string, nonce: number): string {
	return `dw:${wallet.toLowerCase()}:${nonce}`;
}

async function confirmRelayTx(event: {
	block: { number: bigint };
	transaction: { hash: string; from: string; nonce: number };
}): Promise<string | null> {
	const relayTxId = makeRelayTxId(event.transaction.from, event.transaction.nonce);
	const tx = await db.getTxById(relayTxId);
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

// -------------------------------------------------------------------------
// WriterStorage event handlers
//
// Each handler is extracted into a named function so it can be registered
// for BOTH "WriterStorage:*" (new factory instances) and
// "OldWriterStorage:*" (legacy factory instances, if OLD_FACTORY_ADDRESS
// is set). WriterStorage's ABI is identical for old and new instances
// (WriterStorage bytecode was never modified), so the handler logic is
// the same — it's only registered under two contract names.
// -------------------------------------------------------------------------

async function handleChunkReceived({ event }: { event: any }) {
	const transactionId = await confirmRelayTx(event);

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
}

async function handleEntryCreated({ event }: { event: any }) {
	const transactionId = await confirmRelayTx(event);
	// Look up the writer's frozen storage_id to denormalize onto the entry.
	// For v1 (no chain migrations) this equals storage_address; for migrated
	// writers it would be the original storage_address that was preserved
	// across the migration. Defaults to storageAddress if no writer row
	// exists yet (e.g. mid re-index, where EntryCreated arrives before
	// WriterCreated has been processed) — that case will self-correct on
	// the next pass because storage_id is supposed to be frozen anyway.
	const writerRow = await db.getWriterByStorageAddress(event.log.address);
	await db.upsertEntry({
		storageAddress: event.log.address,
		storageId: writerRow?.storageId ?? event.log.address,
		exists: true,
		onChainId: event.args.id,
		author: event.args.author,
		createdAtHash: event.transaction.hash,
		createdAtBlock: event.block.number,
		createdAtBlockDatetime: new Date(Number(event.block.timestamp) * 1000),
		createdAtTransactionId: transactionId,
	});
}

async function handleEntryRemoved({ event }: { event: any }) {
	const transactionId = await confirmRelayTx(event);

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
}

async function handleEntryUpdated({ event }: { event: any }) {
	const transactionId = await confirmRelayTx(event);

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
}

async function handleLogicSet({ event }: { event: any }) {
// pointer changes. This is the migration path for the C-2 fix: deploy a
// patched Writer pointing at the existing WriterStorage, then call
// `WriterStorage.setLogic(newWriter)` from the storage admin. The event
// flows in here, the writer row is rewritten by storage_address, and
// `saved_writer.writer_address` cascades automatically.
//
// Note on ordering: the factory's create() also calls setLogic() during
// construction, before WriterCreated is emitted. In that case the writer
// row does not yet exist; updateWriterAddressByStorage returns 0 and we
// no-op. WriterCreated then runs and inserts the row with the same logic
// address that LogicSet just emitted, so end state is correct either way.
	// Re-point a writer row at a new logic contract when its storage's logic
	// pointer changes. This is the migration path for the C-2 fix: deploy a
	// patched Writer pointing at the existing WriterStorage, then call
	// `WriterStorage.setLogic(newWriter)` from the storage admin.
	//
	// Note on ordering: the factory's create() also calls setLogic() during
	// construction, before WriterCreated is emitted. In that case the writer
	// row does not yet exist; updateWriterAddressByStorage returns 0 and we
	// no-op. WriterCreated then runs and inserts the row with the same logic
	// address that LogicSet just emitted, so end state is correct either way.
	const storageAddress = event.log.address;
	const newLogic = event.args.logicAddress;
	const updated = await db.updateWriterAddressByStorage(
		storageAddress,
		newLogic,
	);
	if (updated === 0) {
		console.log(
			"WriterStorage:LogicSet (no row yet, deferring to WriterCreated)",
			{ storageAddress, newLogic },
		);
		return;
	}
	console.log("WriterStorage:LogicSet rebound writer.address", {
		storageAddress,
		newLogic,
	});
}

// -------------------------------------------------------------------------
// Register handlers for new factory WriterStorage instances
// -------------------------------------------------------------------------
ponder.on("WriterStorage:ChunkReceived", handleChunkReceived);
ponder.on("WriterStorage:EntryCreated", handleEntryCreated);
ponder.on("WriterStorage:EntryRemoved", handleEntryRemoved);
ponder.on("WriterStorage:EntryUpdated", handleEntryUpdated);
ponder.on("WriterStorage:LogicSet", handleLogicSet);

// -------------------------------------------------------------------------
// Register the SAME handlers for old factory WriterStorage instances
// (only if OLD_FACTORY_ADDRESS is set in the config — otherwise
// OldWriterStorage doesn't exist as a contract name and Ponder would
// throw on registration)
// -------------------------------------------------------------------------
// Uses `as any` casts because Ponder can't infer event types for
// conditionally-defined contracts. Runtime shape is identical (same
// WriterStorage ABI — it was never modified).
try {
	ponder.on("OldWriterStorage:ChunkReceived" as any, handleChunkReceived);
	ponder.on("OldWriterStorage:EntryCreated" as any, handleEntryCreated);
	ponder.on("OldWriterStorage:EntryRemoved" as any, handleEntryRemoved);
	ponder.on("OldWriterStorage:EntryUpdated" as any, handleEntryUpdated);
	ponder.on("OldWriterStorage:LogicSet" as any, handleLogicSet);
} catch {
	// OldWriterStorage not in the config (OLD_FACTORY_ADDRESS not set).
}
