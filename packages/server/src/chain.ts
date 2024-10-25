import type { Prisma, TransactionStatus } from "@prisma/client";
import type { InputJsonValue } from "@prisma/client/runtime/library";
import {
	createPublicClient,
	fromHex,
	http,
	parseAbiItem,
	type AbiEvent,
	type Hex,
	type WatchEventParameters,
} from "viem";
import { optimism } from "viem/chains";
import { writerFactoryAbi } from "./abi/writerFactory";
import { prisma } from "./db";
import { env } from "./env";
import { minBigInt, synDataToUuid } from "./helpers";
import { syndicate } from "./server";

// const chain = isDev ? foundry : optimism;
const chain = optimism;
console.log(env.RPC_URL);
export const publicClient = createPublicClient({
	chain,
	transport: http(env.RPC_URL),
});

async function getEventLogsFromBlock<T extends AbiEvent>({
	fromBlock,
	address,
	event,
	onLogs,
}: Pick<
	WatchEventParameters<T>,
	"fromBlock" | "address" | "event" | "onLogs"
> & {
	fromBlock: bigint;
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
			abi: writerFactoryAbi,
			eventName: "WriterCreated",
			fromBlock,
			toBlock,
		});
		if (logs.length > 0) {
			onLogs(logs as any);
		}
	}
}

const event = parseAbiItem(
	"event WriterCreated(uint256 indexed id,address indexed writerAddress,address indexed admin,string title,address storeAddress,address[] managers)",
);

const fromBlock = env.FACTORY_FROM_BLOCK;
const address = env.FACTORY_ADDRESS as Hex;

async function onLogs(logs: any[]) {
	for (const log of logs) {
		console.log(log);
		const { blockNumber, transactionHash } = log;
		const { id, writerAddress, storeAddress, admin, managers, title } =
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

export async function getCreatedEvents(fromBlock: bigint) {
	return await getEventLogsFromBlock({
		fromBlock,
		address,
		event,
		onLogs,
	});
}

export async function getAllWriterCreatedEvents() {
	const mostRecentWriter = await prisma.writer.findFirst({
		orderBy: { createdAtBlock: "desc" },
		where: {
			createdAtBlock: {
				not: null,
			},
		},
	});
	if (!mostRecentWriter || !mostRecentWriter.createdAtBlock) {
		return getCreatedEvents(fromBlock);
	}
	const block = mostRecentWriter ? mostRecentWriter.createdAtBlock : fromBlock;
	console.log(`Getting events from block ${block}`);
	return await getCreatedEvents(block);
}

export async function listenToNewWriterCreatedEvents() {
	return publicClient.watchContractEvent({
		pollingInterval: 1_000,
		// fromBlock,
		address,
		abi: writerFactoryAbi,
		eventName: "WriterCreated",
		onLogs: (logs) => {
			console.log("listener hit");
			onLogs(logs as any);
		},
	});
}
