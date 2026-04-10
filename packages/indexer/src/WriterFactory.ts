import { ponder } from "ponder:registry";
import { db } from "./index";

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

ponder.on("WriterFactory:WriterCreated", async ({ event, context }) => {
	const { writerAddress, storeAddress, admin, managers, title } = event.args;
	console.log("WriterFactory:WriterCreated", {
		writerAddress,
		storeAddress,
		admin,
		managers,
		title,
	});
	const transactionId = await confirmRelayTx(event);

	await db.upsertWriter({
		address: writerAddress,
		storageAddress: storeAddress,
		// storage_id is the frozen, durable identifier for this writer.
		// Set ONCE at creation time to the storage contract address. The
		// upsertWriter helper will refuse to update it on conflict, so
		// re-running the indexer or hitting a re-org cannot ever change
		// this value once it's been set.
		storageId: storeAddress,
		title,
		admin,
		managers: managers.map((m) => m.toString()),
		createdAtHash: event.transaction.hash,
		createdAtBlock: event.block.number,
		createdAtBlockDatetime: new Date(Number(event.block.timestamp) * 1000),
		transactionId,
	});
});
