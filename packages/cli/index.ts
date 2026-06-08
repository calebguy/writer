#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import { x402Client, x402HTTPClient } from "@x402/core/client";
import type { Network } from "@x402/core/types";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { type Hex, getAddress, isAddress } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

type Command =
	| "create-wallet"
	| "list"
	| "create-place"
	| "create-entry"
	| "edit-entry"
	| "delete-entry";

type CliOptions = {
	command?: Command;
	privateKey?: Hex;
	writer?: Hex;
	writerIndex?: number;
	entryId?: bigint;
	title?: string;
	content?: string;
	contentFile?: string;
	legacyDomain?: boolean;
	wait?: boolean;
	json?: boolean;
};

type ManagerWriter = {
	address: Hex;
	title?: string;
	legacyDomain?: boolean;
	transactionId?: string | null;
	createdAtHash?: string | null;
	createdAtBlock?: string;
	entries?: ManagerEntry[];
};

type ManagerEntry = {
	onChainId?: string | null;
	id?: number;
	author?: string;
	raw?: string | null;
	decompressed?: string | null;
	deletedAt?: string | Date | null;
	createdAtHash?: string | null;
	updatedAtHash?: string | null;
	deletedAtHash?: string | null;
	createdAtBlock?: string;
	updatedAtBlock?: string;
	deletedAtBlock?: string;
	createdAtTransactionId?: string | null;
	updatedAtTransactionId?: string | null;
	deletedAtTransactionId?: string | null;
	createdAt?: string | Date;
	updatedAt?: string | Date;
};

const API_BASE_URL = "https://api.writer.place";
const SITE_BASE_URL = "https://www.writer.place";
const X402_NETWORK = "eip155:8453" as Network;
const WAIT_TIMEOUT_MS = 180_000;
const WAIT_INTERVAL_MS = 2_000;

function usage() {
	return `
x402 Writer CLI

Usage:
  writer create-wallet
  writer list --pk 0x...
  writer create-place --pk 0x... --title "My Place" [--wait]
  writer create-entry --pk 0x... --writer 0x... --content "hello" [--wait]
  writer create-entry --pk 0x... --writer-index 1 --content-file ./entry.md [--wait]
  writer edit-entry --pk 0x... --writer 0x... --entry-id 1 --content-file ./entry.md [--wait]
  writer delete-entry --pk 0x... --writer 0x... --entry-id 1 [--wait]

Options:
  --pk <hex>                Payer/author private key. Can also use PRIVATE_KEY.
  --title <title>           Place title for create-place. Defaults to "Untitled Place".
  --writer <address>        Writer/Place contract address.
  --writer-index <number>   1-based index from the loaded manager writer list.
  --entry-id <id>           Onchain entry id to edit or delete.
  --content <markdown>      Raw markdown entry content.
  --content-file <path>     File containing raw markdown entry content.
  --legacy-domain           Sign with legacy EIP-712 domain including chainId.
  --wait                    Wait until the onchain/indexed result is observable.
  --json                    Print machine-readable JSON instead of human-readable text.
`.trim();
}

function parseArgs(argv: string[]): CliOptions {
	const json = argv.includes("--json");
	if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
		if (json) {
			printJson({ ok: true, command: "help", usage: usage() });
		} else {
			console.log(usage());
		}
		process.exit(0);
	}

	const options: CliOptions = {
		command: argv[0] as Command | undefined,
		privateKey: process.env.PRIVATE_KEY as Hex | undefined,
		json,
	};

	for (let i = 1; i < argv.length; i++) {
		const arg = argv[i];
		const next = argv[i + 1];
		switch (arg) {
			case "--pk":
				options.privateKey = requireValue(arg, next) as Hex;
				i++;
				break;
			case "--title":
				options.title = requireValue(arg, next);
				i++;
				break;
			case "--writer":
				options.writer = normalizeAddress(requireValue(arg, next), "--writer");
				i++;
				break;
			case "--writer-index":
				options.writerIndex = parsePositiveInteger(
					requireValue(arg, next),
					"--writer-index",
				);
				i++;
				break;
			case "--entry-id":
				options.entryId = parseNonNegativeBigInt(
					requireValue(arg, next),
					"--entry-id",
				);
				i++;
				break;
			case "--content":
				options.content = requireValue(arg, next);
				i++;
				break;
			case "--content-file":
				options.contentFile = requireValue(arg, next);
				i++;
				break;
			case "--legacy-domain":
				options.legacyDomain = true;
				break;
			case "--wait":
				options.wait = true;
				break;
			case "--json":
				options.json = true;
				break;
			case "--help":
			case "-h":
				if (options.json) {
					printJson({ ok: true, command: "help", usage: usage() });
				} else {
					console.log(usage());
				}
				process.exit(0);
			default:
				throw new Error(`Unknown option: ${arg}\n\n${usage()}`);
		}
	}

	if (
		![
			"create-wallet",
			"list",
			"create-place",
			"create-entry",
			"edit-entry",
			"delete-entry",
		].includes(options.command ?? "")
	) {
		throw new Error(`Missing or invalid command.\n\n${usage()}`);
	}
	if (
		!options.privateKey &&
		options.command !== "create-wallet"
	) {
		throw new Error("Set --pk or PRIVATE_KEY.");
	}

	return options;
}

