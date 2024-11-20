import type { TransactionStatus } from "@prisma/client";
import type { InputJsonValue } from "@prisma/client/runtime/library";
import { type AbiEvent, type Hex, type Log, getAddress } from "viem";
import { writerStorageAbi } from "../abi/writerStorage";
import { prisma } from "../db";
import { env } from "../env";
import { getSynIdFromRawInput, syndicate } from "../syndicate";
import { LogFetcher } from "./logFetcher";

class StorageListener extends LogFetcher {
	private readonly abi = writerStorageAbi;
	private readonly pollingInterval = 1_000;

	async doIt(address: string) {
		return Promise.all([this.fetchHistory(address), this.listen(address)]);
	}

	listen(address: string) {
		return Promise.all([
			this.listenChunkReceived(address),
			this.listenEntryCreated(address),
		]);
	}

	fetchHistory(address: string) {
		return Promise.all([
			this.fetchHistoryEntryCreated(address),
			this.fetchHistoryChunkReceived(address),
		]);
	}

	listenEntryCreated(address: string) {
		return this.watchEvent({
			pollingInterval: this.pollingInterval,
			address: getAddress(address),
			abi: this.abi,
			eventName: "EntryCreated",
			onLogs: async (logs) => {
				console.log("[storage] listener");
				await this.onEntryCreatedLogs(logs);
			},
		});
	}

	listenChunkReceived(address: string) {
		return this.watchEvent({
			pollingInterval: this.pollingInterval,
			address: getAddress(address),
			abi: this.abi,
			eventName: "ChunkReceived",
			onLogs: async (logs) => {
				console.log("[storage] listener");
				await this.onChunkReceivedLogs(logs);
			},
		});
	}

	fetchHistoryEntryCreated(address: string) {
		return this.fetchLogsFromBlock({
			fromBlock: env.FACTORY_FROM_BLOCK,
			address: getAddress(address),
			abi: this.abi,
			eventName: "EntryCreated",
			onLogs: async (logs) => {
				console.log(`[storage: ${address}] history`);
				this.onEntryCreatedLogs(logs);
			},
		});
	}

	fetchHistoryChunkReceived(address: string) {
		return this.fetchLogsFromBlock({
			fromBlock: env.FACTORY_FROM_BLOCK,
			address: getAddress(address),
			abi: this.abi,
			eventName: "ChunkReceived",
			onLogs: async (logs) => {
				console.log(`[storage: ${address}] history`);
				this.onChunkReceivedLogs(logs);
			},
		});
	}

	async onEntryCreatedLogs(logs: Log[] | AbiEvent[]) {
		console.log("[storage-listener] logs", logs);
		const writers = await prisma.writer.findMany();
		for (const log of logs) {
			// @ts-expect-error
			const { blockNumber, transactionHash, address: storageAddress } = log;
			// @ts-expect-error
			const { id } = log.args;
			const { input } = await this.client.getTransaction({
				hash: transactionHash as Hex,
			});
			const transactionId = getSynIdFromRawInput(input);

			console.log("STORAGE LISTENERtransactionId", transactionId);
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
					// @note TODO: we might not need totalChunks & receivedChunks TBD
					totalChunks: 1,
					receivedChunks: 0,
					exists: true,
					onChainId: BigInt(id),
					writerId: writer.id,
					createdAtHash: transactionHash,
					createdAtBlock: blockNumber,
					transactionId,
				},
				update: {
					createdAtHash: transactionHash,
					createdAtBlock: blockNumber,
				},
				where: transactionId ? { transactionId } : { onChainId: BigInt(id) },
			});
		}
	}

	async onChunkReceivedLogs(logs: Log[] | AbiEvent[]) {
		console.log("[storage-listener] logs", logs);
	}
}

const storageListener = new StorageListener();
export default storageListener;
