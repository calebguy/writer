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
