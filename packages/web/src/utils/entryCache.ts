import type { Entry } from "./api";

const DB_NAME = "writer-entry-cache";
const DB_VERSION = 1;
const STORE_NAME = "entries";

// Private entries stay in memory only (session-scoped for security)
const privateEntryCache = new Map<string, Entry>();

// IndexedDB instance (lazy initialized)
let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
	if (dbPromise) return dbPromise;

	dbPromise = new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: "key" });
			}
		};
	});

	return dbPromise;
}

function publicCacheKey(writerAddress: string, entryId: string): string {
	return `${writerAddress.toLowerCase()}:${entryId}`;
}

function privateCacheKey(
	walletAddress: string,
	writerAddress: string,
	entryId: string,
): string {
	return `${walletAddress.toLowerCase()}:${writerAddress.toLowerCase()}:${entryId}`;
}

// ============ Public Entry Cache (IndexedDB - persistent) ============

export async function getPublicCachedEntry(
	writerAddress: string,
	entryId: string,
): Promise<Entry | null> {
	try {
		const db = await getDB();
		const key = publicCacheKey(writerAddress, entryId);

		return new Promise((resolve, reject) => {
			const transaction = db.transaction(STORE_NAME, "readonly");
			const store = transaction.objectStore(STORE_NAME);
			const request = store.get(key);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				const result = request.result;
				resolve(result ? result.entry : null);
			};
		});
	} catch {
		// IndexedDB not available (SSR, private browsing, etc.)
		return null;
	}
}

export async function setPublicCachedEntry(
	writerAddress: string,
	entryId: string,
	entry: Entry,
): Promise<void> {
	try {
		const db = await getDB();
		const key = publicCacheKey(writerAddress, entryId);

		return new Promise((resolve, reject) => {
			const transaction = db.transaction(STORE_NAME, "readwrite");
			const store = transaction.objectStore(STORE_NAME);
			const request = store.put({
				key,
				entry,
				updatedAt: entry.updatedAt ?? new Date().toISOString(),
			});

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve();
		});
	} catch {
		// Silently fail if IndexedDB not available
	}
}

export async function clearPublicCachedEntry(
	writerAddress: string,
	entryId: string,
): Promise<void> {
	try {
		const db = await getDB();
		const key = publicCacheKey(writerAddress, entryId);

		return new Promise((resolve, reject) => {
			const transaction = db.transaction(STORE_NAME, "readwrite");
			const store = transaction.objectStore(STORE_NAME);
			const request = store.delete(key);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve();
		});
	} catch {
		// Silently fail if IndexedDB not available
	}
}

export async function clearAllPublicEntriesForWriter(
	writerAddress: string,
): Promise<void> {
	try {
		const db = await getDB();
		const prefix = `${writerAddress.toLowerCase()}:`;

		return new Promise((resolve, reject) => {
			const transaction = db.transaction(STORE_NAME, "readwrite");
			const store = transaction.objectStore(STORE_NAME);
			const request = store.openCursor();

			request.onerror = () => reject(request.error);
			request.onsuccess = (event) => {
				const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
				if (cursor) {
					if (cursor.key.toString().startsWith(prefix)) {
						cursor.delete();
					}
					cursor.continue();
				} else {
					resolve();
				}
			};
		});
	} catch {
		// Silently fail if IndexedDB not available
	}
}

// ============ Private Entry Cache (Memory - session only) ============

export function getPrivateCachedEntry(
	walletAddress: string,
	writerAddress: string,
	entryId: string,
): Entry | null {
	const key = privateCacheKey(walletAddress, writerAddress, entryId);
	return privateEntryCache.get(key) ?? null;
}

export function setPrivateCachedEntry(
	walletAddress: string,
	writerAddress: string,
	entryId: string,
	entry: Entry,
): void {
	const key = privateCacheKey(walletAddress, writerAddress, entryId);
	privateEntryCache.set(key, entry);
}

export function clearPrivateCachedEntry(
	walletAddress: string,
	writerAddress: string,
	entryId: string,
): void {
	const key = privateCacheKey(walletAddress, writerAddress, entryId);
	privateEntryCache.delete(key);
}

export function clearAllPrivateEntriesForWallet(walletAddress: string): void {
	const prefix = `${walletAddress.toLowerCase()}:`;
	for (const key of privateEntryCache.keys()) {
		if (key.startsWith(prefix)) {
			privateEntryCache.delete(key);
		}
	}
}

// ============ Unified API ============

export async function getCachedEntry(
	writerAddress: string,
	entryId: string,
	options?: { walletAddress?: string; isPrivate?: boolean },
): Promise<Entry | null> {
	const { walletAddress, isPrivate } = options ?? {};

	if (isPrivate && walletAddress) {
		return getPrivateCachedEntry(walletAddress, writerAddress, entryId);
	}

	return getPublicCachedEntry(writerAddress, entryId);
}

export async function setCachedEntry(
	writerAddress: string,
	entryId: string,
	entry: Entry,
	options?: { walletAddress?: string; isPrivate?: boolean },
): Promise<void> {
	const { walletAddress, isPrivate } = options ?? {};

	if (isPrivate && walletAddress) {
		setPrivateCachedEntry(walletAddress, writerAddress, entryId, entry);
		return;
	}

	return setPublicCachedEntry(writerAddress, entryId, entry);
}

export async function clearCachedEntry(
	writerAddress: string,
	entryId: string,
	options?: { walletAddress?: string; isPrivate?: boolean },
): Promise<void> {
	const { walletAddress, isPrivate } = options ?? {};

	if (isPrivate && walletAddress) {
		clearPrivateCachedEntry(walletAddress, writerAddress, entryId);
		return;
	}

	return clearPublicCachedEntry(writerAddress, entryId);
}
