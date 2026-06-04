import type { Entry, Writer } from "./api";

export const PENDING_PUBLIC_ENTRY_RAW = "br:";
export const PENDING_PRIVATE_ENTRY_RAW = "enc:v5:br:";

type OptimisticEntryInput = {
	id: number;
	markdown: string;
	raw: string;
	author?: string;
	createdAt?: string;
};

function versionForRaw(raw: string): string {
	if (raw.startsWith("enc:v5:br:")) return "enc:v5:br:";
	if (raw.startsWith("enc:v4:br:")) return "enc:v4:br:";
	return "br:";
}

export function buildOptimisticEntry(
	writer: Writer,
	{ id, markdown, raw, author = "", createdAt }: OptimisticEntryInput,
): Entry {
	const now = createdAt ?? new Date().toISOString();

	return {
		id,
		exists: true,
		onChainId: null,
		author,
		createdAtHash: null,
		createdAtBlock: null,
		createdAtBlockDatetime: null,
		deletedAtHash: null,
		deletedAtBlock: null,
		deletedAtBlockDatetime: null,
		updatedAtHash: null,
		updatedAtBlock: null,
		updatedAtBlockDatetime: null,
		createdAt: now,
		updatedAt: now,
		deletedAt: null,
		storageAddress: writer.storageAddress,
		storageId: writer.storageId,
		createdAtTransactionId: null,
		deletedAtTransactionId: null,
		updatedAtTransactionId: null,
		chunks: [
			{
				id,
				entryId: id,
				index: 0,
				content: raw,
				createdAt: now,
				createdAtTransactionId: null,
			},
		],
		raw,
		version: versionForRaw(raw),
		decompressed: markdown,
	} as unknown as Entry;
}

export function prependOptimisticEntry(writer: Writer, entry: Entry): Writer {
	return {
		...writer,
		entries: [
			entry,
			...writer.entries.filter((existing) => existing.id !== entry.id),
		],
	};
}

export function replaceOptimisticEntryRaw(
	writer: Writer,
	entryId: number,
	raw: string,
): Writer {
	return {
		...writer,
		entries: writer.entries.map((entry) => {
			if (entry.id !== entryId) return entry;
			return {
				...entry,
				raw,
				version: versionForRaw(raw),
				chunks: entry.chunks.map((chunk, index) =>
					index === 0 ? { ...chunk, content: raw } : chunk,
				),
			};
		}),
	};
}

export function removeOptimisticEntry(writer: Writer, entryId: number): Writer {
	return {
		...writer,
		entries: writer.entries.filter((entry) => entry.id !== entryId),
	};
}
