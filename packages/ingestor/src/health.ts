export function startHealthServer(
	port: number,
	getStatus: () => {
		lastBlock: bigint;
		chainTip: bigint;
		storageAddresses: number;
	},
): void {
	Bun.serve({
		port,
		fetch() {
			const status = getStatus();
			return new Response(
				JSON.stringify({
					status: "ok",
					lastBlock: status.lastBlock.toString(),
					chainTip: status.chainTip.toString(),
					lag: (status.chainTip - status.lastBlock).toString(),
					storageAddresses: status.storageAddresses,
				}),
				{ headers: { "Content-Type": "application/json" } },
			);
		},
	});
	console.log(`Health server listening on port ${port}`);
}
