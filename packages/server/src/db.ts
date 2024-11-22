import { type Prisma, PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export function writerToJsonSafe({
	onChainId,
	...writer
}: Prisma.WriterGetPayload<{
	include: { transaction: true; entries: true };
}>) {
	return {
		...writer,
		onChainId: onChainId?.toString(),
		transaction: writer.transaction
			? {
					...writer.transaction,
					chainId: writer.transaction.chainId.toString(),
					blockNumber: writer.transaction.blockNumber?.toString(),
				}
			: null,
		entries: writer.entries.map((entry) => ({
			...entry,
			onChainId: entry.onChainId?.toString(),
		})),
	};
}
