import { AsyncLocalStorage } from "node:async_hooks";
import {
	createPublicClient,
	createWalletClient,
	getAddress,
	http,
	parseAbi,
	type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getTargetChain } from "./chain";
import { env } from "./env";

type SendTransactionParams = {
	to: string;
	abi: string;
	args: unknown[];
};

type SendTransactionResponse = {
	wallet: string;
	nonce: number;
	status: string;
};

type TransactionStatus = {
	wallet: string;
	nonce: number;
	status: "pending" | "submitted" | "confirmed" | "error";
	params: {
		to: string;
		value?: string;
		data?: string;
	};
	hash?: string;
	createdAt: number;
	error?: string;
};

type Relay = {
	sendTransaction(
		params: SendTransactionParams,
	): Promise<SendTransactionResponse>;
	getWallets(): Promise<{ wallets: string[] }>;
	getTransaction(wallet: string, nonce: number): Promise<TransactionStatus>;
};

interface RelayServiceBinding {
	fetch(request: Request): Promise<Response>;
}

const relayBinding = new AsyncLocalStorage<RelayServiceBinding | undefined>();

export function runWithRelayBinding<T>(
	binding: RelayServiceBinding | undefined,
	callback: () => T,
): T {
	return relayBinding.run(binding, callback);
}

function relayKey(wallet: string, nonce: number): string {
	return `${wallet.toLowerCase()}:${nonce}`;
}

class LocalWalletRelay implements Relay {
	private readonly account;
	private readonly publicClient;
	private readonly walletClient;
	private readonly transactions = new Map<string, TransactionStatus>();
	private nextNonce: Promise<number> | null = null;

	constructor(privateKey: Hex) {
		const chain = getTargetChain();
		this.account = privateKeyToAccount(privateKey);
		this.publicClient = createPublicClient({
			chain,
			transport: http(env.RPC_URL),
		});
		this.walletClient = createWalletClient({
			account: this.account,
			chain,
			transport: http(env.RPC_URL),
		});
	}

	async sendTransaction(
		params: SendTransactionParams,
	): Promise<SendTransactionResponse> {
		const nonce = await this.reserveNonce();
		const transaction: TransactionStatus = {
			wallet: this.account.address,
			nonce,
			status: "pending",
			params: { to: getAddress(params.to) },
			createdAt: Date.now(),
		};
		this.transactions.set(relayKey(this.account.address, nonce), transaction);

		try {
			const hash = await this.walletClient.writeContract({
				address: getAddress(params.to),
				abi: parseAbi([`function ${params.abi}`] as readonly string[]),
				functionName: params.abi.slice(0, params.abi.indexOf("(")),
				args: params.args,
				nonce,
			});
			transaction.hash = hash;
			transaction.status = "submitted";
			return {
				wallet: this.account.address,
				nonce,
				status: transaction.status,
			};
		} catch (error) {
			transaction.status = "error";
			transaction.error =
				error instanceof Error ? error.message : String(error);
			throw error;
		}
	}

	async getWallets(): Promise<{ wallets: string[] }> {
		return { wallets: [this.account.address] };
	}

	async getTransaction(
		wallet: string,
		nonce: number,
	): Promise<TransactionStatus> {
		const transaction = this.transactions.get(relayKey(wallet, nonce));
		if (!transaction) {
			throw new Error(`Local relay transaction not found: ${wallet}:${nonce}`);
		}
		if (!transaction.hash || transaction.status === "error") {
			return transaction;
		}

		try {
			const receipt = await this.publicClient.getTransactionReceipt({
				hash: transaction.hash as Hex,
			});
			transaction.status = receipt.status === "success" ? "confirmed" : "error";
			if (receipt.status === "reverted") {
				transaction.error = "onchain revert";
			}
		} catch {
			transaction.status = "submitted";
		}
		return transaction;
	}

	private reserveNonce(): Promise<number> {
		const currentNonce =
			this.nextNonce ??
			this.publicClient.getTransactionCount({
				address: this.account.address,
				blockTag: "pending",
			});
		const reservedNonce = currentNonce.catch(() =>
			this.publicClient.getTransactionCount({
				address: this.account.address,
				blockTag: "pending",
			}),
		);
		this.nextNonce = reservedNonce.then((nonce) => nonce + 1);
		return reservedNonce;
	}
}

class DurableWalletRelay implements Relay {
	constructor(
		private baseUrl: string,
		private apiKey: string,
	) {}

	private headers() {
		const h: Record<string, string> = { "Content-Type": "application/json" };
		if (this.apiKey) {
			h.Authorization = `Bearer ${this.apiKey}`;
		}
		return h;
	}

	private async request(path: string, init: RequestInit = {}) {
		const service = relayBinding.getStore();
		if (service) {
			return service.fetch(
				new Request(new URL(path, "https://relay.internal"), init),
			);
		}

		return fetch(new URL(path, this.baseUrl), init);
	}

	async sendTransaction(
		params: SendTransactionParams,
	): Promise<SendTransactionResponse> {
		const res = await this.request("/pool/send", {
			method: "POST",
			headers: this.headers(),
			body: JSON.stringify(params),
		});
		if (!res.ok) {
			const text = await res.text();
			throw new Error(`Relay sendTransaction failed (${res.status}): ${text}`);
		}
		return res.json() as Promise<SendTransactionResponse>;
	}

	async getWallets(): Promise<{ wallets: string[] }> {
		const res = await this.request("/pool/wallets", {
			headers: this.headers(),
		});
		if (!res.ok) {
			const text = await res.text();
			throw new Error(`Relay getWallets failed (${res.status}): ${text}`);
		}
		return res.json() as Promise<{ wallets: string[] }>;
	}

	async getTransaction(
		wallet: string,
		nonce: number,
	): Promise<TransactionStatus> {
		const res = await this.request(`/wallets/${wallet}/tx/${nonce}`, {
			headers: this.headers(),
		});
		if (!res.ok) {
			const text = await res.text();
			throw new Error(`Relay getTransaction failed (${res.status}): ${text}`);
		}
		return res.json() as Promise<TransactionStatus>;
	}
}

export const relay: Relay = env.LOCAL_RELAY_PRIVATE_KEY
	? new LocalWalletRelay(env.LOCAL_RELAY_PRIVATE_KEY as Hex)
	: new DurableWalletRelay(env.RELAY_URL, env.RELAY_API_KEY);

export function makeRelayTxId(wallet: string, nonce: number): string {
	return `dw:${wallet.toLowerCase()}:${nonce}`;
}

export function parseRelayTxId(
	id: string,
): { wallet: string; nonce: number } | null {
	if (!id.startsWith("dw:")) return null;
	const parts = id.split(":");
	if (parts.length < 3) return null;
	return { wallet: parts[1], nonce: Number(parts[2]) };
}
