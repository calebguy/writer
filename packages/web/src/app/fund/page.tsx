"use client";

import { Check } from "@/components/icons/Check";
import { type RelayWallet, getRelayWallets } from "@/utils/api";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

function truncateAddress(address: string) {
	return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

const FUND_ADDRESS = "0xCC2011577CaD30e15d8c8d6329d36DeAF85BD2Cc";
const FUND_ENS = "writetodayforever.eth";

function CopyAddressButton({ address }: { address: string }) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		await navigator.clipboard.writeText(address);
		setCopied(true);
		setTimeout(() => setCopied(false), 1000);
	};

	return (
		<button
			type="button"
			onClick={handleCopy}
			aria-label="Copy address"
			className="text-neutral-500 hover:text-primary cursor-pointer group w-6 h-6 flex items-center justify-center transition-opacity"
		>
			{copied ? (
				<Check className="text-primary cursor-default" />
			) : (
				<Image
					src="/images/relics/relic-10.png"
					alt="Copy"
					width={25}
					height={25}
					className="cursor-pointer hover:opacity-70 transition-opacity"
				/>
			)}
		</button>
	);
}

function WalletRow({ wallet }: { wallet: RelayWallet }) {
	const balanceNum = Number.parseFloat(wallet.balance);
	const displayBalance =
		balanceNum < 0.0001 && balanceNum > 0 ? "< 0.0001" : balanceNum.toFixed(4);

	return (
		<div className="flex items-center justify-between bg-surface rounded-xs py-1.5 border-b last:border-b-0 border-neutral-300 dark:border-neutral-700">
			<div className="flex items-center gap-2 min-w-0">
				<Link
					href={`https://optimistic.etherscan.io/address/${wallet.address}`}
					target="_blank"
					rel="noopener noreferrer"
					className="text-sm font-mono hover:text-primary hover:underline truncate"
				>
					<span className="hidden sm:inline">{wallet.address}</span>
					<span className="sm:hidden">{truncateAddress(wallet.address)}</span>
				</Link>
				<CopyAddressButton address={wallet.address} />
			</div>
			<span className="text-sm font-mono shrink-0">{displayBalance} ETH</span>
		</div>
	);
}

export default function FundPage() {
	const [isFundLinkHovered, setIsFundLinkHovered] = useState(false);
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
					width={120}
					height={120}
					className="dark:invert"
					priority
				/>
			</div>
			<div className="flex flex-col gap-2">
				<p className="text-base md:text-lg leading-relaxed text-center">
					Writer pays to store user data in permanent datastructures that will
					outlive us all. <br />
					If you&apos;d like to support, send tokens on any EVM chain to
				</p>
			</div>

			<div className="p-2.5 rounded-xs gap-3">
				<div
					className={`${
						isFundLinkHovered ? "bg-secondary" : "bg-surface"
					} p-2.5 rounded-xs flex items-center gap-3`}
				>
					<CopyAddressButton address={FUND_ADDRESS} />
					<div className="min-w-0">
						<Link
							href={`https://optimistic.etherscan.io/address/${FUND_ADDRESS}`}
							target="_blank"
							rel="noopener noreferrer"
							className="font-mono hover:text-primary hover:underline break-all"
							onMouseEnter={() => setIsFundLinkHovered(true)}
							onMouseLeave={() => setIsFundLinkHovered(false)}
							onFocus={() => setIsFundLinkHovered(true)}
							onBlur={() => setIsFundLinkHovered(false)}
						>
							{FUND_ENS}
						</Link>
					</div>
					<CopyAddressButton address={FUND_ADDRESS} />
				</div>
			</div>
			{/* <div>or</div>
			<div className="w-full">
				<span>Send ETH on Optimism directly to a relayer</span>
				<div className="w-full bg-surface px-2.5 py-1 rounded-xs flex flex-col">
					{isLoading ? (
						<div className="flex flex-col gap-2">
							{Array.from({ length: 3 }).map((_, i) => (
								<div
									key={`skeleton-${i}`}
									className="h-11 animate-pulse bg-surface-raised rounded-xs"
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
			</div> */}
		</div>
	);
}
