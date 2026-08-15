export type EntryDraftKind = "create-entry" | "edit-entry";

export type EntryDraftPayload = {
	markdown: string;
	encrypted: boolean;
};

export type StoredEntryDraft = {
	id: string;
	payload: EntryDraftPayload;
	updatedAt: number;
};

type DraftRecord = {
	id: string;
	encryptedContent: string;
	updatedAt: number;
	version: 1;
};

type DraftKeyRecord = {
	id: string;
	key: CryptoKey;
};

const DRAFT_DATABASE_NAME = "writer-encrypted-drafts";
const DRAFT_DATABASE_VERSION = 1;
const DRAFT_STORE_NAME = "drafts";
const KEY_STORE_NAME = "keys";
const LOCAL_DRAFT_KEY_ID = "local-drafts-v1";
const LOCAL_DRAFT_PREFIX = "local:v1:";
const AES_GCM_IV_BYTES = 12;
const BASE64_CHUNK_SIZE = 0x8000;

export function buildEntryDraftId({
	kind,
	userAddress,
	writerAddress,
	entryId,
}: {
	kind: EntryDraftKind;
	userAddress: string;
	writerAddress: string;
	entryId?: string | number;
}) {
	const normalizedUserAddress = userAddress.toLowerCase();
	const normalizedWriterAddress = writerAddress.toLowerCase();
	const normalizedEntryId = entryId == null ? "new" : String(entryId);
	return [
		kind,
		normalizedUserAddress,
		normalizedWriterAddress,
		normalizedEntryId,
	].join(":");
}

export function buildCreatePlaceDraftId({
	userAddress,
}: {
	userAddress: string;
}) {
	return ["create-place", userAddress.toLowerCase()].join(":");
}

export function isAutoSavedDraftId(id: string | undefined) {
	return id?.startsWith("create-entry:") || id?.startsWith("create-place:");
}

export async function saveEncryptedDraft(
	id: string,
	payload: EntryDraftPayload,
): Promise<void> {
	const database = await openDraftDatabase();
	try {
		const key = await getLocalDraftKey(database);
		const encryptedContent = await encryptDraftPayload(payload, key);
		await putRecord<DraftRecord>(database, DRAFT_STORE_NAME, {
			id,
			encryptedContent,
			updatedAt: Date.now(),
			version: 1,
		});
	} finally {
		database.close();
	}
}

export async function loadEncryptedDraft(
	id: string,
): Promise<StoredEntryDraft | null> {
	const database = await openDraftDatabase();
	try {
		const record = await getRecord<DraftRecord>(database, DRAFT_STORE_NAME, id);
		if (!record) return null;
		const key = await getLocalDraftKey(database);
		const payload = await decryptDraftPayload(record.encryptedContent, key);
		return { id: record.id, payload, updatedAt: record.updatedAt };
	} finally {
		database.close();
	}
}

export async function clearEncryptedDraft(id: string): Promise<void> {
	const database = await openDraftDatabase();
	try {
		await deleteRecord(database, DRAFT_STORE_NAME, id);
	} finally {
		database.close();
	}
}

export async function encryptDraftPayload(
	payload: EntryDraftPayload,
	key: CryptoKey,
): Promise<string> {
	const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_BYTES));
	const encodedPayload = new TextEncoder().encode(JSON.stringify(payload));
	const encrypted = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		key,
		encodedPayload,
	);
	const bytes = new Uint8Array(iv.length + encrypted.byteLength);
	bytes.set(iv);
	bytes.set(new Uint8Array(encrypted), iv.length);
	return `${LOCAL_DRAFT_PREFIX}${encodeBase64(bytes)}`;
}

export async function decryptDraftPayload(
	encryptedContent: string,
	key: CryptoKey,
): Promise<EntryDraftPayload> {
	if (!encryptedContent.startsWith(LOCAL_DRAFT_PREFIX)) {
		throw new Error("Unsupported draft encryption format");
	}
	const bytes = decodeBase64(encryptedContent.slice(LOCAL_DRAFT_PREFIX.length));
	if (bytes.length <= AES_GCM_IV_BYTES) {
		throw new Error("Invalid draft ciphertext");
	}
	const iv = bytes.slice(0, AES_GCM_IV_BYTES);
	const ciphertext = bytes.slice(AES_GCM_IV_BYTES);
	const decrypted = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv },
		key,
		ciphertext,
	);
	return parseDraftPayload(new TextDecoder().decode(decrypted));
}

