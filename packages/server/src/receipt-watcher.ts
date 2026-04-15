import type { Hex } from "viem";
import { db, publicClient } from "./constants";
import { relay } from "./relay";

/**
 * After the relay accepts a transaction, we still have to wait for it to
 * actually land onchain (and possibly revert). The background poller picks
 * that up every 5s, but for snappy UX we kick off a detached watcher the
 * moment a relay.sendTransaction() returns.
 *
 * The watcher:
 *   1. Polls the relay until the tx hash is surfaced (status moves to
 *      SUBMITTED / CONFIRMED or the relay reports an error).
 *   2. Uses publicClient.waitForTransactionReceipt to observe the receipt
 *      the moment the block lands on the RPC we're pointed at.
 *   3. Updates relay_tx to CONFIRMED (success) or ABANDONED (revert / relay
 *      error) so the pending-overlay (Step 4) stops showing stale state.
 *
 * Any failure here is swallowed — the 5s poller is the fallback for watchers
 * that die with the server or get stuck.
 */
export function watchRelayReceipt(params: {
	txId: string;
	wallet: string;
	nonce: number;
	chainId: bigint;
	functionSignature: string;
	args: unknown;
}): void {
	void (async () => {
		try {
			const hash = await waitForRelayHash(params.wallet, params.nonce);
			if (!hash) return; // relay_tx is already ABANDONED (set below)
			const receipt = await publicClient.waitForTransactionReceipt({
				hash,
				timeout: 60_000,
			});
			if (receipt.status === "reverted") {
				await db.upsertTx({
					id: params.txId,
					wallet: params.wallet,
					nonce: params.nonce,
					chainId: params.chainId,
					functionSignature: params.functionSignature,
					args: params.args,
					hash,
					blockNumber: receipt.blockNumber,
					status: "ABANDONED",
					error: "onchain revert",
				});
				return;
			}
			await db.upsertTx({
				id: params.txId,
				wallet: params.wallet,
				nonce: params.nonce,
				chainId: params.chainId,
				functionSignature: params.functionSignature,
				args: params.args,
				hash,
				blockNumber: receipt.blockNumber,
				status: "CONFIRMED",
			});
		} catch (err) {
			console.error(
				`receipt watcher for ${params.txId} failed (poller will retry):`,
				err,
			);
		}
	})();
}

async function waitForRelayHash(
	wallet: string,
	nonce: number,
	timeoutMs = 30_000,
	pollMs = 500,
): Promise<Hex | null> {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		const status = await relay.getTransaction(wallet, nonce);
		if (status.hash) return status.hash as Hex;
		if (status.status === "error") {
			// Relay says the tx errored. Mark ABANDONED here; nothing to wait for.
			// (We don't have the full tx row in scope; just return null and let
			// the regular poller turn this into ABANDONED on its next tick.)
			return null;
		}
		await new Promise((r) => setTimeout(r, pollMs));
	}
	return null; // timed out; fall back to the 5s poller
}
