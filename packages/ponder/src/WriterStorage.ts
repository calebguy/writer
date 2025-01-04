import { ponder } from "ponder:registry";
import { WriterStorageAbi } from "utils/abis";
import { publicClient } from "utils/viem";
import { db } from ".";
import { env } from "../env";
import { getSynIdFromRawInput, syndicate } from "../utils/syndicate";

ponder.on("WriterStorage:EntryCompleted", async ({ event }) => {
	console.log(`Writer new Entry Completed @ ${event.log.address}`);
	console.log("entry completed", event);
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

// @note TODO: we need to provide a way to sync all history for all writers in-case
// new entries have been addded. This could happen if the server spun down and then back up
// class WriterListener {
// 	async onEntryCreatedLogs(logs: Log[] | AbiEvent[]) {
// 		console.log("[storage-listener] logs", logs);
// 		const writers = await prisma.writer.findMany();
// 		for (const log of logs) {
// 			// @ts-expect-error
// 			const { transactionHash, address: storageAddress } = log;
// 			// @ts-expect-error
// 			const { id } = log.args;
// 			const { input } = await chain.client.getTransaction({
// 				hash: transactionHash as Hex,
// 			});
// 			const transactionId = getSynIdFromRawInput(input);
// 			console.log("[storage-listener] transactionId", transactionId);
// 			if (transactionId) {
// 				const synTx = await syndicate.wallet.getTransactionRequest(
// 					env.SYNDICATE_PROJECT_ID,
// 					transactionId,
// 				);
// 				const tx = synTx.transactionAttempts?.filter((tx) =>
// 					["SUBMITTED", "CONFIRMED"].includes(tx.status),
// 				)[0];
// 				// console.log("syndicate tx for entry", tx);
// 				await prisma.syndicateTransaction.upsert({
// 					create: {
// 						id: transactionId,
// 						chainId: synTx.chainId,
// 						projectId: env.SYNDICATE_PROJECT_ID,
// 						functionSignature: synTx.functionSignature,
// 						args: synTx.decodedData as InputJsonValue,
// 						blockNumber: tx?.block,
// 						hash: tx?.hash,
// 						status: tx?.status as TransactionStatus,
// 					},
// 					update: {
// 						updatedAt: new Date(),
// 						hash: tx?.hash,
// 					},
// 					where: {
// 						id: transactionId,
// 					},
// 				});
// 			}
// 			const writer = await prisma.writer.findUnique({
// 				where: {
// 					storageAddress: getAddress(storageAddress),
// 				},
// 			});
// 			if (!writer) {
// 				console.error(
// 					`[storage-listener] Writer not found for storage address ${storageAddress}`,
// 				);
// 				return;
// 			}

// 			const tx = await this.chain.client.getTransaction({
// 				hash: transactionHash as Hex,
// 			});

// 			const block = await this.chain.client.getBlock({
// 				blockNumber: tx.blockNumber,
// 			});

// 			await prisma.entry.upsert({
// 				create: {
// 					exists: true,
// 					onChainId: BigInt(id),
// 					writerId: writer.id,
// 					createdAtHash: transactionHash,
// 					transactionId,
// 					createdAtBlockDatetime: new Date(Number(block.timestamp) * 1000),
// 				},
// 				update: {
// 					onChainId: BigInt(id),
// 					createdAtHash: transactionHash,
// 					createdAtBlockDatetime: new Date(Number(block.timestamp) * 1000),
// 				},
// 				where: transactionId
// 					? { transactionId }
// 					: {
// 							onChainId_writerId: {
// 								onChainId: BigInt(id),
// 								writerId: writer.id,
// 							},
// 						},
// 			});
// 		}
// 	}

// 	private async syncStateForEntry(entryId: bigint, writer: Writer) {
// 		console.log("[writer-listener] syncing entry", entryId);
// 		const receipt = await this.getTransactionReceipt(entryId);
// 		if (!receipt) {
// 			console.error("[writer-listener] no receipt", entryId);
// 			return;
// 		}
// 		const { input } = await chain.client.getTransaction({
// 			hash: receipt.transactionHash,
// 		});
// 		const transactionId = getSynIdFromRawInput(input);
// 		if (transactionId) {
// 			const synTx = await syndicate.wallet.getTransactionRequest(
// 				env.SYNDICATE_PROJECT_ID,
// 				transactionId,
// 			);
// 			const tx = synTx.transactionAttempts?.filter((tx) =>
// 				["SUBMITTED", "CONFIRMED"].includes(tx.status),
// 			)[0];

// 			await prisma.syndicateTransaction.upsert({
// 				create: {
// 					id: transactionId,
// 					chainId: synTx.chainId,
// 					projectId: env.SYNDICATE_PROJECT_ID,
// 					functionSignature: synTx.functionSignature,
// 					args: synTx.decodedData as InputJsonValue,
// 					blockNumber: tx?.block,
// 					hash: tx?.hash,
// 					status: tx?.status as TransactionStatus,
// 				},
// 				update: {
// 					updatedAt: new Date(),
// 					hash: tx?.hash,
// 				},
// 				where: {
// 					id: transactionId,
// 				},
// 			});
// 		}

// 		const entry = await this.getEntry(entryId);
// 		const content = await this.getEntryContent(entryId);
// 		console.log("[writer-listener] entry", entry);
// 		console.log("[writer-listener] content", content);

// 		const block = await this.chain.client.getBlock({
// 			blockNumber: receipt.blockNumber,
// 		});
// 		await prisma.entry.upsert({
// 			create: {
// 				exists: true,
// 				onChainId: entryId,
// 				writerId: writer.id,
// 				createdAtHash: receipt.transactionHash,
// 				transactionId,
// 				content,
// 				createdAtBlockDatetime: new Date(Number(block.timestamp) * 1000),
// 			},
// 			update: {
// 				createdAtHash: receipt.transactionHash,
// 				content,
// 				onChainId: entryId,
// 				createdAtBlockDatetime: new Date(Number(block.timestamp) * 1000),
// 			},
// 			where: transactionId
// 				? { transactionId }
// 				: {
// 						onChainId_writerId: {
// 							onChainId: entryId,
// 							writerId: writer.id,
// 						},
// 					},
// 		});
// 	}

// 	private getEntryIds() {
// 		return chain.client.readContract({
// 			address: this.address,
// 			abi: writerAbi,
// 			functionName: "getEntryIds",
// 		});
// 	}

// 	private getEntry(entryId: bigint) {
// 		return chain.client.readContract({
// 			address: this.address,
// 			abi: writerAbi,
// 			functionName: "getEntry",
// 			args: [entryId],
// 		});
// 	}

// 	private getEntryContent(entryId: bigint) {
// 		return chain.client.readContract({
// 			address: this.address,
// 			abi: writerAbi,
// 			functionName: "getEntryContent",
// 			args: [entryId],
// 		});
// 	}

// 	private getTitle() {
// 		return chain.client.readContract({
// 			address: this.address,
// 			abi: writerAbi,
// 			functionName: "title",
// 		});
// 	}
// }
