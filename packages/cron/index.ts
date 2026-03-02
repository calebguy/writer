import { syncPendingReconcile } from "./src/reconcile";

syncPendingReconcile()
	.then(() => {
		process.exit(0);
	})
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
