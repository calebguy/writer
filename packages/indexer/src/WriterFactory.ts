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

// Shared handler logic for both old and new factory events.
// The only difference: the old factory doesn't emit `publicWritable`,
// so the old handler defaults it to `false`.
async function handleWriterCreated(
	event: {
		args: {
			writerAddress: string;
			storeAddress: string;
			admin: string;
			managers: readonly string[];
			title: string;
		};
		block: { number: bigint; timestamp: bigint };
		transaction: { hash: string; from: string; nonce: number };
	},
	publicWritable: boolean,
) {
	const { writerAddress, storeAddress, admin, managers, title } = event.args;
	console.log("WriterFactory:WriterCreated", {
		writerAddress,
		storeAddress,
		admin,
		managers,
		title,
		publicWritable,
	});
	const transactionId = await confirmRelayTx(event);

	await db.upsertWriter({
		address: writerAddress,
		storageAddress: storeAddress,
		storageId: storeAddress,
		publicWritable,
		title,
		admin,
		managers: managers.map((m) => m.toString()),
		createdAtHash: event.transaction.hash,
		createdAtBlock: event.block.number,
		createdAtBlockDatetime: new Date(Number(event.block.timestamp) * 1000),
		transactionId,
	});
}

// New factory handler — has publicWritable in the event args
ponder.on("WriterFactory:WriterCreated", async ({ event }) => {
	await handleWriterCreated(event, event.args.publicWritable);
});

// Old factory handler — defaults publicWritable to false.
// Uses `any` cast because Ponder can't statically infer the event type
// for a conditionally-defined contract. The runtime shape is identical
// (same indexed params — writerAddress, storeAddress, admin — plus the
// non-indexed title and managers). The try/catch handles the case where
// OLD_FACTORY_ADDRESS is not set and OldWriterFactory doesn't exist in
// the config (Ponder would throw on registration).
try {
	ponder.on("OldWriterFactory:WriterCreated" as any, async (ctx: any) => {
		await handleWriterCreated(ctx.event, false);
	});
} catch {
	// OldWriterFactory not in the config — only new factory tracked.
}
