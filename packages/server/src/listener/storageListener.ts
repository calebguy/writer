import { type AbiEvent, type Log, getAddress } from "viem";
import { writerStorageAbi } from "../abi/writerStorage";
import { prisma } from "../db";
import { env } from "../env";
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
