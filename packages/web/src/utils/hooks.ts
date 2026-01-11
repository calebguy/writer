"use client";

import { useWallets } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import type { Entry } from "./api";
import { getCachedEntry, setCachedEntry } from "./entryCache";
import { getDerivedSigningKey } from "./signer";
import { isEntryPrivate, isWalletAuthor, processPrivateEntry } from "./utils";

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
	const [processedEntries, setProcessedEntries] = useState<Entry[]>([]);
	const [isProcessing, setIsProcessing] = useState(true);

	useEffect(() => {
		if (!entries || !walletReady) {
			return;
		}

		setIsProcessing(true);

		async function processAllEntries() {
			const walletAddress = wallet?.address;
			const results: Entry[] = [];

			// Get derived key once upfront if we have any private entries to decrypt
			const hasPrivateEntriesToDecrypt = entries!.some(
				(entry) =>
					isEntryPrivate(entry) && wallet && isWalletAuthor(wallet, entry),
			);

			let derivedKey: Uint8Array | undefined;
			if (hasPrivateEntriesToDecrypt && wallet) {
				derivedKey = await getDerivedSigningKey(wallet);
			}

			// Process entries sequentially to avoid race conditions
			for (const entry of entries!) {
				const entryId = entry.onChainId?.toString() ?? entry.id.toString();
				const isPrivate = isEntryPrivate(entry);

				// Check cache first
				const cached = await getCachedEntry(writerAddress, entryId, {
					walletAddress,
					isPrivate,
				});

				if (cached) {
					results.push(cached);
					continue;
				}

				if (isPrivate) {
					if (wallet && isWalletAuthor(wallet, entry) && derivedKey) {
						const processed = await processPrivateEntry(derivedKey, entry);
						await setCachedEntry(writerAddress, entryId, processed, {
							walletAddress,
							isPrivate: true,
						});
						results.push(processed);
					}
					// Private entries from other authors are not shown
				} else {
					// Public entries - cache to IndexedDB
					await setCachedEntry(writerAddress, entryId, entry, {
						isPrivate: false,
					});
					results.push(entry);
				}
			}

			// Single state update at the end
			setProcessedEntries(results);
			setIsProcessing(false);
		}

		processAllEntries();
	}, [entries, wallet, walletReady, writerAddress]);

	return { processedEntries, isProcessing };
}
