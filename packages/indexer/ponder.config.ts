import { parseAbiItem } from "abitype";
import { createConfig, factory } from "ponder";
import { ColorRegistryAbi } from "utils/abis/ColorRegistryAbi";

import { WriterFactoryAbi, WriterStorageAbi } from "utils/abis";
import { WriterAbi } from "utils/abis/WriterAbi";
import type { Hex } from "viem";
import { env } from "./utils/env";

const writerCreatedEvent = parseAbiItem(
	"event WriterCreated(address indexed writerAddress,address indexed storeAddress,address indexed admin,string title,address[] managers)",
);

const startBlock = env.START_BLOCK;

export default createConfig({
	chains: {
		target: {
			id: Number(env.TARGET_CHAIN_ID),
			rpc: env.RPC_URL,
			ws: env.WS_RPC_URL,
		},
	},
	contracts: {
		WriterFactory: {
			chain: "target",
			abi: WriterFactoryAbi,
			address: env.FACTORY_ADDRESS as Hex,
			startBlock,
		},
		Writer: {
			chain: "target",
			abi: WriterAbi,
			address: factory({
				address: env.FACTORY_ADDRESS as Hex,
				event: writerCreatedEvent,
				parameter: "writerAddress",
			}),
			startBlock,
		},
		WriterStorage: {
			chain: "target",
			abi: WriterStorageAbi,
			address: factory({
				address: env.FACTORY_ADDRESS as Hex,
				event: writerCreatedEvent,
				parameter: "storeAddress",
			}),
			startBlock,
		},
		ColorRegistry: {
			chain: "target",
			abi: ColorRegistryAbi,
			address: env.COLOR_REGISTRY_ADDRESS as Hex,
			startBlock,
		},
	},
});
