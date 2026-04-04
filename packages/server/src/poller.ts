import { db } from "./constants";
import { parseRelayTxId, relay } from "./relay";

const POLL_INTERVAL_MS = 5_000;

async function pollPendingTransactions() {
	try {
		const pending = await db.getPendingTxs(20);
		for (const tx of pending) {
			const parsed = parseRelayTxId(tx.id);
			if (!parsed) continue;

			try {
				const status = await relay.getTransaction(parsed.wallet, parsed.nonce);
				if (status.hash || status.status !== "pending") {
					await db.upsertTx({
						id: tx.id,
						wallet: tx.wallet,
						nonce: tx.nonce,
						chainId: tx.chainId,
						functionSignature: tx.functionSignature,
						args: tx.args,
						hash: status.hash ?? tx.hash,
						status: status.status === "confirmed"
							? "CONFIRMED"
							: status.status === "submitted"
								? "SUBMITTED"
								: "PENDING",
					});
				}
			} catch (error) {
				console.error(`Failed to poll relay tx ${tx.id}:`, error);
			}
		}
	} catch (error) {
		console.error("Failed to poll pending transactions:", error);
	}
}

export function startPoller() {
	console.log(`Starting relay transaction poller (every ${POLL_INTERVAL_MS}ms)`);
	setInterval(pollPendingTransactions, POLL_INTERVAL_MS);
}
