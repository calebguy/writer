"use client";

import { useWallets } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import type { Entry } from "./api";
import { getCachedEntry, setCachedEntry } from "./entryCache";
import {
	getDerivedSigningKeyV1,
	getDerivedSigningKeyV2,
} from "./signer";
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

	useEffect(() => {
		if (!entries || !walletReady) {
			return;
		}

		// Immediately show public entries + private entries (unprocessed)
		// Filter out private entries from other authors
		const visibleEntries = entries.filter((entry) => {
			if (isEntryPrivate(entry)) {
				return wallet && isWalletAuthor(wallet, entry);
			}
			return true;
		});
		setProcessedEntries(visibleEntries);

		// Process private entries in background (non-blocking)
		async function processPrivateEntriesInBackground() {
			const walletAddress = wallet?.address;
			const privateEntriesToProcess = visibleEntries.filter(
				(entry) =>
					isEntryPrivate(entry) &&
					!entry.decompressed && // Not already processed
					wallet &&
					isWalletAuthor(wallet, entry),
			);

			if (privateEntriesToProcess.length === 0) {
				return;
			}

			// Get derived keys once
			const derivedKeyV2 = await getDerivedSigningKeyV2(wallet!);
			const derivedKeyV1 = await getDerivedSigningKeyV1(wallet!);

			// Process each private entry and update state
			const processedMap = new Map<number, Entry>();

			for (const entry of privateEntriesToProcess) {
				const entryId = entry.onChainId?.toString() ?? entry.id.toString();

				// Check cache first
				const cached = await getCachedEntry(writerAddress, entryId, {
					walletAddress,
					isPrivate: true,
				});

				if (cached) {
					processedMap.set(entry.id, cached);
					continue;
				}

				const processed = await processPrivateEntry(
				derivedKeyV2,
				entry,
				derivedKeyV1,
			);
				await setCachedEntry(writerAddress, entryId, processed, {
					walletAddress,
					isPrivate: true,
				});
				processedMap.set(entry.id, processed);
			}

			// Update state with processed entries
			if (processedMap.size > 0) {
				setProcessedEntries((prev) =>
					prev.map((entry) => processedMap.get(entry.id) ?? entry),
				);
			}
		}

		processPrivateEntriesInBackground();
	}, [entries, wallet, walletReady, writerAddress]);

	return { processedEntries };
}
