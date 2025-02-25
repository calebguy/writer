import { useWallets } from "@privy-io/react-auth";

export function Writer() {
	const wallets = useWallets();
	console.log("wallets", wallets);
	return <div>wallets: {JSON.stringify(wallets)}</div>;
}
