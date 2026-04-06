"use client";

import { type RelayWallet, getRelayWallets } from "@/utils/api";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

function truncateAddress(address: string) {
	return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function WalletRow({ wallet }: { wallet: RelayWallet }) {
	const [copied, setCopied] = useState(false);
	const balanceNum = Number.parseFloat(wallet.balance);
	const displayBalance =
		balanceNum < 0.0001 && balanceNum > 0 ? "< 0.0001" : balanceNum.toFixed(4);

	const handleCopy = async () => {
		await navigator.clipboard.writeText(wallet.address);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};

	return (
		<div className="flex items-center justify-between p-3 bg-surface">
			<div className="flex items-center gap-2">
				<Link
					href={`https://optimistic.etherscan.io/address/${wallet.address}`}
					target="_blank"
					rel="noopener noreferrer"
					className="text-sm font-mono hover:text-primary transition-colors"
				>
					<span className="hidden sm:inline">{wallet.address}</span>
					<span className="sm:hidden">{truncateAddress(wallet.address)}</span>
				</Link>
				<button
					type="button"
					onClick={handleCopy}
					aria-label="Copy address"
					className="text-neutral-500 hover:text-primary transition-colors cursor-pointer"
				>
					{copied ? (
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<polyline points="20 6 9 17 4 12" />
						</svg>
					) : (
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
							className="cursor-pointer"
						>
							<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
							<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
						</svg>
					)}
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
		<div className="max-w-2xl mx-auto w-full font-serif flex-1 flex flex-col justify-center items-center gap-6">
			<div className="flex flex-col gap-2">
				<p className="text-lg leading-relaxed text-center">
					Writer is self funded & pays to store user data in permanent
					datastructures that should outlive us all on behalf of its users. If
					you'd like to support the project, send ETH on{" "}
					<Link
						href="https://optimism.io/"
						className="hover:text-primary transition-colors"
						target="_blank"
						rel="noopener noreferrer"
					>
						Optimism
					</Link>{" "}
					to any relayer address below.
				</p>
			</div>
			<div className="flex flex-col gap-2 w-full">
				{isLoading ? (
					<div className="flex flex-col gap-2">
						{Array.from({ length: 3 }).map((_, i) => (
							<div
								key={`skeleton-${i}`}
								className="h-11 animate-pulse bg-surface-raised"
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
