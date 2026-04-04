"use client";

import { type RelayWallet, getRelayWallets } from "@/utils/api";
import { useQuery } from "@tanstack/react-query";

function truncateAddress(address: string) {
	return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function WalletRow({ wallet }: { wallet: RelayWallet }) {
	const balanceNum = Number.parseFloat(wallet.balance);
	const displayBalance =
		balanceNum < 0.0001 && balanceNum > 0 ? "< 0.0001" : balanceNum.toFixed(4);

	return (
		<div className="flex items-center justify-between p-3 bg-surface">
			<div className="flex items-center gap-2">
				<code className="text-sm font-mono">
					<span className="hidden sm:inline">{wallet.address}</span>
					<span className="sm:hidden">{truncateAddress(wallet.address)}</span>
				</code>
				<button
					type="button"
					className="text-xs text-secondary hover:text-primary transition-colors cursor-pointer"
					onClick={() => navigator.clipboard.writeText(wallet.address)}
				>
					copy
				</button>
			</div>
			<span className="text-sm font-mono">{displayBalance} ETH</span>
		</div>
	);
}

export default function FundPage() {
	const { data: wallets, isLoading } = useQuery({
		queryKey: ["relay-wallets"],
		queryFn: () => getRelayWallets(),
	});

	return (
		<div className="max-w-2xl mx-auto w-full font-serif flex-1 flex flex-col gap-6">
			<div className="flex flex-col gap-2">
				<p className="text-lg leading-relaxed">
					Writer uses relayer wallets to submit transactions on your behalf so
					you don&apos;t need to pay gas. Send ETH on Optimism to any relayer
					address below to help keep them funded.
				</p>
			</div>
			<div className="flex flex-col gap-2">
				{isLoading ? (
					<div className="flex flex-col gap-2">
						{Array.from({ length: 2 }).map((_, i) => (
							<div
								key={`skeleton-${i}`}
								className="h-14 border border-neutral-300 dark:border-neutral-800 animate-pulse bg-surface"
							/>
						))}
					</div>
				) : wallets && wallets.length > 0 ? (
					wallets.map((wallet) => (
						<WalletRow key={wallet.address} wallet={wallet} />
					))
				) : (
					<p className="text-neutral-500">No relayer wallets found.</p>
				)}
			</div>
		</div>
	);
}
