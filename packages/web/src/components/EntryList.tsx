"use client";

import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { Lock } from "@/components/icons/Lock";
import type { Entry } from "@/utils/api";
import { cn } from "@/utils/cn";
import { useOPWallet } from "@/utils/hooks";
import { getDerivedSigningKey } from "@/utils/signer";
import { isEntryPrivate, isWalletAuthor, processEntry } from "@/utils/utils";
import { format } from "date-fns";
import Link from "next/link";
import { useEffect, useState } from "react";

interface EntryListProps {
	entries: Entry[];
	writerAddress: string;
}

export default function EntryList({ entries, writerAddress }: EntryListProps) {
	const wallet = useOPWallet();
	const [processedEntries, setProcessedEntries] = useState<Entry[]>([]);

	useEffect(() => {
		async function processAllEntries() {
			const processed: Entry[] = [];

			for (const entry of entries) {
				if (isEntryPrivate(entry)) {
					if (wallet && isWalletAuthor(wallet, entry)) {
						// Decrypt if it's the author's private entry
						const key = await getDerivedSigningKey(wallet);
						const decryptedEntry = await processEntry(key, entry);
						processed.push(decryptedEntry);
					}
					// Skip entries that are private but not authored by the current wallet
				} else {
					// Public entries are always shown
					processed.push(entry);
				}
			}

			setProcessedEntries(processed);
		}

		processAllEntries();
	}, [entries, wallet]);

	return (
		<>
			{processedEntries.map((entry) => {
				const dateFmt = "MMM do, yyyy";
				let createdAt: string | undefined = undefined;
				if (entry.createdAtBlockDatetime) {
					createdAt = format(new Date(entry.createdAtBlockDatetime), dateFmt);
				} else {
					createdAt = format(new Date(entry.createdAt), dateFmt);
				}

				return (
					<Link
						href={`/writer/${writerAddress}/${entry.onChainId?.toString()}`}
						key={entry.id}
						className="aspect-square bg-neutral-900 flex flex-col px-2 pt-2 pb-0.5 hover:cursor-zoom-in overflow-hidden"
					>
						<div className="overflow-y-scroll flex-grow min-h-0">
							<MarkdownRenderer
								markdown={entry.decompressed ?? entry.raw}
								className="text-white"
							/>
						</div>
						<div
							className={cn(
								"flex items-end text-neutral-600 text-sm leading-3 pt-2 flex-shrink-0 pb-2",
								{
									"justify-between": isEntryPrivate(entry),
									"justify-end": !isEntryPrivate(entry),
								},
							)}
						>
							{isEntryPrivate(entry) && (
								<span>
									<Lock className="h-3.5 w-3.5 text-neutral-600" />
								</span>
							)}
							<span>{createdAt}</span>
						</div>
					</Link>
				);
			})}
		</>
	);
}
