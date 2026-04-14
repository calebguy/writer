import { parseAbiItem } from "abitype";
import { createConfig, factory } from "ponder";
import { ColorRegistryAbi } from "utils/abis/ColorRegistryAbi";

import { WriterFactoryAbi, WriterStorageAbi } from "utils/abis";
import { WriterAbi } from "utils/abis/WriterAbi";
import type { Hex } from "viem";
import { env } from "./utils/env";

// The old and new factories emit WriterCreated events with DIFFERENT
// signatures (different topic0 hashes):
//   Old: WriterCreated(address,address,address,string,address[])         → 0x23b591e1...
//   New: WriterCreated(address,address,address,string,address[],bool)    → 0xc9834efc...
//
// Because the event signatures differ, we need separate contract entries
// in the Ponder config — one per factory, each with its matching event.
// The handlers share logic but register under both contract names.

const oldWriterCreatedEvent = parseAbiItem(
	"event WriterCreated(address indexed writerAddress,address indexed storeAddress,address indexed admin,string title,address[] managers)",
);

const newWriterCreatedEvent = parseAbiItem(
	"event WriterCreated(address indexed writerAddress,address indexed storeAddress,address indexed admin,string title,address[] managers,bool publicWritable)",
);

// Minimal ABI for the old factory — just enough to parse its WriterCreated event.
const OldWriterFactoryAbi = [
	{
		type: "event" as const,
		name: "WriterCreated" as const,
		inputs: [
			{ name: "writerAddress", type: "address" as const, indexed: true, internalType: "address" as const },
			{ name: "storeAddress", type: "address" as const, indexed: true, internalType: "address" as const },
			{ name: "admin", type: "address" as const, indexed: true, internalType: "address" as const },
			{ name: "title", type: "string" as const, indexed: false, internalType: "string" as const },
			{ name: "managers", type: "address[]" as const, indexed: false, internalType: "address[]" as const },
		],
		anonymous: false as const,
	},
] as const;

const startBlock = env.START_BLOCK;

// Build the old-factory contract entries if OLD_FACTORY_ADDRESS is set.
// WriterStorage ABI is identical for old and new instances (WriterStorage
// bytecode was never modified), so old and new storage instances share
// the same event handlers.
const oldFactoryContracts = env.OLD_FACTORY_ADDRESS
	? {
			OldWriterFactory: {
				chain: "target" as const,
				abi: OldWriterFactoryAbi,
				address: env.OLD_FACTORY_ADDRESS as Hex,
				startBlock,
			},
			OldWriter: {
				chain: "target" as const,
				abi: WriterAbi,
				address: factory({
					address: env.OLD_FACTORY_ADDRESS as Hex,
					event: oldWriterCreatedEvent,
					parameter: "writerAddress",
				}),
				startBlock,
			},
			OldWriterStorage: {
				chain: "target" as const,
				abi: WriterStorageAbi,
				address: factory({
					address: env.OLD_FACTORY_ADDRESS as Hex,
					event: oldWriterCreatedEvent,
					parameter: "storeAddress",
				}),
				startBlock,
			},
		}
	: {};

export default createConfig({
	chains: {
		target: {
			id: Number(env.TARGET_CHAIN_ID),
			rpc: env.RPC_URL,
			ws: env.WS_RPC_URL,
		},
	},
	contracts: {
		// Legacy factory contracts (only present if OLD_FACTORY_ADDRESS is set)
		...oldFactoryContracts,

		// New factory contracts
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
				event: newWriterCreatedEvent,
				parameter: "writerAddress",
			}),
			startBlock,
		},
		WriterStorage: {
			chain: "target",
			abi: WriterStorageAbi,
			address: factory({
				address: env.FACTORY_ADDRESS as Hex,
				event: newWriterCreatedEvent,
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
