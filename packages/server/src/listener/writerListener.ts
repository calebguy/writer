import type { Hex } from "viem";
import { writerAbi } from "../abi/writer";
import { prisma } from "../db";
import chain from "./chain";

class WriterListener {
	private title: string | null = null;
	constructor(private readonly address: Hex) {}

	async init() {
		this.title = await this.getTitle();
		await this.syncState();
	}

	async syncState() {
		const entryIds = await this.getEntryIds();
		console.log("[got-entry-ids]", entryIds);
		for (const entryId of entryIds) {
			const entry = await this.getEntry(entryId);
			const content = await this.getEntryContent(entryId);
			console.log("[entry-content]", this.address, content);
			const writer = await prisma.writer.findUnique({
				where: {
					address: this.address,
				},
			});
			if (!writer) {
				console.error("[WRITER-NOT-FOUND]", this.address);
				return;
			}
			await prisma.entry.upsert({
				where: {
					onChainId_writerId: {
						onChainId: entryId,
						writerId: writer.id,
					},
				},
				update: {
					onChainId: entryId,
					content,
				},
				create: {
					onChainId: entryId,
					content,
					exists: entry.exists,
					writerId: writer.id,
				},
			});
		}
	}

	private getEntryIds() {
		return chain.client.readContract({
			address: this.address,
			abi: writerAbi,
			functionName: "getEntryIds",
		});
	}

	private getEntry(entryId: bigint) {
		return chain.client.readContract({
			address: this.address,
			abi: writerAbi,
			functionName: "getEntry",
			args: [entryId],
		});
	}

	private getEntryContent(entryId: bigint) {
		return chain.client.readContract({
			address: this.address,
			abi: writerAbi,
			functionName: "getEntryContent",
			args: [entryId],
		});
	}

	private getTitle() {
		return chain.client.readContract({
			address: this.address,
			abi: writerAbi,
			functionName: "title",
		});
	}
}

export default WriterListener;