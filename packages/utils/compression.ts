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

export function orderContentChunks<T extends { index: number }>(
	chunks: readonly T[],
) {
	return chunks.toSorted((left, right) => left.index - right.index);
}

function tryDecompressBrotli(input: string): string | null {
	try {
		return decompressBrotli(input);
	} catch {
		return null;
	}
}

export function processRawContent(raw: string) {
	let version = null;
	let decompressed = null;
	if (raw.startsWith("br:")) {
		version = "br";
		decompressed = tryDecompressBrotli(raw.slice(3));
	} else if (raw.startsWith("enc:v5:br:")) {
		version = "enc:v5:br:";
	} else if (raw.startsWith("enc:v4:br:")) {
		version = "enc:v4:br:";
	} else if (raw.startsWith("enc:v3:br:")) {
		version = "enc:v3:br:";
	} else if (raw.startsWith("enc:v2:br:")) {
		version = "enc:v2:br:";
	} else if (raw.startsWith("enc:br:")) {
		version = "enc:br:";
	} else {
		version = "raw";
		decompressed = raw;
	}
	return { version, decompressed };
}
