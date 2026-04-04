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
		title,
		admin,
		managers: managers.map((m) => m.toString()),
		createdAtHash: event.transaction.hash,
		createdAtBlock: event.block.number,
		createdAtBlockDatetime: new Date(Number(event.block.timestamp) * 1000),
		transactionId,
	});
});
