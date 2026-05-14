#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import { x402Client, x402HTTPClient } from "@x402/core/client";
import type { Network } from "@x402/core/types";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { type Hex, getAddress, isAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";

type Command = "list" | "create-entry" | "delete-entry";

type CliOptions = {
	command?: Command;
	privateKey?: Hex;
	baseUrl: string;
	network: Network;
	writer?: Hex;
	writerIndex?: number;
	entryId?: bigint;
	content?: string;
	contentFile?: string;
	legacyDomain?: boolean;
};

type ManagerWriter = {
	address: Hex;
	title?: string;
	legacyDomain?: boolean;
	entries?: ManagerEntry[];
};

type ManagerEntry = {
	onChainId?: string | null;
	id?: number;
	author?: string;
	raw?: string | null;
	decompressed?: string | null;
	deletedAt?: string | Date | null;
};

const DEFAULT_BASE_URL =
	process.env.WRITER_API_URL ?? "https://api.writer.place";
const DEFAULT_NETWORK = (process.env.X402_NETWORK ?? "eip155:8453") as Network;

function usage() {
	return `
x402 Writer CLI

Usage:
  bun writer list --pk 0x...
  bun writer create-entry --pk 0x... --writer 0x... --content "hello"
  bun writer create-entry --pk 0x... --writer-index 1 --content-file ./entry.md
  bun writer delete-entry --pk 0x... --writer 0x... --entry-id 1

Options:
  --pk <hex>                Payer/author private key. Can also use PRIVATE_KEY.
  --base-url <url>          API URL. Defaults to WRITER_API_URL or ${DEFAULT_BASE_URL}.
  --network <caip2>         x402 network. Defaults to X402_NETWORK or ${DEFAULT_NETWORK}.
  --writer <address>        Writer/Place contract address.
  --writer-index <number>   1-based index from the loaded manager writer list.
  --entry-id <id>           Onchain entry id to delete.
  --content <markdown>      Raw markdown entry content.
  --content-file <path>     File containing raw markdown entry content.
  --legacy-domain           Sign with legacy EIP-712 domain including chainId.
`.trim();
}

function parseArgs(argv: string[]): CliOptions {
	if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
		console.log(usage());
		process.exit(0);
	}

	const options: CliOptions = {
		command: argv[0] as Command | undefined,
		privateKey: process.env.PRIVATE_KEY as Hex | undefined,
		baseUrl: DEFAULT_BASE_URL,
		network: DEFAULT_NETWORK,
	};

	for (let i = 1; i < argv.length; i++) {
		const arg = argv[i];
		const next = argv[i + 1];
		switch (arg) {
			case "--pk":
				options.privateKey = requireValue(arg, next) as Hex;
				i++;
				break;
			case "--base-url":
				options.baseUrl = requireValue(arg, next).replace(/\/$/, "");
				i++;
				break;
			case "--network":
				options.network = requireValue(arg, next) as Network;
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
				options.entryId = parsePositiveBigInt(
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
			case "--help":
			case "-h":
				console.log(usage());
				process.exit(0);
			default:
				throw new Error(`Unknown option: ${arg}\n\n${usage()}`);
		}
	}

	if (
		!["list", "create-entry", "delete-entry"].includes(options.command ?? "")
	) {
		throw new Error(`Missing or invalid command.\n\n${usage()}`);
	}
	if (!options.privateKey) {
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

function parsePositiveBigInt(value: string, label: string) {
	const parsed = BigInt(value);
	if (parsed <= 0n) {
		throw new Error(`${label} must be a positive integer.`);
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

async function main() {
	const options = parseArgs(Bun.argv.slice(2));
	const account = privateKeyToAccount(options.privateKey as Hex);
	const payer = getAddress(account.address);
	const client = new x402Client();
	client.register(options.network, new ExactEvmScheme(account));
	const fetchWithPayment = wrapFetchWithPayment(fetch, client);
	const httpClient = new x402HTTPClient(client);

	async function getJson<T>(path: string): Promise<T> {
		const res = await fetch(`${options.baseUrl}${path}`);
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
		const paid = await fetchWithPayment(`${options.baseUrl}${path}`, {
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

	function printWriters(writers: ManagerWriter[]) {
		if (writers.length === 0) {
			console.log(`No Places found for ${payer}.`);
			return;
		}
		console.log(`Places for ${payer}:`);
		writers.forEach((writer, index) => {
			const entries = (writer.entries ?? []).filter(
				(entry) => !entry.deletedAt,
			);
			console.log(
				`${index + 1}. ${writer.title ?? "Untitled"} ${writer.address} (${
					entries.length
				} entries)`,
			);
			for (const entry of entries) {
				const author = entry.author ? getAddress(entry.author) : "unknown";
				const preview = (entry.decompressed ?? entry.raw ?? "")
					.replace(/\s+/g, " ")
					.slice(0, 80);
				console.log(
					`   - entry ${entry.onChainId ?? "pending"} by ${author}${
						preview ? `: ${preview}` : ""
					}`,
				);
			}
		});
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

	const writers = await loadWriters();
	if (options.command === "list") {
		printWriters(writers);
		return;
	}

	const writer = selectWriter(writers);
	if (options.command === "create-entry") {
		const signed = await signCreateWithChunk(writer, readContent());
		const created = await paidJson<{
			pending: { transactionId: string; author: Hex };
		}>(`/x402/writer/${writer.address}/entry/createWithChunk`, signed);
		console.log("Created pending entry:", created.data.pending);
		console.log("Entry payment:", created.paymentResponse);
		return;
	}

	if (!options.entryId) {
		throw new Error("Set --entry-id.");
	}
	const signed = await signRemove(writer, options.entryId);
	const deleted = await paidJson<{
		pending: { transactionId: string; signer: Hex };
	}>(`/x402/writer/${writer.address}/entry/${options.entryId}/delete`, signed);
	console.log("Deleted pending entry:", deleted.data.pending);
	console.log("Delete payment:", deleted.paymentResponse);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
