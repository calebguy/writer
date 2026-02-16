import type { ConnectedWallet } from "@privy-io/react-auth";
import { getDerivedSigningKeyV1, getDerivedSigningKeyV2 } from "./signer";

// In-memory cache for derived keys (session-scoped for security)
// Key format: "walletAddress:version"
const keyCache = new Map<string, Uint8Array>();

function keyCacheKey(walletAddress: string, version: "v1" | "v2"): string {
	return `${walletAddress.toLowerCase()}:${version}`;
}

export async function getCachedDerivedKey(
	wallet: ConnectedWallet,
	version: "v1" | "v2",
): Promise<Uint8Array> {
	const cacheKey = keyCacheKey(wallet.address, version);

	// Check cache first
	const cached = keyCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	// Derive key and cache it
	const key =
		version === "v2"
			? await getDerivedSigningKeyV2(wallet)
			: await getDerivedSigningKeyV1(wallet);

	keyCache.set(cacheKey, key);
	return key;
}

export function hasCachedDerivedKey(
	wallet: ConnectedWallet,
	version: "v1" | "v2",
): boolean {
	const cacheKey = keyCacheKey(wallet.address, version);
	return keyCache.has(cacheKey);
}

export async function getCachedDerivedKeys(wallet: ConnectedWallet): Promise<{
	keyV2: Uint8Array;
	keyV1: Uint8Array;
}> {
	const keyV2 = await getCachedDerivedKey(wallet, "v2");
	const keyV1 = await getCachedDerivedKey(wallet, "v1");
	return { keyV2, keyV1 };
}

export function clearCachedKeysForWallet(walletAddress: string): void {
	const prefix = `${walletAddress.toLowerCase()}:`;
	for (const key of keyCache.keys()) {
		if (key.startsWith(prefix)) {
			keyCache.delete(key);
		}
	}
}

export function clearAllCachedKeys(): void {
	keyCache.clear();
}
