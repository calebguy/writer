import { parseAbiItem } from "abitype";
import { createConfig, factory } from "ponder";
import { ColorRegistryAbi } from "utils/abis/ColorRegistryAbi";

import { WriterFactoryAbi, WriterStorageAbi } from "utils/abis";
import { WriterAbi } from "utils/abis/WriterAbi";
import type { Hex } from "viem";
import { env } from "./utils/env";

// The WriterCreated event is emitted by both the old and new factories.
// The new factory's event includes a `bool publicWritable` field that the
// old factory's event doesn't have. Ponder's factory() helper only uses
// the event to discover contract addresses (via the indexed params), so
// the non-indexed field difference doesn't affect address discovery.
// The handler in WriterFactory.ts decodes the full event args separately.
const writerCreatedEvent = parseAbiItem(
	"event WriterCreated(address indexed writerAddress,address indexed storeAddress,address indexed admin,string title,address[] managers,bool publicWritable)",
);

// If OLD_FACTORY_ADDRESS is set, track WriterCreated events from both
// factories so that legacy writers (created before the redeploy) continue
// to have their WriterStorage instances indexed for new events.
const factoryAddresses: Hex[] = env.OLD_FACTORY_ADDRESS
	? [env.OLD_FACTORY_ADDRESS as Hex, env.FACTORY_ADDRESS as Hex]
	: [env.FACTORY_ADDRESS as Hex];

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
			address: factoryAddresses,
			startBlock,
		},
		Writer: {
			chain: "target",
			abi: WriterAbi,
			address: factory({
				address: factoryAddresses,
				event: writerCreatedEvent,
				parameter: "writerAddress",
			}),
			startBlock,
		},
		WriterStorage: {
			chain: "target",
			abi: WriterStorageAbi,
			address: factory({
				address: factoryAddresses,
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
