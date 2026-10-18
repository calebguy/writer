import { describe, expect, test } from "bun:test";
import {
	findResumableEntry,
	ONCHAIN_CHUNK_CHARACTER_LIMIT,
	splitEncodedContent,
} from "./contentChunks";

describe("splitEncodedContent", () => {
	test("keeps content at the chunk limit in one chunk", () => {
		const content = "a".repeat(ONCHAIN_CHUNK_CHARACTER_LIMIT);
		expect(splitEncodedContent(content)).toEqual([content]);
	});

	test("moves the first character over the limit into a second chunk", () => {
		const content = "a".repeat(ONCHAIN_CHUNK_CHARACTER_LIMIT + 1);
		expect(splitEncodedContent(content).map((chunk) => chunk.length)).toEqual([
			ONCHAIN_CHUNK_CHARACTER_LIMIT,
			1,
		]);
	});

	test("reconstructs multi-chunk encoded content without separators", () => {
		const content = `br:${"abc123".repeat(5_000)}`;
		expect(splitEncodedContent(content).join("")).toBe(content);
	});

	test("rejects empty content", () => {
		expect(() => splitEncodedContent("")).toThrow(
			"Entry content cannot be empty",
		);
	});

	test("rejects a zero chunk size", () => {
		expect(() => splitEncodedContent("content", 0)).toThrow(
			"Chunk size must be a positive safe integer",
		);
	});
});

describe("findResumableEntry", () => {
	const author = "0x1111111111111111111111111111111111111111";
	const chunks = ["br:first", "second", "third"];

	test("finds an interrupted entry whose chunks match the content prefix", () => {
		const entry = {
			author,
			onChainId: "7",
			raw: "br:firstsecond",
			chunks: [{ index: 0 }, { index: 1 }],
		};
		expect(findResumableEntry([entry], chunks, author)).toEqual({
			entry,
			nextChunkIndex: 2,
		});
	});

	test("does not resume an entry with different encoded content", () => {
		const entry = {
			author,
			onChainId: "7",
			raw: "br:different",
			chunks: [{ index: 0 }],
		};
		expect(findResumableEntry([entry], chunks, author)).toBeNull();
	});

	test("does not resume a complete entry", () => {
		const entry = {
			author,
			onChainId: "7",
			raw: chunks.join(""),
			chunks: [{ index: 0 }, { index: 1 }, { index: 2 }],
		};
		expect(findResumableEntry([entry], chunks, author)).toBeNull();
	});
});