function requireValue(flag: string, value: string | undefined) {
	if (!value || value.startsWith("--")) {
		throw new Error(`${flag} requires a value.`);
	}
	return value;
}

function normalizeAddress(value: string, label: string) {
	if (!isAddress(value)) {
		throw new Error(`${label} must be an EVM address.`);
	}
	return getAddress(value) as Hex;
}

function parsePositiveInteger(value: string, label: string) {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new Error(`${label} must be a positive integer.`);
	}
	return parsed;
}

function parseNonNegativeBigInt(value: string, label: string) {
	const parsed = BigInt(value);
	if (parsed < 0n) {
		throw new Error(`${label} must be a non-negative integer.`);
	}
	return parsed;
}

function randomNonce() {
	const bytes = crypto.getRandomValues(new Uint32Array(2));
	const first = bytes[0] ?? 0;
	const second = bytes[1] ?? 0;
	const high21 = first & 0x1fffff;
	return high21 * 0x100000000 + second;
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

function formatBody(body: unknown) {
	return typeof body === "string" ? body : JSON.stringify(body);
}

function printJson(value: unknown) {
	console.log(JSON.stringify(value, null, 2));
}

function printError(error: unknown, json: boolean) {
	const message = error instanceof Error ? error.message : String(error);
	if (!json) {
		console.error(message);
		return;
	}
	console.error(
		JSON.stringify(
			{
				ok: false,
				error: {
					code: "CLI_ERROR",
					message,
				},
			},
			null,
			2,
		),
	);
}

function delay(ms: number): Promise<void> {
	const { promise, resolve } = Promise.withResolvers<void>();
	setTimeout(resolve, ms);
	return promise;
}

async function waitUntil<T>(
	label: string,
	check: () => Promise<T | null | undefined>,
): Promise<T> {
	const deadline = Date.now() + WAIT_TIMEOUT_MS;
	let lastError: unknown;
	while (Date.now() < deadline) {
		try {
			const value = await check();
			if (value != null) return value;
		} catch (error) {
			lastError = error;
		}
		await delay(WAIT_INTERVAL_MS);
	}
	const suffix =
		lastError instanceof Error ? ` Last error: ${lastError.message}` : "";
	throw new Error(`Timed out waiting for ${label}.${suffix}`);
}

function normalizeMaybeAddress(value: string | undefined) {
	return value && isAddress(value) ? getAddress(value) : value;
}

function entryContent(entry: ManagerEntry) {
	return entry.decompressed ?? entry.raw ?? "";
}

function entryPreview(entry: ManagerEntry) {
	return entryContent(entry).replace(/\s+/g, " ").slice(0, 80);
}

function entryUrl(writer: Hex, entryId: string | number | bigint) {
	return `${SITE_BASE_URL}/writer/${writer}/${entryId.toString()}`;
}

function entryMarkdownUrl(writer: Hex, entryId: string | number | bigint) {
	return `${entryUrl(writer, entryId)}.md`;
}

function writerUrl(writer: Hex) {
	return `${SITE_BASE_URL}/writer/${writer}`;
}

function writerMarkdownUrl(writer: Hex) {
	return `${writerUrl(writer)}.md`;
}

function serializeEntry(entry: ManagerEntry) {
	return {
		databaseId: entry.id ?? null,
		entryId: entry.onChainId ?? null,
		author: normalizeMaybeAddress(entry.author),
		content: entryContent(entry),
		preview: entryPreview(entry),
		createdAtHash: entry.createdAtHash ?? null,
		createdAtBlock: entry.createdAtBlock ?? null,
		updatedAtHash: entry.updatedAtHash ?? null,
		updatedAtBlock: entry.updatedAtBlock ?? null,
		deletedAtHash: entry.deletedAtHash ?? null,
		deletedAtBlock: entry.deletedAtBlock ?? null,
		createdAtTransactionId: entry.createdAtTransactionId ?? null,
		updatedAtTransactionId: entry.updatedAtTransactionId ?? null,
		deletedAtTransactionId: entry.deletedAtTransactionId ?? null,
		createdAt: entry.createdAt ?? null,
		updatedAt: entry.updatedAt ?? null,
	};
}

function serializeWriter(writer: ManagerWriter, index?: number) {
	const entries = (writer.entries ?? []).filter((entry) => !entry.deletedAt);
	return {
		index,
		title: writer.title ?? "Untitled",
		writer: writer.address,
		transactionId: writer.transactionId ?? null,
		createdAtHash: writer.createdAtHash ?? null,
		createdAtBlock: writer.createdAtBlock ?? null,
		address: writer.address,
		entryCount: entries.length,
		url: writerUrl(writer.address),
		markdown: writerMarkdownUrl(writer.address),
		entries: entries.map(serializeEntry),
	};
}

function compactJson(value: unknown) {
	return JSON.stringify(value);
}

function maybeLine(label: string, value: unknown) {
	return value == null || value === "" ? [] : [`${label}: ${value}`];
}

function humanizeCommandResult(result: Record<string, any>) {
	switch (result.command) {
		case "create-wallet":
			return [
				"Generated Writer agent wallet:",
				`Address: ${result.address}`,
				`Private key: ${result.privateKey}`,
				"",
				"What next:",
				...result.nextSteps.map(
					(step: string, index: number) => `${index + 1}. ${step}`,
				),
				"",
				`Warning: ${result.warning}`,
			].join("\n");
		case "list":
			if (result.places.length === 0) {
				return `No Places found for ${result.wallet}.`;
			}
			return [
				`Places for ${result.wallet}:`,
				...result.places.flatMap((place: Record<string, any>) => [
					`${place.index}. ${place.title} ${place.writer} (${place.entryCount} entries)`,
					...place.entries.map((entry: Record<string, any>) => {
						const author = entry.author ?? "unknown";
						const id = entry.entryId ?? "pending";
						const preview = entry.preview ? `: ${entry.preview}` : "";
						return `   - entry ${id} by ${author}${preview}`;
					}),
				]),
			].join("\n");
		case "create-place":
			return [
				`${result.status === "confirmed" ? "Created" : "Created pending"} Place: ${result.writer.writer}`,
				...maybeLine("Title", result.writer.title),
				...maybeLine("Status", result.status),
				...maybeLine("Transaction id", result.transactionId),
				...maybeLine("URL", result.writer.url),
				...maybeLine("Markdown", result.writer.markdown),
				`Payment: ${compactJson(result.payment)}`,
			].join("\n");
		case "create-entry":
			return [
				`${result.status === "confirmed" ? "Created" : "Created pending"} entry in ${result.writer}`,
				...maybeLine("Status", result.status),
				...maybeLine("Entry id", result.entryId),
				...maybeLine("Author", result.author),
				...maybeLine("Transaction id", result.transactionId),
				...maybeLine("URL", result.url),
				...maybeLine("Markdown", result.markdown),
				`Payment: ${compactJson(result.payment)}`,
			].join("\n");
		case "edit-entry":
			return [
				`${result.status === "confirmed" ? "Updated" : "Updated pending"} entry ${result.entryId} in ${result.writer}`,
				...maybeLine("Status", result.status),
				...maybeLine("Author", result.author),
				...maybeLine("Transaction id", result.transactionId),
				...maybeLine("URL", result.url),
				...maybeLine("Markdown", result.markdown),
				`Payment: ${compactJson(result.payment)}`,
			].join("\n");
		case "delete-entry":
			return [
				`${result.status === "confirmed" ? "Deleted" : "Deleted pending"} entry ${result.entryId} in ${result.writer}`,
				...maybeLine("Status", result.status),
				...maybeLine("Signer", result.signer),
				...maybeLine("Transaction id", result.transactionId),
				result.transaction ? `Transaction: ${compactJson(result.transaction)}` : "",
				`Payment: ${compactJson(result.payment)}`,
			]
				.filter(Boolean)
				.join("\n");
		default:
			return compactJson(result);
	}
}

function printCommandResult(options: CliOptions, result: Record<string, any>) {
	if (options.json) {
		printJson(result);
		return;
	}
	console.log(humanizeCommandResult(result));
}

async function main() {
	const options = parseArgs(Bun.argv.slice(2));
	if (options.command === "create-wallet") {
		const privateKey = generatePrivateKey();
		const account = privateKeyToAccount(privateKey);
		const address = getAddress(account.address);
		const warning =
			"Do not leak this private key. It controls the agent wallet and is the only key that can sign to create entries and update existing entries for Places created with it. Anyone with this key can spend its funds and write, edit, or delete as this agent. Store it securely; Writer cannot recover it if lost.";
		const nextSteps = [
			"Save this private key securely.",
			"Use it with other Writer commands via --pk 0x... or PRIVATE_KEY=0x...",
			"Send USDC on Base to this address so it can pay for Writer actions via x402.",
		];

		printCommandResult(options, {
			ok: true,
			command: "create-wallet",
			address,
			privateKey,
			warning,
			nextSteps,
		});
		return;
	}

	const account = privateKeyToAccount(options.privateKey as Hex);
	const payer = getAddress(account.address);
	const client = new x402Client();
	client.register(X402_NETWORK, new ExactEvmScheme(account));
	const fetchWithPayment = wrapFetchWithPayment(fetch, client);
	const httpClient = new x402HTTPClient(client);

	async function getJson<T>(path: string): Promise<T> {
		const res = await fetch(`${API_BASE_URL}${path}`);
		const data = await readResponseBody(res);
		if (!res.ok) {
			throw new Error(`${path} failed: ${res.status} ${formatBody(data)}`);
		}
		return data as T;
	}

	async function paidJson<T>(
		path: string,
		body: unknown,
	): Promise<{ data: T; paymentResponse: unknown }> {
		const paid = await fetchWithPayment(`${API_BASE_URL}${path}`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"Access-Control-Expose-Headers": "X-PAYMENT-RESPONSE",
			},
			body: JSON.stringify(body),
		});
		const data = await readResponseBody(paid);
		if (!paid.ok) {
			throw new Error(`${path} failed: ${paid.status} ${formatBody(data)}`);
		}
		return {
			data: data as T,
			paymentResponse: httpClient.getPaymentSettleResponse((name) =>
				paid.headers.get(name),
			),
		};
	}

	function writerDomain(address: Hex, legacyDomain?: boolean) {
		return legacyDomain
			? {
					name: "Writer",
					version: "1",
					chainId: 10,
					verifyingContract: address,
				}
			: {
					name: "Writer",
					version: "1",
					verifyingContract: address,
				};
	}

	async function signCreateWithChunk(writer: ManagerWriter, content: string) {
		const nonce = randomNonce();
		const chunkCount = 1n;
		const chunkContent = content;
		const signature = await account.signTypedData({
			domain: writerDomain(
				writer.address,
				options.legacyDomain ?? writer.legacyDomain,
			),
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
				chunkContent,
			},
		});

		return {
			signature,
			nonce,
			chunkCount: Number(chunkCount),
			chunkContent,
		};
	}

	async function signUpdate(writer: ManagerWriter, id: bigint, content: string) {
		const nonce = randomNonce();
		const totalChunks = 1n;
		const signature = await account.signTypedData({
			domain: writerDomain(
				writer.address,
				options.legacyDomain ?? writer.legacyDomain,
			),
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
				entryId: id,
				totalChunks,
				content,
			},
		});

		return {
			signature,
			nonce,
			totalChunks: Number(totalChunks),
			content,
		};
	}

	async function signRemove(writer: ManagerWriter, id: bigint) {
		const nonce = randomNonce();
		const signature = await account.signTypedData({
			domain: writerDomain(
				writer.address,
				options.legacyDomain ?? writer.legacyDomain,
			),
			primaryType: "Remove",
			types: {
				Remove: [
					{ name: "nonce", type: "uint256" },
					{ name: "id", type: "uint256" },
				],
			},
			message: {
				nonce: BigInt(nonce),
				id,
			},
		});

		return { signature, nonce };
	}

	async function loadWriters() {
		const response = await getJson<{ writers: ManagerWriter[] }>(
			`/manager/${payer}`,
		);
		return response.writers.map((writer) => ({
			...writer,
			address: getAddress(writer.address) as Hex,
		}));
	}

	function selectWriter(writers: ManagerWriter[]) {
		if (options.writer) {
			const selected = writers.find(
				(writer) => getAddress(writer.address) === options.writer,
			);
			if (!selected) {
				throw new Error(`No managed writer found for ${options.writer}.`);
			}
			return selected;
		}
		if (options.writerIndex) {
			const selected = writers[options.writerIndex - 1];
			if (!selected) {
				throw new Error(`No writer at index ${options.writerIndex}.`);
			}
			return selected;
		}
		throw new Error("Set --writer or --writer-index.");
	}

	function readContent() {
		if (options.contentFile) {
			return readFileSync(options.contentFile, "utf8");
		}
		if (options.content != null) {
			return options.content;
		}
		throw new Error("Set --content or --content-file.");
	}

	async function waitForWriter(transactionId: string, address: Hex) {
		return waitUntil(`writer ${address} confirmation`, async () => {
			const writers = await loadWriters();
			const writer = writers.find(
				(candidate) => getAddress(candidate.address) === address,
			) as (ManagerWriter & {
				transactionId?: string | null;
				createdAtHash?: string | null;
			}) | undefined;
			if (
				writer?.transactionId === transactionId &&
				writer.createdAtHash != null
			) {
				return writer;
			}
			return null;
		});
	}

	async function waitForCreatedEntry(writer: Hex, transactionId: string) {
		return waitUntil(`entry creation ${transactionId}`, async () => {
			const response = await getJson<{ writer: ManagerWriter }>(
				`/writer/${writer}`,
			);
			const entry = (response.writer.entries ?? []).find(
				(entry) =>
					entry.createdAtTransactionId === transactionId &&
					entry.createdAtHash != null &&
					entry.onChainId != null,
			);
			return entry ?? null;
		});
	}

	async function waitForUpdatedEntry(
		writer: Hex,
		entryId: bigint,
		transactionId: string,
	) {
		return waitUntil(`entry update ${transactionId}`, async () => {
			const response = await getJson<{ entry: ManagerEntry }>(
				`/writer/${writer}/entry/${entryId.toString()}`,
			);
			if (
				response.entry.updatedAtTransactionId === transactionId &&
				response.entry.updatedAtHash != null
			) {
				return response.entry;
			}
			return null;
		});
	}

	async function waitForRelayTransaction(transactionId: string) {
		return waitUntil(`relay transaction ${transactionId}`, async () => {
			const response = await getJson<{
				transaction: {
					id: string;
					status: string;
					hash?: string | null;
					blockNumber?: string | null;
					error?: string | null;
				};
			}>(`/tx/${encodeURIComponent(transactionId)}`);
			if (response.transaction.status === "ABANDONED") {
				throw new Error(
					`Relay transaction ${transactionId} was abandoned: ${
						response.transaction.error ?? "unknown error"
					}`,
				);
			}
			if (response.transaction.status === "CONFIRMED") {
				return response.transaction;
			}
			return null;
		});
	}

	if (options.command === "create-place") {
		const created = await paidJson<{
			writer: ManagerWriter & {
				storageAddress?: Hex;
				transactionId: string;
				createdAtHash?: string | null;
			};
		}>("/x402/factory/create", {
			address: payer,
			title: options.title ?? "Untitled Place",
		});
		const pending = created.data.writer;
		if (!options.wait) {
			printCommandResult(options, {
				ok: true,
				status: "pending",
				command: "create-place",
				payer,
				network: X402_NETWORK,
				writer: serializeWriter(pending),
				transactionId: pending.transactionId,
				payment: created.paymentResponse,
			});
			return;
		}
		const confirmed = await waitForWriter(pending.transactionId, pending.address);
		printCommandResult(options, {
			ok: true,
			status: "confirmed",
			command: "create-place",
			payer,
			network: X402_NETWORK,
			writer: serializeWriter(confirmed),
			transactionId: pending.transactionId,
			payment: created.paymentResponse,
		});
		return;
	}

	const writers = await loadWriters();
	if (options.command === "list") {
		printCommandResult(options, {
			ok: true,
			command: "list",
			wallet: payer,
			places: writers.map((writer, index) => serializeWriter(writer, index + 1)),
		});
		return;
	}

	const writer = selectWriter(writers);
	if (options.command === "create-entry") {
		const signed = await signCreateWithChunk(writer, readContent());
		const created = await paidJson<{
			pending: { transactionId: string; author: Hex };
		}>(`/x402/writer/${writer.address}/entry/createWithChunk`, signed);
		const pending = created.data.pending;
		if (!options.wait) {
			printCommandResult(options, {
				ok: true,
				status: "pending",
				command: "create-entry",
				payer,
				network: X402_NETWORK,
				writer: writer.address,
				transactionId: pending.transactionId,
				author: getAddress(pending.author),
				payment: created.paymentResponse,
			});
			return;
		}
		const entry = await waitForCreatedEntry(writer.address, pending.transactionId);
		const entryId = entry.onChainId as string;
		printCommandResult(options, {
			ok: true,
			status: "confirmed",
			command: "create-entry",
			payer,
			network: X402_NETWORK,
			writer: writer.address,
			transactionId: pending.transactionId,
			author: getAddress(pending.author),
			entry: serializeEntry(entry),
			entryId,
			url: entryUrl(writer.address, entryId),
			markdown: entryMarkdownUrl(writer.address, entryId),
			payment: created.paymentResponse,
		});
		return;
	}

	if (options.entryId == null) {
		throw new Error("Set --entry-id.");
	}

	if (options.command === "edit-entry") {
		const signed = await signUpdate(writer, options.entryId, readContent());
		const updated = await paidJson<{
			pending: { transactionId: string; author: Hex };
		}>(`/x402/writer/${writer.address}/entry/${options.entryId}/update`, signed);
		const pending = updated.data.pending;
		if (!options.wait) {
			printCommandResult(options, {
				ok: true,
				status: "pending",
				command: "edit-entry",
				payer,
				network: X402_NETWORK,
				writer: writer.address,
				entryId: options.entryId.toString(),
				transactionId: pending.transactionId,
				author: getAddress(pending.author),
				payment: updated.paymentResponse,
			});
			return;
		}
		const entry = await waitForUpdatedEntry(
			writer.address,
			options.entryId,
			pending.transactionId,
		);
		printCommandResult(options, {
			ok: true,
			status: "confirmed",
			command: "edit-entry",
			payer,
			network: X402_NETWORK,
			writer: writer.address,
			entryId: options.entryId.toString(),
			transactionId: pending.transactionId,
			author: getAddress(pending.author),
			entry: serializeEntry(entry),
			url: entryUrl(writer.address, options.entryId),
			markdown: entryMarkdownUrl(writer.address, options.entryId),
			payment: updated.paymentResponse,
		});
		return;
	}

	const signed = await signRemove(writer, options.entryId);
	const deleted = await paidJson<{
		pending: { transactionId: string; signer: Hex };
	}>(`/x402/writer/${writer.address}/entry/${options.entryId}/delete`, signed);
	const pending = deleted.data.pending;
	if (!options.wait) {
		printCommandResult(options, {
			ok: true,
			status: "pending",
			command: "delete-entry",
			payer,
			network: X402_NETWORK,
			writer: writer.address,
			entryId: options.entryId.toString(),
			transactionId: pending.transactionId,
			signer: getAddress(pending.signer),
			payment: deleted.paymentResponse,
		});
		return;
	}
	const transaction = await waitForRelayTransaction(pending.transactionId);
	printCommandResult(options, {
		ok: true,
		status: "confirmed",
		command: "delete-entry",
		payer,
		network: X402_NETWORK,
		writer: writer.address,
		entryId: options.entryId.toString(),
		transactionId: pending.transactionId,
		signer: getAddress(pending.signer),
		transaction,
		payment: deleted.paymentResponse,
	});
}

main().catch((err) => {
	printError(err, Bun.argv.includes("--json"));
	process.exit(1);
});
