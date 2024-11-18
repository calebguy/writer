import type { Prisma, TransactionStatus } from "@prisma/client";
import type { InputJsonValue } from "@prisma/client/runtime/library";
import { type AbiEvent, type Hex, type Log, fromHex, getAddress } from "viem";
import { writerFactoryAbi } from "../abi/writerFactory";
import { prisma } from "../db";
import { env } from "../env";
import { synDataToUuid } from "../helpers";
import { syndicate } from "../syndicate";
import { type Listener, LogFetcher } from "./logFetcher";

class FactoryListener extends LogFetcher implements Listener {
	private readonly eventName = "WriterCreated";
	private readonly abi = writerFactoryAbi;
	private readonly pollingInterval = 1_000;
	private readonly address = getAddress(env.FACTORY_ADDRESS);

	init() {
		return Promise.all([this.fetchHistory(), this.listen()]);
	}

	async fetchHistory() {
		const mostRecentWriter = await prisma.writer.findFirst({
			orderBy: { createdAtBlock: "desc" },
			where: {
				createdAtBlock: {
					not: null,
				},
			},
		});

		let fromBlock: bigint;
		if (!mostRecentWriter || !mostRecentWriter.createdAtBlock) {
			fromBlock = env.FACTORY_FROM_BLOCK;
		} else {
			fromBlock = BigInt(mostRecentWriter.createdAtBlock);
		}

		return super.fetchLogsFromBlock({
			fromBlock,
			address: this.address,
			abi: this.abi,
			eventName: this.eventName,
			onLogs: async (logs) => {
				console.log("[writer-factory] history");
				await this.onLogs(logs);
			},
		});
	}

	async listen() {
		return super.watchEvent({
			pollingInterval: this.pollingInterval,
			address: this.address,
			abi: this.abi,
			eventName: this.eventName,
			onLogs: async (logs) => {
				console.log("[writer-factory] listener");
				await this.onLogs(logs);
			},
		});
	}

	async onLogs(logs: Log[] | AbiEvent[]) {
		for (const log of logs) {
			console.log(log);
			// @ts-expect-error
			const { blockNumber, transactionHash } = log;
			const { id, writerAddress, storeAddress, admin, managers, title } =
				// @ts-expect-error
				log.args;
			const { input } = await this.client.getTransaction({
				hash: transactionHash as Hex,
			});

			let transactionId: string | null = null;

			try {
				const synIdEncoded = input.slice(-70);
				const synIdDecoded = fromHex(`0x${synIdEncoded}`, "string");
				const isSyndicateTx = synIdDecoded.startsWith("syn");
				if (isSyndicateTx) {
					transactionId = synDataToUuid(synIdDecoded);
				}
			} catch {}
			let where: Prisma.WriterWhereUniqueInput | null = null;

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
				where = { transactionId };
			} else {
				where = { onChainId: BigInt(id) };
			}

			await prisma.writer.upsert({
				create: {
					title,
					transactionId,
					onChainId: BigInt(id),
					address: writerAddress as string,
					storageAddress: storeAddress as string,
					admin: admin as string,
					managers: managers as string[],
					createdAtBlock: blockNumber.toString(),
				},
				update: {
					onChainId: BigInt(id),
					address: writerAddress as string,
					storageAddress: storeAddress as string,
					admin: admin as string,
					managers: managers as string[],
					createdAtBlock: blockNumber.toString(),
					updatedAt: new Date(),
				},
				where,
			});
		}
	}
}

const factoryListener = new FactoryListener();
export default factoryListener;
