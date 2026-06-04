import {
	createPublicClient,
	createWalletClient,
	decodeFunctionData,
	http,
	parseAbiItem,
	type Abi,
	type Address,
	type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { WriterAbi, WriterFactoryAbi } from "../../utils/abis";

const env = (k: string) => {
	const v = Bun.env[k];
	if (!v) throw new Error(`Missing ${k}`);
	return v;
};
const src = createPublicClient({ transport: http(env("SRC_RPC")) });
const dst = createPublicClient({ transport: http(env("DST_RPC")) });
const chain = {
	id: Number(Bun.env.DST_CHAIN_ID ?? (await dst.getChainId())),
	name: "target",
	nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
	rpcUrls: { default: { http: [env("DST_RPC")] } },
};
const account = privateKeyToAccount(env("PK") as Hex);
const wallet = createWalletClient({ account, chain, transport: http(env("DST_RPC")) });
const SRC_FACTORY = env("SRC_FACTORY") as Address;
const DST_FACTORY = (Bun.env.DST_FACTORY ?? SRC_FACTORY) as Address;
const FROM = BigInt(env("FROM_BLOCK"));
const TO = Bun.env.TO_BLOCK ? BigInt(Bun.env.TO_BLOCK) : await src.getBlockNumber();
const STEP = BigInt(Bun.env.STEP ?? "50000");
const created = parseAbiItem(
	"event WriterCreated(address indexed writerAddress,address indexed storeAddress,address indexed admin,string title,address[] managers,bool publicWritable)",
);
const factoryAbi = WriterFactoryAbi as Abi;
const writerAbi = WriterAbi as Abi;
const portable = new Set([
	"createWithSig",
	"createWithChunkWithSig",
	"addChunkWithSig",
	"updateWithSig",
	"removeWithSig",
	"setTitleWithSig",
	"grantWriterRoleWithSig",
	"revokeWriterRoleWithSig",
	"renounceWriterRoleWithSig",
]);

async function send(address: Address, abi: Abi, functionName: string, args: readonly unknown[]) {
	try {
		const { request } = await dst.simulateContract({ account, address, abi, functionName, args } as never);
		const hash = await wallet.writeContract(request);
		await dst.waitForTransactionReceipt({ hash });
		return hash;
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		if (msg.includes("Signature has already been executed")) return "already-replayed";
		throw err;
	}
}

if (!(await dst.getCode({ address: DST_FACTORY }))) throw new Error("Target factory is not deployed");
for (let from = FROM; from <= TO; from += STEP + 1n) {
	const toBlock = from + STEP > TO ? TO : from + STEP;
	const places = await src.getLogs({ address: SRC_FACTORY, event: created, fromBlock: from, toBlock });
	for (const place of places) {
		const srcWriter = place.args.writerAddress as Address;
		const srcStore = place.args.storeAddress as Address;
		const createTx = await src.getTransaction({ hash: place.transactionHash });
		const create = decodeFunctionData({ abi: factoryAbi, data: createTx.input });
		if (create.functionName !== "create") continue;
		const args = create.args as [string, Address, Address[], boolean, Hex];
		const salt = args[4];
		const targetWriter = await dst.readContract({ address: DST_FACTORY, abi: factoryAbi, functionName: "computeWriterAddress", args }) as Address;
		const targetStore = await dst.readContract({ address: DST_FACTORY, abi: factoryAbi, functionName: "computeWriterStorageAddress", args: [salt] }) as Address;
		if (targetWriter.toLowerCase() !== srcWriter.toLowerCase() || targetStore.toLowerCase() !== srcStore.toLowerCase()) {
			throw new Error(`Target addresses differ; signatures bind verifyingContract. ${srcWriter} -> ${targetWriter}`);
		}
		if (!(await dst.getCode({ address: targetWriter }))) {
			console.log("create place", srcWriter);
			await send(DST_FACTORY, factoryAbi, "create", args);
		}
		const logs = [
			...(await src.getLogs({ address: srcWriter, fromBlock: place.blockNumber, toBlock: TO })),
			...(await src.getLogs({ address: srcStore, fromBlock: place.blockNumber, toBlock: TO })),
		];
		const txs = [...new Map(logs.map((l) => [l.transactionHash, l])).values()]
			.sort((a, b) => Number(a.blockNumber - b.blockNumber) || a.transactionIndex - b.transactionIndex);
		for (const log of txs) {
			const tx = await src.getTransaction({ hash: log.transactionHash });
			if (tx.to?.toLowerCase() !== srcWriter.toLowerCase()) continue;
			try {
				const call = decodeFunctionData({ abi: writerAbi, data: tx.input });
				if (!portable.has(call.functionName)) continue;
				console.log("replay", call.functionName, srcWriter, log.transactionHash);
				await send(targetWriter, writerAbi, call.functionName, call.args as readonly unknown[]);
			} catch (err) {
				if ((err instanceof Error ? err.message : String(err)).includes("Abi")) continue;
				throw err;
			}
		}
	}
}
