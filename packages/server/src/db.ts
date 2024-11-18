import { type Prisma, PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export function writerToJsonSafe({
	onChainId,
	createdAtBlock,
	...writer
}: Prisma.WriterGetPayload<{
	include: { transaction: true; entries: true };
}>) {
	return {
		...writer,
		transaction: writer.transaction
			? {
					...writer.transaction,
					chainId: writer.transaction.chainId.toString(),
					blockNumber: writer.transaction.blockNumber?.toString(),
				}
			: null,
		entries: writer.entries.map((entry) => ({
			...entry,
			writerId: entry.writerId.toString(),
			createdAtBlock: entry.createdAtBlock?.toString(),
		})),
		onChainId: onChainId?.toString(),
		createdAtBlock: createdAtBlock?.toString(),
	};
}
