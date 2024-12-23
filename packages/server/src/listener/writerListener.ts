import type { TransactionStatus, Writer } from "@prisma/client";
import type { InputJsonValue } from "@prisma/client/runtime/library";
import { type AbiEvent, type Hex, type Log, getAddress } from "viem";
import { writerAbi } from "../abi/writer";
import { writerStorageAbi } from "../abi/writerStorage";
import { prisma } from "../db";
import { env } from "../env";
import { getSynIdFromRawInput, syndicate } from "../syndicate";
import chain from "./chain";
import { LogFetcher } from "./logFetcher";

// @note TODO: we need to provide a way to sync all history for all writers in-case
// new entries have been addded. This could happen if the server spun down and then back up
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

			const tx = await this.chain.client.getTransaction({
				hash: transactionHash as Hex,
			});

			const block = await this.chain.client.getBlock({
				blockNumber: tx.blockNumber,
			});

			await prisma.entry.upsert({
				create: {
					exists: true,
					onChainId: BigInt(id),
					writerId: writer.id,
					createdAtHash: transactionHash,
					transactionId,
					createdAtBlockDatetime: new Date(Number(block.timestamp) * 1000),
				},
				update: {
					onChainId: BigInt(id),
					createdAtHash: transactionHash,
					createdAtBlockDatetime: new Date(Number(block.timestamp) * 1000),
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

	// @note Rename this to sync
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
		console.log("[writer-listener] entryIds", entryIds);
		return Promise.all(
			entryIds.map((id) => this.syncStateForEntry(id, writer)),
		);
	}

	private async syncStateForEntry(entryId: bigint, writer: Writer) {
		console.log("[writer-listener] syncing entry", entryId);
		const receipt = await this.getTransactionReceipt(entryId);
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
		console.log("[writer-listener] entry", entry);
		console.log("[writer-listener] content", content);

		const block = await this.chain.client.getBlock({
			blockNumber: receipt.blockNumber,
		});
		await prisma.entry.upsert({
			create: {
				exists: true,
				onChainId: entryId,
				writerId: writer.id,
				createdAtHash: receipt.transactionHash,
				transactionId,
				content,
				createdAtBlockDatetime: new Date(Number(block.timestamp) * 1000),
			},
			update: {
				createdAtHash: receipt.transactionHash,
				content,
				onChainId: entryId,
				createdAtBlockDatetime: new Date(Number(block.timestamp) * 1000),
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

	private async getTransactionReceipt(entryId: bigint) {
		const logs = await chain.client.getContractEvents({
			address: this.storageAddress,
			abi: writerStorageAbi,
			fromBlock: env.FACTORY_FROM_BLOCK,
			eventName: "EntryCreated",
			args: {
				id: entryId,
			},
		});
		const hash = logs[0]?.transactionHash;
		if (!hash) {
			throw new Error("No receipt found for entry");
		}
		return chain.client.getTransactionReceipt({
			hash,
		});
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
