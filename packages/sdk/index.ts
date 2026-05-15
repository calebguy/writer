import { x402Client, x402HTTPClient } from "@x402/core/client";
import type { Network } from "@x402/core/types";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { compress as brotliCompress } from "brotli-compress";
import { type Hex, getAddress, isAddress } from "viem";
import { type PrivateKeyAccount, privateKeyToAccount } from "viem/accounts";

export type WriterSdkOptions = {
	/** API server URL. Defaults to https://api.writer.place. */
	apiUrl?: string;
	/** Web app URL. Defaults to https://writer.place. */
	webUrl?: string;
	/** x402 payment network. Defaults to eip155:8453. */
	network?: Network;
	/** Private key used as x402 payer and EIP-712 signer. */
	privateKey?: Hex;
	/** Existing viem local account used as x402 payer and EIP-712 signer. */
	account?: PrivateKeyAccount;
	/** Fetch implementation. Defaults to globalThis.fetch. */
	fetch?: typeof fetch;
};

export type WriterPlace = {
	address: Hex;
	storageAddress?: Hex;
	storageId?: string;
	title?: string;
	admin?: Hex;
	managers?: Hex[];
	publicWritable?: boolean;
	legacyDomain?: boolean;
	entries?: WriterEntry[];
	transactionId?: string;
	createdAtHash?: string | null;
	createdAtBlock?: string | null;
	createdAt?: string | Date;
	updatedAt?: string | Date;
	deletedAt?: string | Date | null;
};

export type WriterEntry = {
	id?: string | number;
	onChainId?: string | null;
	storageAddress?: Hex;
	author?: Hex;
	raw?: string | null;
	version?: string | null;
	decompressed?: string | null;
	deletedAt?: string | Date | null;
	createdAtHash?: string | null;
	updatedAtHash?: string | null;
};

export type X402Capabilities = {
	version: string;
	name: string;
	description?: string;
	network: Network;
	payTo: Hex | null;
	facilitator?: string;
	contentType?: string;
	capabilities: Record<
		string,
		{
			method: string;
			endpoint: string;
			path: string;
			price: string;
			description?: string;
			requires: string[];
		}
	>;
	docs?: Record<string, string>;
};

export type PaymentResult<T> = {
	data: T;
	paymentResponse: unknown;
};

export type CreatePlaceInput = {
	title: string;
	/** Defaults to the SDK account address. Must equal the x402 payer. */
	admin?: Hex;
};

export type CreateEntryInput = {
	writer: Hex | WriterPlace;
	markdown?: string;
	/** Use this when content is already encoded, e.g. br:... or enc:v5:br:... */
	encodedContent?: string;
	legacyDomain?: boolean;
};

export type UpdateEntryInput = CreateEntryInput & {
	entryId: bigint | number | string;
};

export type DeleteEntryInput = {
	writer: Hex | WriterPlace;
	entryId: bigint | number | string;
	legacyDomain?: boolean;
};

export type PendingAuthorResponse = {
	pending: { transactionId: string; author: Hex };
};

export type PendingSignerResponse = {
	pending: { transactionId: string; signer: Hex };
};

export type CreatePlaceResponse = {
	writer: WriterPlace;
};

const DEFAULT_API_URL = "https://api.writer.place";
const DEFAULT_WEB_URL = "https://writer.place";
const DEFAULT_NETWORK = "eip155:8453" as Network;

function normalizeBaseUrl(url: string) {
	return url.replace(/\/$/, "");
}

function assertAddress(address: string, label: string) {
	if (!isAddress(address)) {
		throw new Error(`${label} must be an EVM address.`);
	}
	return getAddress(address) as Hex;
}

function randomNonce() {
	const bytes = crypto.getRandomValues(new Uint32Array(2));
	const first = bytes[0] ?? 0;
	const second = bytes[1] ?? 0;
	const high21 = first & 0x1fffff;
	return high21 * 0x100000000 + second;
}

function toEntryId(value: bigint | number | string) {
	const id = BigInt(value);
	if (id < 0n) throw new Error("entryId must be a non-negative integer.");
	return id;
}

function uint8ToBase64(bytes: Uint8Array) {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary);
}

async function encodePublicMarkdown(markdown: string) {
	const compressed = await brotliCompress(new TextEncoder().encode(markdown), {
		quality: 11,
	});
	return `br:${uint8ToBase64(compressed)}`;
}

function formatBody(body: unknown) {
	return typeof body === "string" ? body : JSON.stringify(body);
}

