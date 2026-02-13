"use client";

import {
	type BaseConnectedWalletType,
	type ConnectedWallet,
	useActiveWallet,
	useWallets,
} from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import type { Entry } from "./api";
import { getCachedEntry, setCachedEntry } from "./entryCache";
import { getCachedDerivedKey } from "./keyCache";
import { isEntryPrivate, isWalletAuthor, processPrivateEntry } from "./utils";

export function useIsMac() {
	const [isMac, setIsMac] = useState(false);

	useEffect(() => {
		setIsMac(navigator.platform.toLowerCase().includes("mac"));
	}, []);

	return isMac;
}

export function useIsMobile() {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		// Detect touch devices using media queries
		// hover: none = device can't hover (touch device)
		// pointer: coarse = imprecise pointing device (finger vs mouse)
		const mediaQuery = window.matchMedia(
			"(hover: none) and (pointer: coarse)",
		);
		setIsMobile(mediaQuery.matches);

		const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
		mediaQuery.addEventListener("change", handler);
		return () => mediaQuery.removeEventListener("change", handler);
	}, []);

	return isMobile;
}

export function useOPWallet() {
	const { wallets, ready } = useWallets();
	const { wallet: activeWallet } = useActiveWallet();
	const opWallets = wallets.filter((wallet) => wallet.chainId === "eip155:10");

	function isEthereumWallet(
		wallet: BaseConnectedWalletType | undefined,
	): wallet is ConnectedWallet {
		return wallet?.type === "ethereum";
	}

	const activeEthereumWallet = isEthereumWallet(activeWallet)
		? activeWallet
		: undefined;
	const fallbackEthereumWallet =
		opWallets[0] ?? wallets.find((wallet) => wallet.type === "ethereum");

	// Prefer the active (user-selected) Ethereum wallet; fall back to OP or any Ethereum wallet.
	const wallet = activeEthereumWallet ?? fallbackEthereumWallet;
	return [wallet, ready] as const;
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

			// Get derived keys (cached to avoid multiple signature requests)
			const needsV2 = privateEntriesToProcess.some((entry) =>
				entry.raw?.startsWith("enc:v2:br:"),
			);
			const needsV1 = privateEntriesToProcess.some((entry) =>
				entry.raw?.startsWith("enc:br:"),
			);
			const derivedKeyV2 = needsV2
				? await getCachedDerivedKey(wallet!, "v2")
				: undefined;
			const derivedKeyV1 = needsV1
				? await getCachedDerivedKey(wallet!, "v1")
				: undefined;

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
