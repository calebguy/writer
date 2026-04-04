"use client";

import { getRelayWallets } from "@/utils/api";
import { useOPWallet } from "@/utils/hooks";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { type Hex, parseEther } from "viem";

function truncateAddress(address: string) {
	return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function WalletRow({ address }: { address: string }) {
	const { authenticated, login } = usePrivy();
	const [wallet] = useOPWallet();
	const [amount, setAmount] = useState("");
	const [status, setStatus] = useState<
		"idle" | "sending" | "sent" | "error"
	>("idle");
	const [txHash, setTxHash] = useState<string | null>(null);

	async function handleDonate() {
		if (!authenticated) {
			login();
			return;
		}
		if (!wallet || !amount) return;

		setStatus("sending");
		try {
			const provider = await wallet.getEthereumProvider();
			const hash = await provider.request({
				method: "eth_sendTransaction",
				params: [
					{
						from: wallet.address as Hex,
						to: address as Hex,
						value: `0x${parseEther(amount).toString(16)}`,
					},
				],
			});
			setTxHash(hash as string);
			setStatus("sent");
			setAmount("");
		} catch {
			setStatus("error");
		}
	}

	return (
		<div className="flex flex-col gap-3 p-4 border border-neutral-300 dark:border-neutral-800">
			<div className="flex items-center justify-between">
				<code className="text-sm font-mono">
					<span className="hidden sm:inline">{address}</span>
					<span className="sm:hidden">{truncateAddress(address)}</span>
				</code>
				<button
					type="button"
					className="text-xs text-secondary hover:text-primary transition-colors cursor-pointer"
					onClick={() => navigator.clipboard.writeText(address)}
				>
					copy
				</button>
			</div>
			<div className="flex gap-2">
				<input
					type="number"
					step="any"
					min="0"
					placeholder="0.001"
					value={amount}
					onChange={(e) => {
						setAmount(e.target.value);
						if (status === "error" || status === "sent") setStatus("idle");
					}}
					className="flex-1 px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-800 bg-transparent font-mono focus:outline-none focus:border-primary"
				/>
				<button
					type="button"
					onClick={handleDonate}
					disabled={status === "sending" || (!amount && authenticated)}
					className="px-4 py-2 text-sm bg-primary text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
				>
					{!authenticated
						? "Login"
						: status === "sending"
							? "Sending..."
							: "Send ETH"}
				</button>
			</div>
			{status === "sent" && txHash && (
				<a
					href={`https://optimistic.etherscan.io/tx/${txHash}`}
					target="_blank"
					rel="noopener noreferrer"
					className="text-xs text-secondary hover:text-primary transition-colors"
				>
					View transaction
				</a>
			)}
			{status === "error" && (
				<span className="text-xs text-red-500">
					Transaction failed. Please try again.
				</span>
			)}
		</div>
	);
}

export default function DonatePage() {
	const { data: wallets, isLoading } = useQuery({
		queryKey: ["relay-wallets"],
		queryFn: () => getRelayWallets(),
	});

	return (
		<div className="max-w-2xl mx-auto w-full font-serif flex-1 flex flex-col gap-6">
			<div className="flex flex-col gap-2">
				<p className="text-lg leading-relaxed">
					Writer uses relayer wallets to submit transactions on your behalf so
					you don&apos;t need to pay gas. Donations help keep the relayers
					funded.
				</p>
				<p className="text-sm text-secondary">
					Send ETH on Optimism to any relayer below.
				</p>
			</div>
			<div className="flex flex-col gap-3">
				{isLoading ? (
					<div className="flex flex-col gap-3">
						{Array.from({ length: 2 }).map((_, i) => (
							<div
								key={`skeleton-${i}`}
								className="h-24 border border-neutral-300 dark:border-neutral-800 animate-pulse bg-surface"
							/>
						))}
					</div>
				) : wallets && wallets.length > 0 ? (
					wallets.map((address) => (
						<WalletRow key={address} address={address} />
					))
				) : (
					<p className="text-neutral-500">No relayer wallets found.</p>
				)}
			</div>
		</div>
	);
}
