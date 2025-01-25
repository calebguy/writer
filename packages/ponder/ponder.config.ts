import { parseAbiItem } from "abitype";
import { createConfig, factory } from "ponder";
import { ColorRegistryAbi } from "./../utils/abis/ColorRegistryAbi";

import { WriterFactoryAbi, WriterStorageAbi } from "utils/abis";
import { http, type Hex } from "viem";
import { WriterAbi } from "../utils/abis/WriterAbi";
import { env } from "./env";

const writerCreatedEvent = parseAbiItem(
	"event WriterCreated(address indexed writerAddress,address indexed storeAddress,address indexed admin,string title,address[] managers)",
);

const hexSetEvent = parseAbiItem(
	"event HexSet(address indexed user,bytes32 indexed hexColor)",
);

export default createConfig({
	networks: {
		op: {
			chainId: 10,
			transport: http(env.RPC_URL),
		},
	},
	contracts: {
		WriterFactory: {
			network: "op",
			abi: WriterFactoryAbi,
			address: env.FACTORY_ADDRESS as Hex,
			startBlock: 128163471,
		},
		Writer: {
			network: "op",
			abi: WriterAbi,
			address: factory({
				address: env.FACTORY_ADDRESS as Hex,
				event: writerCreatedEvent,
				parameter: "writerAddress",
			}),
			startBlock: 128163471,
		},
		WriterStorage: {
			network: "op",
			abi: WriterStorageAbi,
			address: factory({
				address: env.FACTORY_ADDRESS as Hex,
				event: writerCreatedEvent,
				parameter: "storeAddress",
			}),
			startBlock: 128163471,
		},
		ColorRegistry: {
			network: "op",
			abi: ColorRegistryAbi,
			address: env.COLOR_REGISTRY_ADDRESS as Hex,
			startBlock: 131074515,
		},
	},
});
