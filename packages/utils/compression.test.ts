import { describe, expect, test } from "bun:test";
import { brotliCompressSync } from "node:zlib";
import { processRawContent } from "./compression";

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
