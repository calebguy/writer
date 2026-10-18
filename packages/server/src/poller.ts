import { db } from "./constants";
import { parseRelayTxId, relay, RelayTransactionNotFoundError } from "./relay";

export async function pollPendingTransactions() {
	try {
		const pending = await db.getPendingTxs(100);
		for (const tx of pending) {
			const parsed = parseRelayTxId(tx.id);
			if (!parsed) continue;

			const transactionRecord = {
				id: tx.id,
				wallet: tx.wallet,
				nonce: tx.nonce,
				chainId: tx.chainId,
				functionSignature: tx.functionSignature,
				args: tx.args,
			};

			try {
				const status = await relay.getTransaction(parsed.wallet, parsed.nonce);
				// Relay reports an error: the tx never landed. Mark it as
				// terminal so we stop polling and so any consumer of the
				// pending overlay drops it.
				if (status.status === "error") {
					await db.upsertTx({
						...transactionRecord,
						hash: status.hash ?? tx.hash,
						status: "ABANDONED",
						error: status.error ?? "relay error",
					});
					continue;
				}
				await db.upsertTx({
					...transactionRecord,
					hash: status.hash ?? tx.hash,
					status:
						status.status === "confirmed"
							? "CONFIRMED"
							: status.status === "submitted"
								? "SUBMITTED"
								: "PENDING",
				});
			} catch (error) {
				if (error instanceof RelayTransactionNotFoundError) {
					await db.upsertTx({
						...transactionRecord,
						hash: tx.hash,
						status: "ABANDONED",
						error: error.message,
					});
					continue;
				}
				console.error(`Failed to poll relay tx ${tx.id}:`, error);
			}
		}
	} catch (error) {
		console.error("Failed to poll pending transactions:", error);
	}
}
