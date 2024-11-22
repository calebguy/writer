import type {
	AbiEvent,
	GetContractEventsParameters,
	Log,
	WatchContractEventParameters,
} from "viem";
import { minBigInt } from "../helpers";
import chain, { type Chain } from "./chain";

export class LogFetcher {
	chain: Chain = chain;
	private readonly STEP = 3_000;

	async fetchLogsFromBlock<T extends AbiEvent>({
		fromBlock,
		address,
		abi,
		eventName,
		onLogs,
		args,
	}: Pick<
		GetContractEventsParameters,
		"fromBlock" | "address" | "abi" | "eventName" | "args"
	> & {
		fromBlock: bigint;
		// @note how can we get better exact typing here
		onLogs: (logs: Log[]) => Promise<void>;
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
		const step = BigInt(this.STEP);
		const from = fromBlock;
		const to = await this.chain.client.getBlockNumber();
		if (to < from) {
			console.debug(
				`To block number: ${to} is less than from block number: ${from}, skipping fetching history.`,
			);
			return;
		}

		for (let block = from; block <= to; block += step) {
			const toBlock = minBigInt(block + step, to);
			// console.log(`getting logs from block ${block} to ${toBlock}`);
			const logs = await this.chain.client.getContractEvents({
				address,
				abi,
				eventName,
				fromBlock: block,
				toBlock,
				args,
			});
			if (logs.length > 0) {
				await onLogs(logs);
			}
		}
	}

	watchEvent(args: WatchContractEventParameters) {
		return this.chain.client.watchContractEvent(args);
	}
}

export interface Listener extends LogFetcher {
	init(): void;
	listen(): Promise<unknown>;
	onLogs(logs: unknown[]): Promise<void>;
}
