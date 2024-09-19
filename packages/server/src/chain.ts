import {
	createPublicClient,
	http,
	parseAbiItem,
	type AbiEvent,
	type Hex,
	type WatchEventParameters,
} from "viem";
import { foundry, optimism } from "viem/chains";
import { prisma } from "./db";
import { env, isDev } from "./env";
import { minBigInt } from "./helpers";

const chain = isDev ? foundry : optimism;

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
		const logs = await publicClient.getLogs({
			address,
			event,
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
		return await prisma.writer.upsert({
			create: {
				id: Number(id),
				address: writerAddress as string,
				storageAddress: storeAddress as string,
				admin: admin as string,
				createdAtBlock: blockNumber.toString(),
				createdAtHash: transactionHash as string,
				authors: managers as string[],
				title,
			},
			update: {},
			where: { id: Number(id) },
		});
	}
}

export async function getAllWriterCreatedEvents() {
	const mostRecentWriter = await prisma.writer.findFirst({
		orderBy: { createdAtBlock: "desc" },
	});
	return await getEventLogsFromBlock({
		fromBlock: mostRecentWriter
			? BigInt(mostRecentWriter.createdAtBlock)
			: fromBlock,
		address,
		event,
		onLogs,
	});
}

export async function listenToNewWriterCreatedEvents() {
	return publicClient.watchEvent({
		fromBlock,
		address,
		event,
		onLogs,
	});
}
