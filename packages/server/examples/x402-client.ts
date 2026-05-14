import { x402Client, x402HTTPClient } from "@x402/core/client";
import type { Network } from "@x402/core/types";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { type Hex, getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const BASE_URL = process.env.WRITER_API_URL ?? "http://localhost:3000";
const PRIVATE_KEY = process.env.PRIVATE_KEY as Hex;
const X402_NETWORK = (process.env.X402_NETWORK ?? "eip155:8453") as Network;
const TITLE = process.env.PLACE_TITLE ?? "x402 Place";
const CONTENT = process.env.ENTRY_CONTENT ?? "Paid hello from an x402 client.";

if (!PRIVATE_KEY) {
	throw new Error("Set PRIVATE_KEY to the paying/admin EVM private key.");
}

const account = privateKeyToAccount(PRIVATE_KEY);
const admin = getAddress(account.address);
const client = new x402Client();
client.register(X402_NETWORK, new ExactEvmScheme(account));
const fetchWithPayment = wrapFetchWithPayment(fetch, client);
const httpClient = new x402HTTPClient(client);

async function paidJson<T>(
	path: string,
	body: unknown,
): Promise<{ data: T; paymentResponse: unknown }> {
	const url = `${BASE_URL}${path}`;
	const paid = await fetchWithPayment(url, {
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
	if (typeof data !== "object" || data === null) {
		throw new Error(
			`${path} returned ${paid.status} ${
				paid.headers.get("content-type") ?? "unknown content-type"
			}: ${formatBody(data)}`,
		);
	}

	return {
		data: data as T,
		paymentResponse: httpClient.getPaymentSettleResponse((name) =>
			paid.headers.get(name),
		),
	};
}

async function readResponseBody(response: Response): Promise<unknown> {
	const contentType = response.headers.get("content-type") ?? "";
	const text = await response.text();
	if (!text) {
		return "";
	}
	if (contentType.includes("application/json")) {
		try {
			return JSON.parse(text);
		} catch {
			return text;
		}
	}
	return text;
}

function formatBody(body: unknown) {
	return typeof body === "string" ? body : JSON.stringify(body);
}

function randomNonce() {
	const bytes = crypto.getRandomValues(new Uint32Array(2));
	const high21 = bytes[0] & 0x1fffff;
	return high21 * 0x100000000 + bytes[1];
}

async function signCreateWithChunk(address: Hex, content: string) {
	const nonce = randomNonce();
	const chunkCount = 1n;
	const chunkContent = content;
	const signature = await account.signTypedData({
		domain: {
			name: "Writer",
			version: "1",
			verifyingContract: address,
		},
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

async function waitForIndexedWriter(writerAddress: Hex) {
	for (let attempt = 0; attempt < 60; attempt++) {
		const res = await fetch(`${BASE_URL}/manager/${admin}`);
		if (!res.ok) {
			throw new Error(`manager lookup failed: ${res.status}`);
		}
		const data = (await res.json()) as {
			writers: Array<{ address: string; createdAtHash: string | null }>;
		};
		const writer = data.writers.find(
			(w) => getAddress(w.address) === writerAddress && w.createdAtHash,
		);
		if (writer) {
			return writer;
		}
		await new Promise((resolve) => setTimeout(resolve, 3000));
	}
	throw new Error(`Timed out waiting for ${writerAddress} to be indexed.`);
}

async function main() {
	console.log(`Using payer/admin ${admin}`);

	const create = await paidJson<{
		writer: { address: Hex; transactionId: string };
	}>("/x402/factory/create", {
		address: admin,
		title: TITLE,
	});
	console.log("Created pending writer:", create.data.writer);
	console.log("Create payment:", create.paymentResponse);

	await waitForIndexedWriter(create.data.writer.address);
	console.log("Writer indexed. Creating entry...");

	const signedEntry = await signCreateWithChunk(
		create.data.writer.address,
		CONTENT,
	);
	const entry = await paidJson<{
		pending: { transactionId: string; author: Hex };
	}>(
		`/x402/writer/${create.data.writer.address}/entry/createWithChunk`,
		signedEntry,
	);
	console.log("Created pending entry:", entry.data.pending);
	console.log("Entry payment:", entry.paymentResponse);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
