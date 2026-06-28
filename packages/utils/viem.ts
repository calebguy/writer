import { createPublicClient, http, type Hex } from "viem";
import { optimism } from "viem/chains";
import { WriterFactoryAbi } from "./abis/WriterFactoryAbi";
import { WriterStorageAbi } from "./abis/WriterStorageAbi";

interface StorageEntry {
	exists: boolean;
}

const rpcUrl = process.env.RPC_URL;

if (!rpcUrl) {
	throw new Error("RPC_URL is not set");
}

export const publicClient = createPublicClient({
	chain: optimism,
	transport: http(rpcUrl),
});

export async function computeWriterStorageAddress({
	address,
	salt,
}: { address: Hex; salt: Hex }): Promise<Hex> {
	return (await publicClient.readContract({
		address,
		abi: WriterFactoryAbi,
		functionName: "computeWriterStorageAddress",
		args: [salt],
	})) as Hex;
}

export async function computeWriterAddress({
	address,
	salt,
	title,
	admin,
	managers,
	publicWritable,
}: {
	address: Hex;
	salt: Hex;
	title: string;
	admin: Hex;
	managers: Hex[];
	publicWritable: boolean;
}): Promise<Hex> {
	return (await publicClient.readContract({
		address,
		abi: WriterFactoryAbi,
		functionName: "computeWriterAddress",
		args: [title, admin, managers, publicWritable, salt],
	})) as Hex;
}

export async function getDoesEntryExist({
	address,
	id,
}: { address: Hex; id: bigint }) {
	const entry = (await publicClient.readContract({
		address,
		abi: WriterStorageAbi,
		functionName: "getEntry",
		args: [id],
	})) as StorageEntry;

	return entry.exists;
}
