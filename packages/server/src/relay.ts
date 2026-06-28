import { AsyncLocalStorage } from "node:async_hooks";
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

const relayBinding = new AsyncLocalStorage<Fetcher | undefined>();

export function runWithRelayBinding<T>(
	binding: Fetcher | undefined,
	callback: () => T,
): T {
	return relayBinding.run(binding, callback);
}

class DurableWalletRelay {
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

export const relay = new DurableWalletRelay(env.RELAY_URL, env.RELAY_API_KEY);

export function makeRelayTxId(wallet: string, nonce: number): string {
	return `dw:${wallet}:${nonce}`;
}

export function parseRelayTxId(
	id: string,
): { wallet: string; nonce: number } | null {
	if (!id.startsWith("dw:")) return null;
	const parts = id.split(":");
	if (parts.length < 3) return null;
	return { wallet: parts[1], nonce: Number(parts[2]) };
}
