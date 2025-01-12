import { createPublicClient, http, type Hex } from "viem";
import { optimism } from "viem/chains";
import { WriterFactoryAbi } from "./abis/WriterFactoryAbi";
import { WriterStorageAbi } from "./abis/WriterStorageAbi";

const rpcUrl = process.env.RPC_URL;

if (!rpcUrl) {
	throw new Error("RPC_URL is not set");
}

export const publicClient = createPublicClient({
	chain: optimism,
	transport: http(rpcUrl),
});

export function computeWriterStorageAddress({
	address,
	salt,
}: { address: Hex; salt: Hex }) {
	return publicClient.readContract({
		address,
		abi: WriterFactoryAbi,
		functionName: "computeWriterStorageAddress",
		args: [salt],
	});
}

export function computeWriterAddress({
	address,
	salt,
	title,
	admin,
	managers,
}: {
	address: Hex;
	salt: Hex;
	title: string;
	admin: Hex;
	managers: Hex[];
}) {
	return publicClient.readContract({
		address,
		abi: WriterFactoryAbi,
		functionName: "computeWriterAddress",
		args: [title, admin, managers, salt],
	});
}

export async function getDoesEntryExist({
	address,
	id,
}: { address: Hex; id: bigint }) {
	const entry = await publicClient.readContract({
		address,
		abi: WriterStorageAbi,
		functionName: "getEntry",
		args: [id],
	});
	console.log("entry", entry);
	return entry.exists;
}
