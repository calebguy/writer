import { describe, expect, test } from "bun:test";
import type { Entry, Writer } from "./api";
import {
	PENDING_PRIVATE_ENTRY_RAW,
	PENDING_PUBLIC_ENTRY_RAW,
	buildOptimisticEntry,
	prependOptimisticEntry,
	removeOptimisticEntry,
	replaceOptimisticEntryRaw,
} from "./optimisticEntry";

function writerWithEntries(entries: Entry[] = []): Writer {
	return {
		address: "0x0000000000000000000000000000000000000001",
		storageAddress: "0x0000000000000000000000000000000000000002",
		storageId: "0xstorage",
		entries,
	} as unknown as Writer;
}

function entry(id: number): Entry {
	return { id, chunks: [], raw: `br:${id}` } as unknown as Entry;
}

describe("optimistic entry helpers", () => {
	test("builds a pending public entry with visible markdown", () => {
		const optimistic = buildOptimisticEntry(writerWithEntries(), {
			id: -1,
			markdown: "hello writer",
			raw: PENDING_PUBLIC_ENTRY_RAW,
			author: "0xauthor",
			createdAt: "2026-06-04T00:00:00.000Z",
		});

		expect(optimistic.id).toBe(-1);
		expect(optimistic.onChainId).toBeNull();
		expect(optimistic.createdAtHash).toBeNull();
		expect(optimistic.decompressed).toBe("hello writer");
		expect(optimistic.raw).toBe(PENDING_PUBLIC_ENTRY_RAW);
		expect(optimistic.version).toBe("br:");
		expect(optimistic.author).toBe("0xauthor");
		expect(optimistic.chunks[0]?.content).toBe(PENDING_PUBLIC_ENTRY_RAW);
	});

	test("marks pending private entries as encrypted while keeping markdown visible", () => {
		const optimistic = buildOptimisticEntry(writerWithEntries(), {
			id: -2,
			markdown: "secret",
			raw: PENDING_PRIVATE_ENTRY_RAW,
		});

		expect(optimistic.raw).toBe(PENDING_PRIVATE_ENTRY_RAW);
		expect(optimistic.version).toBe("enc:v5:br:");
		expect(optimistic.decompressed).toBe("secret");
	});

	test("prepends once, updates raw content, and removes by id", () => {
		const existing = entry(1);
		const optimistic = buildOptimisticEntry(writerWithEntries(), {
			id: -1,
			markdown: "hello writer",
			raw: PENDING_PUBLIC_ENTRY_RAW,
		});

		const inserted = prependOptimisticEntry(
			writerWithEntries([existing, optimistic]),
			optimistic,
		);
		expect(inserted.entries.map((item) => item.id)).toEqual([-1, 1]);

		const updated = replaceOptimisticEntryRaw(inserted, -1, "br:compressed");
		expect(updated.entries[0]?.raw).toBe("br:compressed");
		expect(updated.entries[0]?.chunks[0]?.content).toBe("br:compressed");

		const removed = removeOptimisticEntry(updated, -1);
		expect(removed.entries.map((item) => item.id)).toEqual([1]);
	});
});
