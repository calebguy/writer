import { describe, expect, test } from "bun:test";
import {
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
