"use client";

import { Check } from "@/components/icons/Check";
import { Copy } from "@/components/icons/Copy";
import { type RelayWallet, getRelayWallets } from "@/utils/api";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
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
					className="text-sm font-mono hover:text-primary hover:underline"
				>
					<span className="hidden sm:inline">{wallet.address}</span>
					<span className="sm:hidden">{truncateAddress(wallet.address)}</span>
				</Link>
				<button
					type="button"
					onClick={handleCopy}
					aria-label="Copy address"
					className="text-neutral-500 hover:text-primary cursor-pointer"
				>
					{copied ? <Check /> : <Copy className="cursor-pointer" />}
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
		<div className="max-w-2xl mx-auto w-full font-serif flex-1 flex flex-col justify-center items-center gap-8">
			<div className="flex items-center justify-center gap-4">
				<Image
					src="/images/totem/totem-7.png"
					alt=""
					width={100}
					height={100}
					className="dark:invert"
					priority
				/>
			</div>
			<div className="flex flex-col gap-2">
				<p className="text-lg leading-relaxed text-center">
					Writer pays to store user data in permanent datastructures that will
					outlive us all. If you'd like to support the project, send ETH on{" "}
					<Link
						href="https://optimism.io/"
						className="hover:text-primary transition-colors hover:underline"
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
