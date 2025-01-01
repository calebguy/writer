import { createPublicClient, http, type Hex } from "viem";
import { optimism } from "viem/chains";
import { WriterFactoryAbi } from "./abis/WriterFactoryAbi";

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
