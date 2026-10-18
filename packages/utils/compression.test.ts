import { describe, expect, test } from "bun:test";
import { brotliCompressSync } from "node:zlib";
import { orderContentChunks, processRawContent } from "./compression";

describe("processRawContent", () => {
	test("returns an undecoded Brotli entry for an incomplete base64 chunk", () => {
		expect(processRawContent("br:incomplete!")).toEqual({
			version: "br",
			decompressed: null,
		});
	});

	test("returns an undecoded Brotli entry for truncated compressed data", () => {
		const encoded = Buffer.from(brotliCompressSync("complete entry")).toString(
			"base64",
		);
		expect(processRawContent(`br:${encoded.slice(0, -4)}`)).toEqual({
			version: "br",
			decompressed: null,
		});
	});

	test("decompresses complete Brotli content", () => {
		const encoded = Buffer.from(brotliCompressSync("complete entry")).toString(
			"base64",
		);
		expect(processRawContent(`br:${encoded}`).decompressed).toBe(
			"complete entry",
		);
	});
});

describe("orderContentChunks", () => {
	test("orders indexed chunks before content reconstruction", () => {
		const chunks = [
			{ index: 2, content: "third" },
			{ index: 0, content: "first" },
			{ index: 1, content: "second" },
		];
		expect(orderContentChunks(chunks).map((chunk) => chunk.content)).toEqual([
			"first",
			"second",
			"third",
		]);
	});
});
