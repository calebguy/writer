"use client";

import { useWallets } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import type { Entry } from "./api";
import { getCachedEntry, setCachedEntry } from "./entryCache";
import { getDerivedSigningKey } from "./signer";
import { isEntryPrivate, isWalletAuthor, processEntry } from "./utils";

export function useIsMac() {
	const [isMac, setIsMac] = useState(false);

	useEffect(() => {
		setIsMac(navigator.platform.toLowerCase().includes("mac"));
	}, []);

	return isMac;
}

export function useOPWallet() {
	const { wallets, ready } = useWallets();
	const opWallets = wallets.filter((wallet) => wallet.chainId === "eip155:10");
	return [opWallets[0], ready] as const;
}

export function useProcessedEntries(
	entries: Entry[] | undefined,
	writerAddress: string,
) {
	const [wallet, walletReady] = useOPWallet();
	const [processedEntries, setProcessedEntries] = useState<Map<number, Entry>>(
		new Map(),
	);
	const [isProcessing, setIsProcessing] = useState(true);

	useEffect(() => {
		if (!entries || !walletReady) {
			return;
		}

		setIsProcessing(true);
		// Reset entries when inputs change to avoid stale data
		setProcessedEntries(new Map());

		async function processAllEntries() {
			let derivedKey: Uint8Array | undefined;
			const walletAddress = wallet?.address;

			// Process all entries in parallel
			const processPromises = entries!.map(async (entry) => {
				const entryId = entry.onChainId?.toString() ?? entry.id.toString();
				const isPrivate = isEntryPrivate(entry);

				// Check cache first (async for IndexedDB)
				const cached = await getCachedEntry(writerAddress, entryId, {
					walletAddress,
					isPrivate,
				});
				if (cached) {
					setProcessedEntries((prev) => new Map(prev).set(entry.id, cached));
					return;
				}

				if (isPrivate) {
					if (wallet && isWalletAuthor(wallet, entry)) {
						if (!derivedKey) {
							derivedKey = await getDerivedSigningKey(wallet);
						}
						const processed = await processEntry(derivedKey, entry);

						// Cache to memory (private entries don't persist to IndexedDB)
						await setCachedEntry(writerAddress, entryId, processed, {
							walletAddress,
							isPrivate: true,
						});
						setProcessedEntries((prev) =>
							new Map(prev).set(entry.id, processed),
						);
					}
					// Private entries from other authors are not shown
				} else {
					// Public entries - cache to IndexedDB (persistent)
					await setCachedEntry(writerAddress, entryId, entry, {
						isPrivate: false,
					});
					setProcessedEntries((prev) => new Map(prev).set(entry.id, entry));
				}
			});

			await Promise.all(processPromises);
			setIsProcessing(false);
		}

		processAllEntries();
	}, [entries, wallet, walletReady, writerAddress]);

	return { processedEntries, isProcessing };
}
