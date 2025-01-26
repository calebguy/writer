import { brotliDecompressSync } from "node:zlib";

export function decompressBrotli(input: string) {
	const compressedData = Uint8Array.from(atob(input), (char) =>
		char.charCodeAt(0),
	);
	const decompressedData = brotliDecompressSync(compressedData);
	const textDecoder = new TextDecoder();
	const decoded = textDecoder.decode(decompressedData);
	return decoded;
}
