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

export const processRawContent = (raw: string) => {
	let version = null;
	let decompressed = null;
	if (raw.startsWith("br:")) {
		version = "br";
		decompressed = decompressBrotli(raw.slice(3));
	} else if (raw.startsWith("enc:br:")) {
		version = "enc:br";
		console.debug("received encrypted content, writing to DB");
	}
	return { version, decompressed };
};
