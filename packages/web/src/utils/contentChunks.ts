export const ONCHAIN_CHUNK_CHARACTER_LIMIT = 8_000;

export function splitEncodedContent(
	content: string,
	chunkSize = ONCHAIN_CHUNK_CHARACTER_LIMIT,
): string[] {
	if (content.length === 0) {
		throw new Error("Entry content cannot be empty");
	}
	if (!Number.isSafeInteger(chunkSize) || chunkSize < 1) {
		throw new Error("Chunk size must be a positive safe integer");
	}

	const chunks: string[] = [];
	for (let offset = 0; offset < content.length; offset += chunkSize) {
		chunks.push(content.slice(offset, offset + chunkSize));
	}
	return chunks;
}

type ChunkedEntryCandidate = {
	author: string;
	onChainId?: string | null;
	raw: string;
	chunks: readonly { index: number }[];
};

export function findResumableEntry<T extends ChunkedEntryCandidate>(
	entries: readonly T[],
	chunks: readonly string[],
	author: string,
): { entry: T; nextChunkIndex: number } | null {
	for (const entry of entries) {
		const storedChunkCount = entry.chunks.length;
		if (
			entry.onChainId == null ||
			entry.author.toLowerCase() !== author.toLowerCase() ||
			storedChunkCount === 0 ||
			storedChunkCount >= chunks.length ||
			!entry.chunks.every((chunk, index) => chunk.index === index)
		) {
			continue;
		}
		const expectedPrefix = chunks.slice(0, storedChunkCount).join("");
		if (entry.raw === expectedPrefix) {
			return { entry, nextChunkIndex: storedChunkCount };
		}
	}
	return null;
}
