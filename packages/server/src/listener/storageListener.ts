import { Prisma, TransactionStatus } from "@prisma/client";
import { InputJsonValue } from "@prisma/client/runtime/library";
import { type AbiEvent, Hex, type Log, getAddress } from "viem";
import { writerStorageAbi } from "../abi/writerStorage";
import { prisma } from "../db";
import { env } from "../env";
import { getSynIdFromRawInput, syndicate } from "../syndicate";
import { type Listener, LogFetcher } from "./logFetcher";

class StorageListener extends LogFetcher implements Listener {
	private readonly eventName = "EntryCreated";
	private readonly abi = writerStorageAbi;
	private readonly pollingInterval = 1_000;

	init() {
		return Promise.all([this.fetchHistory(), this.listen()]);
	}

	async listen() {
		const storageAddresses = await this.getStorageAddresses();
		return Promise.all(
			storageAddresses.map((address) =>
				this.watchEvent({
					pollingInterval: this.pollingInterval,
					address: getAddress(address),
					abi: this.abi,
					eventName: this.eventName,
					onLogs: async (logs) => {
						console.log("[storage] listener");
						await this.onLogs(logs);
					},
				}),
			),
		);
	}

	// Listens to the 'EntryCreated' event for all current storage addresses
	async fetchHistory() {
		const storageAddresses = await this.getStorageAddresses();
		return Promise.all(
			storageAddresses.map((address) =>
				this.fetchLogsFromBlock({
					fromBlock: env.FACTORY_FROM_BLOCK,
					address: getAddress(address),
					abi: this.abi,
					eventName: this.eventName,
					onLogs: async (logs) => {
						console.log(`[storage: ${address}] history`);
						this.onLogs(logs);
					},
				}),
			),
		);
	}

	async onLogs(logs: Log[] | AbiEvent[]) {
		console.log("[storage-listener] logs", logs);
		for (const log of logs) {
			// @ts-expect-error
			const { blockNumber, transactionHash } = log;
			// @ts-expect-error
			const { id, author } = log.args;
			const { input } = await this.client.getTransaction({
				hash: transactionHash as Hex,
			});
			const transactionId = getSynIdFromRawInput(input);
			let where: Prisma.EntryWhereUniqueInput | null = null;
			console.log("transactionId", transactionId);
			if (transactionId) {
				const synTx = await syndicate.wallet.getTransactionRequest(
					env.SYNDICATE_PROJECT_ID,
					transactionId,
				);
				const tx = synTx.transactionAttempts?.filter((tx) =>
					["SUBMITTED", "CONFIRMED"].includes(tx.status),
				)[0];
				console.log("syndicate tx for entry", tx);
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
				where = { transactionId };
			} else {
				where: {
					onChainId: BigInt(id);
				}
			}

			// @note TODO: fill this in
			await prisma.entry.upsert({
				create: {},
				update: {},
				where,
			});
			console.log("blockNumber", blockNumber);
			console.log("transactionHash", transactionHash);
			console.log("id", id);
			console.log("author", author);
		}
	}

	private async getStorageAddresses() {
		const writers = await prisma.writer.findMany();
		const writersWillNullStorageAddress = writers.filter(
			(w) => !w.storageAddress,
		);
		// @note we need to devise a plan for handling this
		if (writersWillNullStorageAddress.length > 0) {
			console.warn(
				`[storage-listener] Found ${writersWillNullStorageAddress.length} writers with null storage address.`,
			);
		}
		const writersWithStorageAddress = writers.filter((w) => w.storageAddress);
		return writersWithStorageAddress.map((w) => w.storageAddress) as string[];
	}
}

const storageListener = new StorageListener();
export default storageListener;
