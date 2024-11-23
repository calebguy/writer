import type { TransactionStatus } from "@prisma/client";
import type { InputJsonValue } from "@prisma/client/runtime/library";
import {
	type AbiEvent,
	type Hex,
	type Log,
	type TransactionReceipt,
	getAddress,
} from "viem";
import { writerAbi } from "../abi/writer";
import { writerStorageAbi } from "../abi/writerStorage";
import { prisma } from "../db";
import { env } from "../env";
import { getSynIdFromRawInput, syndicate } from "../syndicate";
import chain from "./chain";
import { LogFetcher } from "./logFetcher";

class WriterListener extends LogFetcher {
	private title: string | null = null;
	constructor(
		private readonly address: Hex,
		private readonly storageAddress: Hex,
	) {
		super();
	}

	async init() {
		this.title = await this.getTitle();
		return Promise.all([this.syncState(), this.listen(this.storageAddress)]);
	}

	listen(storageAddress: Hex) {
		return chain.client.watchContractEvent({
			address: storageAddress,
			abi: writerStorageAbi,
			eventName: "EntryCreated",
			onLogs: async (logs) => {
				console.log("[writer-new-entry from listener]", logs);
				await this.onEntryCreatedLogs(logs);
			},
		});
	}

	async onEntryCreatedLogs(logs: Log[] | AbiEvent[]) {
		console.log("[storage-listener] logs", logs);
		const writers = await prisma.writer.findMany();
		for (const log of logs) {
			// @ts-expect-error
			const { transactionHash, address: storageAddress } = log;
			// @ts-expect-error
			const { id } = log.args;
			const { input } = await chain.client.getTransaction({
				hash: transactionHash as Hex,
			});
			const transactionId = getSynIdFromRawInput(input);
			console.log("[storage-listener] transactionId", transactionId);
			if (transactionId) {
				const synTx = await syndicate.wallet.getTransactionRequest(
					env.SYNDICATE_PROJECT_ID,
					transactionId,
				);
				const tx = synTx.transactionAttempts?.filter((tx) =>
					["SUBMITTED", "CONFIRMED"].includes(tx.status),
				)[0];
				// console.log("syndicate tx for entry", tx);
				await prisma.syndicateTransaction.upsert({
					create: {
						id: transactionId,
						chainId: synTx.chainId,
						projectId: env.SYNDICATE_PROJECT_ID,
						functionSignature: synTx.functionSignature,
						args: synTx.decodedData as InputJsonValue,
						blockNumber: tx?.block,
						hash: tx?.hash,
						status: tx?.status as TransactionStatus,
					},
					update: {
						updatedAt: new Date(),
						hash: tx?.hash,
					},
					where: {
						id: transactionId,
					},
				});
			}
			const writer = await prisma.writer.findUnique({
				where: {
					storageAddress: getAddress(storageAddress),
				},
			});
			if (!writer) {
				console.error(
					`[storage-listener] Writer not found for storage address ${storageAddress}`,
				);
				return;
			}
			await prisma.entry.upsert({
				create: {
					exists: true,
					onChainId: BigInt(id),
					writerId: writer.id,
					createdAtHash: transactionHash,
					transactionId,
				},
				update: {
					onChainId: BigInt(id),
					createdAtHash: transactionHash,
				},
				where: transactionId
					? { transactionId }
					: {
							onChainId_writerId: {
								onChainId: BigInt(id),
								writerId: writer.id,
							},
						},
			});
		}
	}

	async syncState() {
		const writer = await prisma.writer.findUnique({
			where: {
				address: this.address,
			},
		});
		if (!writer) {
			console.error("[writer-listener] writer not found", this.address);
			return;
		}
		const entryIds = await this.getEntryIds();
		for (const entryId of entryIds) {
			const receipt = await this.getTransactionReceipt(entryId);
			console.log("got receipt", receipt);
			if (!receipt) {
				console.error("[writer-listener] no receipt", entryId);
				return;
			}
			const { input } = await chain.client.getTransaction({
				hash: receipt.transactionHash,
			});
			const transactionId = getSynIdFromRawInput(input);
			if (transactionId) {
				const synTx = await syndicate.wallet.getTransactionRequest(
					env.SYNDICATE_PROJECT_ID,
					transactionId,
				);
				const tx = synTx.transactionAttempts?.filter((tx) =>
					["SUBMITTED", "CONFIRMED"].includes(tx.status),
				)[0];

				// console.log("syndicate tx for entry", tx);
				await prisma.syndicateTransaction.upsert({
					create: {
						id: transactionId,
						chainId: synTx.chainId,
						projectId: env.SYNDICATE_PROJECT_ID,
						functionSignature: synTx.functionSignature,
						args: synTx.decodedData as InputJsonValue,
						blockNumber: tx?.block,
						hash: tx?.hash,
						status: tx?.status as TransactionStatus,
					},
					update: {
						updatedAt: new Date(),
						hash: tx?.hash,
					},
					where: {
						id: transactionId,
					},
				});
			}

			const entry = await this.getEntry(entryId);
			const content = await this.getEntryContent(entryId);
			await prisma.entry.upsert({
				create: {
					exists: true,
					onChainId: entryId,
					writerId: writer.id,
					createdAtHash: receipt.transactionHash,
					transactionId,
					content,
				},
				update: {
					createdAtHash: receipt.transactionHash,
					content,
					onChainId: entryId,
				},
				where: transactionId
					? { transactionId }
					: {
							onChainId_writerId: {
								onChainId: entryId,
								writerId: writer.id,
							},
						},
			});
		}
	}

	// @note This needs to be refactored to be more efficient
	private async getTransactionReceipt(entryId: bigint) {
		let receipt: TransactionReceipt | undefined;
		await this.fetchLogsFromBlock({
			address: this.storageAddress,
			abi: writerStorageAbi,
			eventName: "EntryCreated",
			fromBlock: env.FACTORY_FROM_BLOCK,
			args: {
				id: entryId,
			},
			onLogs: async (logs) => {
				if (logs.length > 0) {
					const hash = logs[0].transactionHash;
					if (!hash) {
						return;
					}
					try {
						receipt = await chain.client.getTransactionReceipt({
							hash,
						});
					} catch (e) {
						console.error("[writer-listener] error getting receipt", e);
					}
				}
			},
		});
		return receipt;
	}

	private getEntryIds() {
		return chain.client.readContract({
			address: this.address,
			abi: writerAbi,
			functionName: "getEntryIds",
		});
	}

	private getEntry(entryId: bigint) {
		return chain.client.readContract({
			address: this.address,
			abi: writerAbi,
			functionName: "getEntry",
			args: [entryId],
		});
	}

	private getEntryContent(entryId: bigint) {
		return chain.client.readContract({
			address: this.address,
			abi: writerAbi,
			functionName: "getEntryContent",
			args: [entryId],
		});
	}

	private getTitle() {
		return chain.client.readContract({
			address: this.address,
			abi: writerAbi,
			functionName: "title",
		});
	}
}

export default WriterListener;
