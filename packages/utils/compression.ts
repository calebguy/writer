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

// Attempts to decompress the content if not encrypted
// Returns the version and the decompressed content
export const processRawContent = (raw: string) => {
	console.log("processing raw content", raw);
	let version = null;
	let decompressed = null;
	if (raw.startsWith("br:")) {
		version = "br";
		decompressed = decompressBrotli(raw.slice(3));
	} else if (raw.startsWith("enc:br:")) {
		version = "enc:br";
		console.debug("received encrypted content, writing to DB");
	}
	// @note how should we handle non-supported versions?
	return { version, decompressed };
};