async function readResponseBody(response: Response): Promise<unknown> {
	const contentType = response.headers.get("content-type") ?? "";
	const text = await response.text();
	if (!text) return "";
	if (!contentType.includes("application/json")) return text;
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

export class WriterSdk {
	readonly apiUrl: string;
	readonly webUrl: string;
	readonly account?: PrivateKeyAccount;
	readonly network: Network;

	private readonly fetchImpl: typeof fetch;
	private readonly fetchWithPayment?: typeof fetch;
	private readonly httpClient?: x402HTTPClient;

	constructor(options: WriterSdkOptions = {}) {
		this.apiUrl = normalizeBaseUrl(options.apiUrl ?? DEFAULT_API_URL);
		this.webUrl = normalizeBaseUrl(options.webUrl ?? DEFAULT_WEB_URL);
		this.network = options.network ?? DEFAULT_NETWORK;
		this.fetchImpl = options.fetch ?? fetch;
		this.account = options.account ?? (options.privateKey ? privateKeyToAccount(options.privateKey) : undefined);

		if (this.account) {
			const client = new x402Client();
			client.register(this.network, new ExactEvmScheme(this.account));
			this.fetchWithPayment = wrapFetchWithPayment(this.fetchImpl, client);
			this.httpClient = new x402HTTPClient(client);
		}
	}

	get address() {
		if (!this.account) return undefined;
		return getAddress(this.account.address) as Hex;
	}

	async getX402Capabilities() {
		return this.getJson<X402Capabilities>("/x402/capabilities");
	}

	async listPublicPlaces() {
		const response = await this.getJson<{ writers: WriterPlace[] }>("/writer/public");
		return response.writers;
	}

	async listManagedPlaces(address = this.requireAddress()) {
		const response = await this.getJson<{ writers: WriterPlace[] }>(
			`/manager/${assertAddress(address, "address")}`,
		);
		return response.writers;
	}

	async getPlace(address: Hex) {
		const response = await this.getJson<{ writer: WriterPlace }>(
			`/writer/${assertAddress(address, "address")}`,
		);
		return response.writer;
	}

	async getEntry(address: Hex, entryId: bigint | number | string) {
		const id = toEntryId(entryId);
		const response = await this.getJson<{ entry: WriterEntry }>(
			`/writer/${assertAddress(address, "address")}/entry/${id}`,
		);
		return response.entry;
	}

	async getPlaceMarkdown(address: Hex) {
		return this.getText(`${this.webUrl}/writer/${assertAddress(address, "address")}.md`);
	}

	async getEntryMarkdown(address: Hex, entryId: bigint | number | string) {
		const id = toEntryId(entryId);
		return this.getText(`${this.webUrl}/writer/${assertAddress(address, "address")}/${id}.md`);
	}

	async createPlace(input: CreatePlaceInput) {
		const admin = assertAddress(input.admin ?? this.requireAddress(), "admin");
		return this.paidJson<CreatePlaceResponse>("/x402/factory/create", {
			address: admin,
			title: input.title,
		});
	}

	async createEntry(input: CreateEntryInput) {
		const writer = this.normalizeWriter(input.writer);
		const content = await this.resolveContent(input);
		const signed = await this.signCreateWithChunk({
			writer,
			content,
			legacyDomain: input.legacyDomain,
		});
		return this.paidJson<PendingAuthorResponse>(
			`/x402/writer/${writer.address}/entry/createWithChunk`,
			signed,
		);
	}

	async updateEntry(input: UpdateEntryInput) {
		const writer = this.normalizeWriter(input.writer);
		const id = toEntryId(input.entryId);
		const content = await this.resolveContent(input);
		const signed = await this.signUpdate({
			writer,
			entryId: id,
			content,
			legacyDomain: input.legacyDomain,
		});
		return this.paidJson<PendingAuthorResponse>(
			`/x402/writer/${writer.address}/entry/${id}/update`,
			signed,
		);
	}

	async deleteEntry(input: DeleteEntryInput) {
		const writer = this.normalizeWriter(input.writer);
		const id = toEntryId(input.entryId);
		const signed = await this.signRemove({
			writer,
			entryId: id,
			legacyDomain: input.legacyDomain,
		});
		return this.paidJson<PendingSignerResponse>(
			`/x402/writer/${writer.address}/entry/${id}/delete`,
			signed,
		);
	}

	private requireAccount() {
		if (!this.account) {
			throw new Error("This operation requires a privateKey or account.");
		}
		return this.account;
	}

	private requireAddress() {
		const address = this.address;
		if (!address) {
			throw new Error("This operation requires a privateKey or account address.");
		}
		return address;
	}

	private normalizeWriter(writer: Hex | WriterPlace): WriterPlace & { address: Hex } {
		if (typeof writer === "string") {
			return { address: assertAddress(writer, "writer") };
		}
		return { ...writer, address: assertAddress(writer.address, "writer.address") };
	}

	private writerDomain(writer: WriterPlace, legacyDomain?: boolean) {
		const useLegacyDomain = legacyDomain ?? writer.legacyDomain;
		return useLegacyDomain
			? {
					name: "Writer",
					version: "1",
					chainId: 10,
					verifyingContract: writer.address,
				}
			: {
					name: "Writer",
					version: "1",
					verifyingContract: writer.address,
				};
	}

	private async resolveContent(input: CreateEntryInput) {
		if (input.encodedContent != null) return input.encodedContent;
		if (input.markdown == null) {
			throw new Error("Set markdown or encodedContent.");
		}
		return encodePublicMarkdown(input.markdown);
	}

	private async signCreateWithChunk(input: {
		writer: WriterPlace & { address: Hex };
		content: string;
		legacyDomain?: boolean;
	}) {
		const account = this.requireAccount();
		const nonce = randomNonce();
		const chunkCount = 1n;
		const signature = await account.signTypedData({
			domain: this.writerDomain(input.writer, input.legacyDomain),
			primaryType: "CreateWithChunk",
			types: {
				CreateWithChunk: [
					{ name: "nonce", type: "uint256" },
					{ name: "chunkCount", type: "uint256" },
					{ name: "chunkContent", type: "string" },
				],
			},
			message: {
				nonce: BigInt(nonce),
				chunkCount,
				chunkContent: input.content,
			},
		});

		return {
			signature,
			nonce,
			chunkCount: Number(chunkCount),
			chunkContent: input.content,
		};
	}

	private async signUpdate(input: {
		writer: WriterPlace & { address: Hex };
		entryId: bigint;
		content: string;
		legacyDomain?: boolean;
	}) {
		const account = this.requireAccount();
		const nonce = randomNonce();
		const totalChunks = 1n;
		const signature = await account.signTypedData({
			domain: this.writerDomain(input.writer, input.legacyDomain),
			primaryType: "Update",
			types: {
				Update: [
					{ name: "nonce", type: "uint256" },
					{ name: "entryId", type: "uint256" },
					{ name: "totalChunks", type: "uint256" },
					{ name: "content", type: "string" },
				],
			},
			message: {
				nonce: BigInt(nonce),
				entryId: input.entryId,
				totalChunks,
				content: input.content,
			},
		});

		return {
			signature,
			nonce,
			totalChunks: Number(totalChunks),
			content: input.content,
		};
	}

	private async signRemove(input: {
		writer: WriterPlace & { address: Hex };
		entryId: bigint;
		legacyDomain?: boolean;
	}) {
		const account = this.requireAccount();
		const nonce = randomNonce();
		const signature = await account.signTypedData({
			domain: this.writerDomain(input.writer, input.legacyDomain),
			primaryType: "Remove",
			types: {
				Remove: [
					{ name: "nonce", type: "uint256" },
					{ name: "id", type: "uint256" },
				],
			},
			message: {
				nonce: BigInt(nonce),
				id: input.entryId,
			},
		});

		return { signature, nonce };
	}

	private async getJson<T>(path: string): Promise<T> {
		const response = await this.fetchImpl(`${this.apiUrl}${path}`, {
			headers: { accept: "application/json" },
		});
		const data = await readResponseBody(response);
		if (!response.ok) {
			throw new Error(`${path} failed: ${response.status} ${formatBody(data)}`);
		}
		return data as T;
	}

	private async getText(url: string): Promise<string> {
		const response = await this.fetchImpl(url, {
			headers: { accept: "text/markdown" },
		});
		const text = await response.text();
		if (!response.ok) {
			throw new Error(`${url} failed: ${response.status} ${text}`);
		}
		return text;
	}

	private async paidJson<T>(path: string, body: unknown): Promise<PaymentResult<T>> {
		if (!this.fetchWithPayment || !this.httpClient) {
			throw new Error("Paid writes require a privateKey or account.");
		}

		const response = await this.fetchWithPayment(`${this.apiUrl}${path}`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"Access-Control-Expose-Headers": "X-PAYMENT-RESPONSE",
			},
			body: JSON.stringify(body),
		});
		const data = await readResponseBody(response);
		if (!response.ok) {
			throw new Error(`${path} failed: ${response.status} ${formatBody(data)}`);
		}
		return {
			data: data as T,
			paymentResponse: this.httpClient.getPaymentSettleResponse((name) =>
				response.headers.get(name),
			),
		};
	}
}

export function createWriterSdk(options: WriterSdkOptions = {}) {
	return new WriterSdk(options);
}

export async function encodeMarkdownForWriter(markdown: string) {
	return encodePublicMarkdown(markdown);
}
