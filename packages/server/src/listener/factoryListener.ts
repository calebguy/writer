import type { TransactionStatus } from "@prisma/client";
import type { InputJsonValue } from "@prisma/client/runtime/library";
import { type AbiEvent, type Hex, type Log, getAddress } from "viem";
import { writerFactoryAbi } from "../abi/writerFactory";
import { prisma } from "../db";
import { env } from "../env";
import { getSynIdFromRawInput, syndicate } from "../syndicate";
import { type Listener, LogFetcher } from "./logFetcher";
import WriterListener from "./writerListener";

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
			orderBy: { createdAt: "desc" },
		});

		let fromBlock: bigint;
		if (!mostRecentWriter) {
			fromBlock = env.FACTORY_FROM_BLOCK;
		} else {
			const tx = await this.chain.client.getTransaction({
				hash: mostRecentWriter.createdAtHash as Hex,
			});
			fromBlock = tx.blockNumber;
		}

		return super.fetchLogsFromBlock({
			fromBlock,
			address: this.address,
			abi: this.abi,
			eventName: this.eventName,
			onLogs: async (logs) => {
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
				await this.onLogs(logs);
			},
		});
	}

	async onLogs(logs: Log[] | AbiEvent[]) {
		for (const log of logs) {
			// @ts-expect-error
			const { transactionHash } = log;
			const { id, writerAddress, storeAddress, admin, managers, title } =
				// @ts-expect-error
				log.args;
			const { input } = await this.chain.client.getTransaction({
				hash: transactionHash as Hex,
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

			await prisma.writer.upsert({
				create: {
					title,
					transactionId,
					onChainId: BigInt(id),
					address: writerAddress as string,
					storageAddress: storeAddress as string,
					admin: admin as string,
					managers: managers as string[],
					createdAtHash: transactionHash,
				},
				update: {
					onChainId: BigInt(id),
					address: writerAddress as string,
					storageAddress: storeAddress as string,
					admin: admin as string,
					managers: managers as string[],
					createdAtHash: transactionHash,
					updatedAt: new Date(),
				},
				where: transactionId ? { transactionId } : { onChainId: BigInt(id) },
			});

			await new WriterListener(writerAddress).init();
		}
	}
}

const factoryListener = new FactoryListener();
export default factoryListener;
