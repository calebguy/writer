import type { ConnectedWallet } from "@privy-io/react-auth";
import {
	compress as compressBrotli,
	decompress as decompressBrotli,
} from "brotli-compress";
import type { Hex } from "viem";
import type { Entry } from "./api";

export function shortenAddress(address: Hex) {
	return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function hslToHex(h: number, s: number, l: number): `#${string}` {
	const c = (1 - Math.abs(2 * (l / 100) - 1)) * (s / 100);
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = l / 100 - c / 2;
	let r: string | number = 0;
	let g: string | number = 0;
	let b: string | number = 0;

	if (0 <= h && h < 60) {
		r = c;
		g = x;
		b = 0;
	} else if (60 <= h && h < 120) {
		r = x;
		g = c;
		b = 0;
	} else if (120 <= h && h < 180) {
		r = 0;
		g = c;
		b = x;
	} else if (180 <= h && h < 240) {
		r = 0;
		g = x;
		b = c;
	} else if (240 <= h && h < 300) {
		r = x;
		g = 0;
		b = c;
	} else if (300 <= h && h < 360) {
		r = c;
		g = 0;
		b = x;
	}
	// Having obtained RGB, convert channels to hex
	r = Math.round((r + m) * 255).toString(16);
	g = Math.round((g + m) * 255).toString(16);
	b = Math.round((b + m) * 255).toString(16);

	// Prepend 0s, if necessary
	if (r.length === 1) r = `0${r}`;
	if (g.length === 1) g = `0${g}`;
	if (b.length === 1) b = `0${b}`;

	return `#${r}${g}${b}`;
}

export function getRootVariableAsHex(h: string, s: string, l: string) {
	const rootStyles = getComputedStyle(document.documentElement);
	const hue = rootStyles.getPropertyValue(h).trim();
	const saturation = rootStyles.getPropertyValue(s).trim().replace("%", "");
	const lightness = rootStyles.getPropertyValue(l).trim().replace("%", "");
	return hslToHex(Number(hue), Number(saturation), Number(lightness));
}

export function hexColorToBytes32(hexColor: string) {
	// Remove the '#' prefix
	const hexWithoutHash = hexColor.slice(1);

	// Pad the hex value to 64 characters to make it a valid bytes32
	const paddedHex = hexWithoutHash.padStart(64, "0");

	return `0x${paddedHex}`;
}

export function RGBToHex(rgb: RGB): `#${string}` {
	const [r, g, b] = rgb;
	// Validate that RGB values are in the correct range
	if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
		throw new Error("RGB values must be in the range 0-255.");
	}

	// Convert each RGB component to a 2-digit HEX value
	const toHex = (value: number) => value?.toString(16).padStart(2, "0");

	// Combine into a HEX string
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export type RGB = [number, number, number];

export function hexToRGB(hex: string): RGB {
	// Validate the input to ensure it is a valid HEX color
	const hexRegex = /^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/;
	if (!hexRegex.test(hex)) {
		throw new Error("Invalid HEX color format. Expected #RRGGBB or #RGB.");
	}

	// Remove the `#` if present
	let hexWithoutHash = hex.replace(/^#/, "");

	// Expand shorthand HEX (e.g., #RGB to #RRGGBB)
	if (hex.length === 3) {
		hexWithoutHash = hex
			.split("")
			.map((char) => char + char)
			.join("");
	}

	// Parse the RGB values
	const r = Number.parseInt(hexWithoutHash.substring(0, 2), 16);
	const g = Number.parseInt(hexWithoutHash.substring(2, 4), 16);
	const b = Number.parseInt(hexWithoutHash.substring(4, 6), 16);

	return [r, g, b];
}

export function bytes32ToHexColor(bytes32: string): string {
	// Validate the input
	const bytes32Regex = /^0x[0-9a-fA-F]{64}$/;
	if (!bytes32Regex.test(bytes32)) {
		throw new Error(
			"Invalid bytes32 format. Expected a 64-character hexadecimal string prefixed with '0x'.",
		);
	}

	// Extract the last 6 characters
	const hexColor = bytes32.slice(-6);

	// Convert to a HEX color string
	return `#${hexColor}`;
}

export function setCSSVariableFromRGB(variable: string, rgb: RGB) {
	document.documentElement.style.setProperty(
		variable,
		`${rgb[0]} ${rgb[1]} ${rgb[2]}`,
	);
}

export function setPrimaryAndSecondaryCSSVariables(rgb: RGB) {
	setCSSVariableFromRGB("--color-primary", rgb);
	const secondaryColor = rgb.map((c) => c - 100);
	setCSSVariableFromRGB("--color-secondary", secondaryColor as RGB);
}

export async function compress(input: string) {
	const encode = new TextEncoder();
	const compressed = await compressBrotli(encode.encode(input), {
		quality: 11,
	});
	return btoa(String.fromCharCode(...compressed));
}

export async function decompress(compressed: string): Promise<string> {
	// Decode the Base64-encoded compressed data into a Uint8Array
	const compressedData = Uint8Array.from(atob(compressed), (char) =>
		char.charCodeAt(0),
	);

	// Decompress the Uint8Array using Brotli
	const decompressedData = await decompressBrotli(compressedData);

	// Decode the decompressed Uint8Array back into a string
	return new TextDecoder().decode(decompressedData);
}

export async function encrypt(key: Uint8Array, message: string) {
	const cryptoKey = await crypto.subtle.importKey(
		"raw",
		key,
		{ name: "AES-GCM" },
		false,
		["encrypt"],
	);

	const iv = crypto.getRandomValues(new Uint8Array(12)); // Generate IV
	const binaryMessage = new TextEncoder().encode(message); // Encode message to binary

	const encrypted = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		cryptoKey,
		binaryMessage,
	);

	// Combine IV and encrypted data
	const combined = new Uint8Array(iv.length + encrypted.byteLength);
	combined.set(iv);
	combined.set(new Uint8Array(encrypted), iv.length);

	// Encode combined result as Base64 for storage/transmission
	return btoa(String.fromCharCode(...combined));
}

export async function decrypt(key: Uint8Array, encryptedMessage: string) {
	const cryptoKey = await crypto.subtle.importKey(
		"raw",
		key,
		{ name: "AES-GCM" },
		false,
		["decrypt"],
	);

	// Decode Base64 encrypted message
	const combined = Uint8Array.from(atob(encryptedMessage), (char) =>
		char.charCodeAt(0),
	);

	// Extract IV and encrypted data
	const iv = combined.slice(0, 12);
	const encryptedData = combined.slice(12);

	// Decrypt the message
	const decrypted = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv },
		cryptoKey,
		encryptedData,
	);

	// Decode binary data to original string
	return new TextDecoder().decode(decrypted);
}

export async function processEntry(
	key: Uint8Array,
	entry: Entry,
): Promise<Entry> {
	if (entry.raw?.startsWith("enc:br:")) {
		// Remove the "enc:br:" prefix
		const decrypted = await decrypt(key, entry.raw.slice(7));
		const decompressed = await decompress(decrypted);
		return {
			...entry,
			decompressed,
		};
	}
	return entry;
}

export function isEntryPrivate(entry: Entry) {
	return entry.version?.startsWith("enc:") || entry.raw?.startsWith("enc:br:");
}

export function isWalletAuthor(wallet: ConnectedWallet, entry: Entry) {
	return entry.author === wallet?.address;
}

export function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