function parseDraftPayload(value: string): EntryDraftPayload {
	const parsed = JSON.parse(value) as Partial<EntryDraftPayload>;
	if (typeof parsed.markdown !== "string") {
		throw new Error("Invalid draft markdown");
	}
	if (typeof parsed.encrypted !== "boolean") {
		throw new Error("Invalid draft privacy flag");
	}
	return { markdown: parsed.markdown, encrypted: parsed.encrypted };
}

async function getLocalDraftKey(database: IDBDatabase): Promise<CryptoKey> {
	const stored = await getRecord<DraftKeyRecord>(
		database,
		KEY_STORE_NAME,
		LOCAL_DRAFT_KEY_ID,
	);
	if (stored?.key) return stored.key;

	const key = await crypto.subtle.generateKey(
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt", "decrypt"],
	);
	await putRecord<DraftKeyRecord>(database, KEY_STORE_NAME, {
		id: LOCAL_DRAFT_KEY_ID,
		key,
	});
	return key;
}

function openDraftDatabase(): Promise<IDBDatabase> {
	if (typeof indexedDB === "undefined") {
		return Promise.reject(new Error("IndexedDB is unavailable"));
	}

	const { promise, resolve, reject } = Promise.withResolvers<IDBDatabase>();
	const request = indexedDB.open(DRAFT_DATABASE_NAME, DRAFT_DATABASE_VERSION);
	request.onerror = () =>
		reject(request.error ?? new Error("Could not open draft database"));
	request.onupgradeneeded = () => {
		const database = request.result;
		if (!database.objectStoreNames.contains(DRAFT_STORE_NAME)) {
			database.createObjectStore(DRAFT_STORE_NAME, { keyPath: "id" });
		}
		if (!database.objectStoreNames.contains(KEY_STORE_NAME)) {
			database.createObjectStore(KEY_STORE_NAME, { keyPath: "id" });
		}
	};
	request.onsuccess = () => resolve(request.result);
	return promise;
}

function getRecord<T>(
	database: IDBDatabase,
	storeName: string,
	id: string,
): Promise<T | null> {
	const { promise, resolve, reject } = Promise.withResolvers<T | null>();
	const transaction = database.transaction(storeName, "readonly");
	const request = transaction.objectStore(storeName).get(id);
	request.onerror = () =>
		reject(request.error ?? new Error("Could not read draft record"));
	request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
	return promise;
}

function putRecord<T extends { id: string }>(
	database: IDBDatabase,
	storeName: string,
	record: T,
): Promise<void> {
	const { promise, resolve, reject } = Promise.withResolvers<void>();
	const transaction = database.transaction(storeName, "readwrite");
	transaction.onerror = () =>
		reject(transaction.error ?? new Error("Could not write draft record"));
	transaction.oncomplete = () => resolve();
	transaction.objectStore(storeName).put(record);
	return promise;
}

function deleteRecord(
	database: IDBDatabase,
	storeName: string,
	id: string,
): Promise<void> {
	const { promise, resolve, reject } = Promise.withResolvers<void>();
	const transaction = database.transaction(storeName, "readwrite");
	transaction.onerror = () =>
		reject(transaction.error ?? new Error("Could not delete draft record"));
	transaction.oncomplete = () => resolve();
	transaction.objectStore(storeName).delete(id);
	return promise;
}

function encodeBase64(bytes: Uint8Array): string {
	let binary = "";
	for (let index = 0; index < bytes.length; index += BASE64_CHUNK_SIZE) {
		binary += String.fromCharCode(
			...bytes.slice(index, index + BASE64_CHUNK_SIZE),
		);
	}
	return btoa(binary);
}

function decodeBase64(value: string): Uint8Array {
	const binary = atob(value);
	const bytes = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}
	return bytes;
}
