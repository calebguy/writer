import type { Prisma, TransactionStatus } from "@prisma/client";
import type { InputJsonValue } from "@prisma/client/runtime/library";
import {
	type AbiEvent,
	GetContractEventsParameters,
	type Hex,
	createPublicClient,
	fromHex,
	getAddress,
	http,
	parseAbiItem,
} from "viem";
import { optimism } from "viem/chains";
import { writerFactoryAbi } from "./abi/writerFactory";
import { writerStorageAbi } from "./abi/writerStorage";
import { prisma } from "./db";
import { env } from "./env";
import { minBigInt, synDataToUuid } from "./helpers";
import { syndicate } from "./server";

// const chain = isDev ? foundry : optimism;
const chain = optimism;
export const publicClient = createPublicClient({
	chain,
	transport: http(env.RPC_URL),
});

async function getEventLogsFromBlock<T extends AbiEvent>({
	fromBlock,
	address,
	abi,
	eventName,
	onLogs,
}: Pick<
	GetContractEventsParameters,
	"fromBlock" | "address" | "abi" | "eventName"
> & {
	fromBlock: bigint;
	onLogs: (logs: T[]) => Promise<void>;
}) {
	// @note TODO:
	// eth_getLogs has a max limit of 10,000 logs & will throw if there are more results
	// https://docs.infura.io/api/networks/ethereum/json-rpc-methods/eth_getlogs

	// adjust step size & retry if we see the following error
	// {
	//   "jsonrpc": "2.0",
	//   "id": 1,
	//   "error": {
	//     "code": -32005,
	//     "message": "query returned more than 10000 results"
	//   }
	// }

	// Max range is 3k blocks
	const step = BigInt(3_000);
	const from = fromBlock;
	const to = await publicClient.getBlockNumber();
	if (to < from) {
		console.debug(
			`To block number: ${to} is less than from block number: ${from}, skipping fetching history.`,
		);
		return;
	}

	for (let fromBlock = from; fromBlock <= to; fromBlock += step) {
		console.log(`getting logs from block ${fromBlock} to ${fromBlock + step}`);
		const toBlock = minBigInt(fromBlock + step, to);
		const logs = await publicClient.getContractEvents({
			address,
			abi,
			eventName,
			fromBlock,
			toBlock,
		});
		if (logs.length > 0) {
			onLogs(logs as unknown as T[]);
		}
	}
}

const writerCreatedEvent = parseAbiItem(
	"event WriterCreated(uint256 indexed id,address indexed writerAddress,address indexed admin,string title,address storeAddress,address[] managers)",
);
const writerEntryCreatedEvent = parseAbiItem(
	"event EntryCreated(uint256 indexed id, address author)",
);

async function onWriterEntryCreated(logs: unknown[]) {
	for (const log of logs) {
		console.log("[writer-entry-created]", log);
	}
}

async function onWriterCreated(logs: unknown[]) {
	for (const log of logs) {
		console.log(log);
		// @ts-expect-error
		const { blockNumber, transactionHash } = log;
		const { id, writerAddress, storeAddress, admin, managers, title } =
			// @ts-expect-error
			log.args;
		const { input } = await publicClient.getTransaction({
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

export async function getWriterCreatedEvents(fromBlock: bigint) {
	return await getEventLogsFromBlock({
		fromBlock,
		address: env.FACTORY_ADDRESS as Hex,
		abi: writerFactoryAbi,
		eventName: "WriterCreated",
		onLogs: onWriterCreated,
	});
}

export async function getWriterEntryCreatedEvents(fromBlock: bigint) {
	const writers = await prisma.writer.findMany({
		where: {
			storageAddress: {
				not: null,
			},
		},
	});
	const storeAddresses = writers.map((w) => w.storageAddress);
	return Promise.all(
		storeAddresses.map((address) =>
			getEventLogsFromBlock({
				fromBlock,
				address: address as Hex,
				abi: writerStorageAbi,
				eventName: "EntryCreated",
				onLogs: onWriterEntryCreated,
			}),
		),
	);
}

export async function getAllWriterHistory() {
	const mostRecentWriter = await prisma.writer.findFirst({
		orderBy: { createdAtBlock: "desc" },
		where: {
			createdAtBlock: {
				not: null,
			},
		},
	});
	if (!mostRecentWriter || !mostRecentWriter.createdAtBlock) {
		return Promise.all([
			getWriterCreatedEvents(env.FACTORY_FROM_BLOCK),
			getWriterEntryCreatedEvents(env.FACTORY_FROM_BLOCK),
		]);
	}
	const block = mostRecentWriter
		? mostRecentWriter.createdAtBlock
		: env.FACTORY_FROM_BLOCK;
	console.log(`Getting events from block ${block}`);
	return Promise.all([
		getWriterCreatedEvents(block),
		getWriterEntryCreatedEvents(block),
	]);
}

export async function listenToNewWriterCreatedEvents() {
	return publicClient.watchContractEvent({
		pollingInterval: 1_000,
		// fromBlock,
		address: env.FACTORY_ADDRESS as Hex,
		abi: writerFactoryAbi,
		eventName: "WriterCreated",
		onLogs: (logs) => {
			console.log("[writer-created] listener hit");
			onWriterCreated(logs as unknown as unknown[]);
		},
	});
}

export async function listenToNewEntries() {
	// Query to get all writers & create listeners for each
	const writers = await prisma.writer.findMany({
		where: {
			storageAddress: {
				not: null,
			},
		},
	});
	const listeners = [];
	for (const writer of writers) {
		if (!writer.storageAddress) {
			continue;
		}
		listeners.push(
			publicClient.watchContractEvent({
				pollingInterval: 1_000,
				address: getAddress(writer.storageAddress),
				abi: writerStorageAbi,
				eventName: "EntryCreated",
				onLogs: (logs) => {
					console.log("[writer-entry-created] listener hit");
					onWriterEntryCreated(logs as unknown as unknown[]);
				},
			}),
		);
	}
}
