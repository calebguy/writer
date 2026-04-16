import type { ConnectedWallet } from "@privy-io/react-auth";
import {
	getDerivedSigningKeyV1,
	getDerivedSigningKeyV2,
	getDerivedSigningKeyV3,
	getDerivedSigningKeyV4,
	getDerivedSigningKeyV5,
} from "./signer";

export type KeyVersion = "v1" | "v2" | "v3" | "v4" | "v5";

// In-memory cache for derived keys (session-scoped for security).
//
// Cache key formats:
//   v1/v2/v3: "${walletAddress}:${version}"               — global per user
//   v4/v5:    "${walletAddress}:${storageId}:${version}"  — per writer
//
// The v4/v5 keys are per-writer because derivation is bound to a specific
// storageId. Visiting writer A and then writer B requires two signatures
// (one key per writer), but each is cached for the rest of the session.
const keyCache = new Map<string, Uint8Array>();

function legacyKeyCacheKey(
	walletAddress: string,
	version: "v1" | "v2" | "v3",
): string {
	return `${walletAddress.toLowerCase()}:${version}`;
}

function perWriterCacheKey(
	walletAddress: string,
	storageId: string,
	version: "v4" | "v5",
): string {
	return `${walletAddress.toLowerCase()}:${storageId.toLowerCase()}:${version}`;
}

/**
 * Fetch a derived encryption key, deriving + caching it on first access.
 *
 * For v1/v2/v3 (global keys), `storageId` must be omitted.
 * For v4/v5 (per-writer keys), `storageId` is required.
 */
export async function getCachedDerivedKey(
	wallet: ConnectedWallet,
	version: KeyVersion,
	storageId?: string,
): Promise<Uint8Array> {
	if (version === "v5" || version === "v4") {
		if (!storageId) {
			throw new Error(
				`getCachedDerivedKey: ${version} requires a storageId`,
			);
		}
		const cacheKey = perWriterCacheKey(wallet.address, storageId, version);
		const cached = keyCache.get(cacheKey);
		if (cached) {
			return cached;
		}
		const key =
			version === "v5"
				? await getDerivedSigningKeyV5(wallet, storageId)
				: await getDerivedSigningKeyV4(wallet, storageId);
		keyCache.set(cacheKey, key);
		return key;
	}

	const cacheKey = legacyKeyCacheKey(wallet.address, version);
	const cached = keyCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	const key =
		version === "v3"
			? await getDerivedSigningKeyV3(wallet)
			: version === "v2"
				? await getDerivedSigningKeyV2(wallet)
				: await getDerivedSigningKeyV1(wallet);

	keyCache.set(cacheKey, key);
	return key;
}

/**
 * Check whether a derived key is already in the cache (no signature prompt).
 *
 * For v1/v2/v3, `storageId` must be omitted.
 * For v4/v5, `storageId` is required.
 */
export function hasCachedDerivedKey(
	wallet: ConnectedWallet,
	version: KeyVersion,
	storageId?: string,
): boolean {
	if (version === "v5" || version === "v4") {
		if (!storageId) return false;
		return keyCache.has(
			perWriterCacheKey(wallet.address, storageId, version),
		);
	}
	return keyCache.has(legacyKeyCacheKey(wallet.address, version));
}

/**
 * Bulk-fetch the legacy v1/v2/v3 keys for backward-compat decryption paths.
 * Does NOT include v4/v5 because those keys are per-writer and can't be
 * sensibly fetched without a storageId.
 */
export async function getCachedDerivedLegacyKeys(
	wallet: ConnectedWallet,
): Promise<{
	keyV3: Uint8Array;
	keyV2: Uint8Array;
	keyV1: Uint8Array;
}> {
	const keyV3 = await getCachedDerivedKey(wallet, "v3");
	const keyV2 = await getCachedDerivedKey(wallet, "v2");
	const keyV1 = await getCachedDerivedKey(wallet, "v1");
	return { keyV3, keyV2, keyV1 };
}

// Backwards-compat alias — kept so existing call sites don't break. Same
// behavior as getCachedDerivedLegacyKeys: returns only v1/v2/v3, not v4/v5.
export const getCachedDerivedKeys = getCachedDerivedLegacyKeys;

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
