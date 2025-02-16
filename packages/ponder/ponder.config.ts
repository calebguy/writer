import { parseAbiItem } from "abitype";
import { createConfig, factory } from "ponder";
import { ColorRegistryAbi } from "./../utils/abis/ColorRegistryAbi";

import { WriterFactoryAbi, WriterStorageAbi } from "utils/abis";
import { http, type Hex } from "viem";
import { WriterAbi } from "../utils/abis/WriterAbi";
import { env } from "./utils/env";

const writerCreatedEvent = parseAbiItem(
	"event WriterCreated(address indexed writerAddress,address indexed storeAddress,address indexed admin,string title,address[] managers)",
);

const startBlock = env.START_BLOCK;

export default createConfig({
	networks: {
		target: {
			chainId: env.TARGET_CHAIN_ID,
			transport: http(env.RPC_URL),
		},
	},
	contracts: {
		WriterFactory: {
			network: "target",
			abi: WriterFactoryAbi,
			address: env.FACTORY_ADDRESS as Hex,
			startBlock,
		},
		Writer: {
			network: "target",
			abi: WriterAbi,
			address: factory({
				address: env.FACTORY_ADDRESS as Hex,
				event: writerCreatedEvent,
				parameter: "writerAddress",
			}),
			startBlock,
		},
		WriterStorage: {
			network: "target",
			abi: WriterStorageAbi,
			address: factory({
				address: env.FACTORY_ADDRESS as Hex,
				event: writerCreatedEvent,
				parameter: "storeAddress",
			}),
			startBlock,
		},
		ColorRegistry: {
			network: "target",
			abi: ColorRegistryAbi,
			address: env.COLOR_REGISTRY_ADDRESS as Hex,
			startBlock,
		},
	},
});
