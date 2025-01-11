import { ponder } from "ponder:registry";
import { WriterStorageAbi } from "utils/abis";
import { publicClient } from "utils/viem";
import { db } from ".";
import { env } from "../env";
import { getSynIdFromRawInput, syndicate } from "../utils/syndicate";

ponder.on("WriterStorage:EntryCompleted", async ({ event }) => {
	const transactionId = getSynIdFromRawInput(event.transaction.input);
	if (transactionId) {
		const tx = await syndicate.wallet.getTransactionRequest(
			env.SYNDICATE_PROJECT_ID,
			transactionId,
		);
		await db.upsertTx({
			id: transactionId,
			chainId: BigInt(10),
			functionSignature: tx.functionSignature,
			args: tx.decodedData,
			blockNumber: event.block.number,
			hash: event.transaction.hash,
			// syndicate's internal status may not be "CONFIRMED" but we can assume it
			// is confirmed since we are only listening to onchain events
			status: "CONFIRMED",
		});
	}
	const content = await publicClient.readContract({
		address: event.log.address,
		abi: WriterStorageAbi,
		functionName: "getEntryContent",
		args: [event.args.id],
	});
	await db.upsertEntry({
		storageAddress: event.log.address,
		exists: true,
		onChainId: event.args.id,
		content,
		createdAtHash: event.transaction.hash,
		createdAtBlock: event.block.number,
		createdAtBlockDatetime: new Date(Number(event.block.timestamp) * 1000),
		transactionId,
	});
});
