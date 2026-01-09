import type { Entry } from "./api";

// Simple global cache for processed entries - no React integration
const entryCache = new Map<string, Entry>();

function cacheKey(writerAddress: string, entryId: string): string {
	// Normalize address to lowercase for consistent cache hits
	return `${writerAddress.toLowerCase()}:${entryId}`;
}

export function getCachedEntry(
	writerAddress: string,
	entryId: string,
): Entry | undefined {
	return entryCache.get(cacheKey(writerAddress, entryId));
}

export function setCachedEntry(
	writerAddress: string,
	entryId: string,
	entry: Entry,
): void {
	entryCache.set(cacheKey(writerAddress, entryId), entry);
}

export function clearCachedEntry(
	writerAddress: string,
	entryId: string,
): void {
	entryCache.delete(cacheKey(writerAddress, entryId));
}
