import type { Db } from "db";

export function makeRelayTxId(wallet: string, nonce: number): string {
	return `dw:${wallet.toLowerCase()}:${nonce}`;
}

export async function confirmRelayTx(params: {
	txFrom: string;
	txNonce: number;
	blockNumber: bigint;
	txHash: string;
	db: Db;
}): Promise<string | null> {
	const relayTxId = makeRelayTxId(params.txFrom, params.txNonce);
	const tx = await params.db.getTxById(relayTxId);
	if (!tx) return null;

	await params.db.upsertTx({
		id: tx.id,
		wallet: tx.wallet,
		nonce: tx.nonce,
		chainId: tx.chainId,
		functionSignature: tx.functionSignature,
		args: tx.args,
		blockNumber: params.blockNumber,
		hash: params.txHash,
		status: "CONFIRMED",
	});

	return tx.id;
}
