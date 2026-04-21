"use client";

import { useEntryLoading } from "@/utils/EntryLoadingContext";
import type { Entry as EntryType, Writer } from "@/utils/api";
import {
	deleteEntry,
	editEntry,
	getSaved,
	saveEntry,
	unsaveEntry,
} from "@/utils/api";
import { cn } from "@/utils/cn";
import {
	clearPrivateCachedEntry,
	clearPublicCachedEntry,
} from "@/utils/entryCache";
import { useOPWallet } from "@/utils/hooks";
import { getCachedDerivedKey } from "@/utils/keyCache";
import { signRemove, signUpdate } from "@/utils/signer";
import {
	compress,
	encrypt,
	isEntryPrivate,
	isWalletAuthor,
	processPrivateEntry,
	sleep,
} from "@/utils/utils";
import { usePrivy } from "@privy-io/react-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Hex } from "viem";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { Lock } from "./icons/Lock";
import { LoadingRelic } from "./LoadingRelic";
import { Logo } from "./icons/Logo";
import { Unlock } from "./icons/Unlock";
import { MarkdownRenderer } from "./markdown/MarkdownRenderer";

const MDX = dynamic(() => import("./markdown/MDX"), { ssr: false });

export default function Entry({
	initialEntry,
	address,
	id,
	isPending,
	onEntryUpdate,
	legacyDomain = false,
}: {
	initialEntry: EntryType;
	address: string;
	id: string;
	isPending?: boolean;
	onEntryUpdate: () => void;
	/** Whether this entry's writer uses the legacy EIP-712 domain (with chainId). */
	legacyDomain?: boolean;
}) {
	const [wallet] = useOPWallet();
	const { getAccessToken, authenticated, ready } = usePrivy();
	const isLoggedIn = ready && authenticated;
	const router = useRouter();
	const queryClient = useQueryClient();
	const { setEntryLoading } = useEntryLoading();
	const [isEditing, setIsEditing] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [deleteSubmitted, setDeletedSubmitted] = useState(false);
	const [editSubmitted, setEditSubmitted] = useState(false);
	const [processedEntry, setProcessedEntry] = useState<EntryType | null>(null);
	const [encrypted, setEncrypted] = useState(false);
	const [editedContent, setEditedContent] = useState("");
	const initializedRef = useRef(false);
	// Mirror of processedEntry for reads inside effects — we can't put the
	// state itself in the effect's dep array without turning local
	// setProcessedEntry() calls into a trigger that reverts the optimistic
	// update (see `loadProcessedEntry` below).
	const processedEntryRef = useRef<EntryType | null>(null);
	useEffect(() => {
		processedEntryRef.current = processedEntry;
	}, [processedEntry]);
	// Locked decompressed content from a just-committed edit. Released only
	// once the server's `initialEntry` reports both the matching content AND
	// a confirmed `updatedAtHash`. Guards two revert races:
	//   1) The window between the optimistic `setProcessedEntry` and the
	//      cache patch from `onMutate`, where a refetch could return the
	//      pre-edit content.
	//   2) The ingestor race where `EntryUpdated` is processed before
	//      `ChunkReceived`, leaving the server briefly serving the old
	//      chunks under a confirmed `updatedAtHash` once the pending
	//      overlay has dropped off.
	const pendingSavedContentRef = useRef<string | null>(null);
	const walletAddress = wallet?.address?.toLowerCase();
	const { data: savedData } = useQuery({
		queryKey: ["saved", walletAddress],
		queryFn: () => getSaved(walletAddress as Hex),
		enabled: !!walletAddress,
	});
	const isSavedEntry = useMemo(
		() =>
			Boolean(
				savedData?.entries?.some((item) => item.entry.id === initialEntry.id),
			),
		[savedData?.entries, initialEntry.id],
	);
	const { mutate: toggleSaveEntry, isPending: isTogglingSaveEntry } =
		useMutation({
			mutationKey: ["toggle-save-entry", walletAddress, initialEntry.id],
			mutationFn: async () => {
				if (!walletAddress) return;
				const authToken = await getAccessToken();
				if (!authToken) return;
				if (isSavedEntry) {
					await unsaveEntry({
						userAddress: walletAddress,
						entryId: initialEntry.id,
						authToken,
					});
					return;
				}
				await saveEntry({
					userAddress: walletAddress,
					entryId: initialEntry.id,
					authToken,
				});
			},
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: ["saved", walletAddress] });
			},
		});

	// Signal to header that entry is ready to display
	useEffect(() => {
		if (processedEntry) {
			// Entry is ready: either public, or private with content (viewable or showing "Private")
			setEntryLoading(false);
		}
	}, [processedEntry, setEntryLoading]);

	const writerQueryKey = ["writer", address] as const;
	const entryQueryKey = ["entry", address, id] as const;

	const { mutateAsync: mutateAsyncDelete, isPending: isPendingDelete } =
		useMutation({
			mutationFn: deleteEntry,
			mutationKey: ["delete-entry", address, id],
			onMutate: async () => {
				await queryClient.cancelQueries({ queryKey: writerQueryKey });
				const previous = queryClient.getQueryData<Writer>(writerQueryKey);
				if (!previous) return { previous: undefined };
				const now = new Date().toISOString();
				queryClient.setQueryData<Writer>(writerQueryKey, (current) =>
					current
						? {
								...current,
								entries: current.entries.map((e) =>
									e.onChainId === id
										? { ...e, deletedAt: now, deletedAtBlockDatetime: now }
										: e,
								),
							}
						: current,
				);
				return { previous };
			},
			onError: (_err, _vars, ctx) => {
				if (ctx?.previous) {
					queryClient.setQueryData(writerQueryKey, ctx.previous);
				}
			},
			onSuccess: async () => {
				await clearPublicCachedEntry(address, id);
				if (wallet?.address) {
					clearPrivateCachedEntry(wallet.address, address, id);
				}
				queryClient.removeQueries({ queryKey: entryQueryKey });
				router.push(`/writer/${address}`);
			},
			onSettled: () => {
				queryClient.invalidateQueries({ queryKey: writerQueryKey });
			},
		});

	const { mutateAsync: mutateAsyncEdit, isPending: isPendingEdit } =
		useMutation({
			mutationFn: editEntry,
			mutationKey: ["edit-entry", address, id],
			onMutate: async (vars) => {
				await queryClient.cancelQueries({ queryKey: writerQueryKey });
				await queryClient.cancelQueries({ queryKey: entryQueryKey });
				const previousWriter =
					queryClient.getQueryData<Writer>(writerQueryKey);
				const previousEntry =
					queryClient.getQueryData<EntryType>(entryQueryKey);

				const now = new Date().toISOString();
				const applyEntryPatch = (entry: EntryType): EntryType => ({
					...entry,
					raw: vars.content,
					decompressed: vars.decompressed ?? entry.decompressed,
					updatedAt: now,
					// Flip the pending-edit signal immediately so the inline
					// "saving" spinner shows before the first refetch returns
					// the overlay. The real tx id and hash come back from the
					// server once the relayer submits and the indexer sees
					// EntryUpdated.
					updatedAtTransactionId: "pending",
					updatedAtHash: null,
					chunks:
						entry.chunks.length > 0
							? entry.chunks.map((chunk, idx) =>
									idx === 0 ? { ...chunk, content: vars.content } : chunk,
								)
							: [
									{
										id: -Date.now(),
										entryId: entry.id,
										index: 0,
										content: vars.content,
										createdAt: now,
										createdAtTransactionId: null,
									},
								],
					version: vars.content.startsWith("enc:v5:br:")
					? "enc:v5:br:"
					: vars.content.startsWith("enc:v4:br:")
						? "enc:v4:br:"
						: "br:",
				});

				if (previousWriter) {
					queryClient.setQueryData<Writer>(writerQueryKey, (current) =>
						current
							? {
									...current,
									entries: current.entries.map((e) =>
										e.onChainId === id ? applyEntryPatch(e) : e,
									),
								}
							: current,
					);
				}
				if (previousEntry) {
					queryClient.setQueryData<EntryType>(
						entryQueryKey,
						applyEntryPatch(previousEntry),
					);
				}
				return { previousWriter, previousEntry };
			},
			onError: (_err, _vars, ctx) => {
				if (ctx?.previousWriter) {
					queryClient.setQueryData(writerQueryKey, ctx.previousWriter);
				}
				if (ctx?.previousEntry) {
					queryClient.setQueryData(entryQueryKey, ctx.previousEntry);
				}
			},
			onSuccess: async () => {
				await clearPublicCachedEntry(address, id);
				if (wallet?.address) {
					clearPrivateCachedEntry(wallet.address, address, id);
				}
				onEntryUpdate();
			},
			onSettled: () => {
				queryClient.invalidateQueries({ queryKey: entryQueryKey });
				queryClient.invalidateQueries({ queryKey: writerQueryKey });
			},
		});

	useEffect(() => {
		async function loadProcessedEntry() {
			if (!initialEntry) return;

			const currentProcessed = processedEntryRef.current;

			// Hold the optimistic save until the server both (a) returns
			// matching content and (b) reports a real `updatedAtHash`.
			// Until then, any refetch might be serving pre-edit or
			// confirmation-race data — discard it to keep the committed
			// content on screen.
			const pendingSaved = pendingSavedContentRef.current;
			if (pendingSaved !== null) {
				const matches = initialEntry.decompressed === pendingSaved;
				const confirmed = !!initialEntry.updatedAtHash;
				if (matches && confirmed) {
					pendingSavedContentRef.current = null;
					// fall through to the normal sync (which will be a no-op
					// since processedEntry already matches)
				} else {
					return;
				}
			}

			// Already initialized — only re-sync if something actually
			// changed. Without these guards, any local setProcessedEntry
			// (e.g. the optimistic patch in handleSave) used to retrigger
			// this effect via a stale `processedEntry` dep and clobber the
			// optimistic content back to `initialEntry`'s previous value.
			if (initializedRef.current && currentProcessed) {
				const needsDecryption =
					isEntryPrivate(currentProcessed) &&
					!currentProcessed.decompressed &&
					wallet;
				const contentMatchesInitial =
					currentProcessed.raw === initialEntry.raw &&
					currentProcessed.decompressed === initialEntry.decompressed;
				if (!needsDecryption && contentMatchesInitial) return;
			}

			// If already processed (has decompressed content), set immediately
			if (initialEntry.decompressed) {
				setProcessedEntry(initialEntry);
				setEditedContent(initialEntry.decompressed);
				setEncrypted(isEntryPrivate(initialEntry));
				initializedRef.current = true;
				return;
			}

			// Only sleep for unprocessed entries that need decryption
			await sleep(200);

			if (isEntryPrivate(initialEntry)) {
				setEncrypted(true);
				if (wallet && isWalletAuthor(wallet, initialEntry)) {
					const needsV5 =
						initialEntry.raw?.startsWith("enc:v5:br:") &&
						!!initialEntry.storageId;
					const needsV4 =
						initialEntry.raw?.startsWith("enc:v4:br:") &&
						!!initialEntry.storageId;
					const needsV3 = initialEntry.raw?.startsWith("enc:v3:br:");
					const needsV2 = initialEntry.raw?.startsWith("enc:v2:br:");
					const needsV1 = initialEntry.raw?.startsWith("enc:br:");
					const keyV5 = needsV5
						? await getCachedDerivedKey(wallet, "v5", initialEntry.storageId)
						: undefined;
					const keyV4 = needsV4
						? await getCachedDerivedKey(wallet, "v4", initialEntry.storageId)
						: undefined;
					const keyV3 = needsV3
						? await getCachedDerivedKey(wallet, "v3")
						: undefined;
					const keyV2 = needsV2
						? await getCachedDerivedKey(wallet, "v2")
						: undefined;
					const keyV1 = needsV1
						? await getCachedDerivedKey(wallet, "v1")
						: undefined;
					const processed = await processPrivateEntry(
						keyV2,
						initialEntry,
						keyV1,
						keyV3,
						keyV4,
						keyV5,
					);
					setProcessedEntry(processed);
					setEditedContent(processed.decompressed ?? "");
					initializedRef.current = true;
				} else if (wallet) {
					// Wallet is ready but user is not the author - they can't decrypt
					setProcessedEntry(initialEntry);
					setEditedContent(initialEntry.decompressed ?? "");
					initializedRef.current = true;
				}
				// If wallet is undefined, don't set initialized - let it retry when wallet is ready
			} else {
				setProcessedEntry(initialEntry);
				setEditedContent(initialEntry.decompressed ?? "");
				initializedRef.current = true;
			}
		}
		loadProcessedEntry();
	}, [initialEntry, wallet]);

	const canEdit = useMemo(() => {
		return (
			initialEntry &&
			wallet &&
			isWalletAuthor(wallet, initialEntry) &&
			!isPending
		);
	}, [initialEntry, wallet, isPending]);

	const isContentChanged = useMemo(() => {
		return (
			editedContent !== processedEntry?.decompressed ||
			(processedEntry && encrypted !== isEntryPrivate(processedEntry))
		);
	}, [editedContent, processedEntry, encrypted]);

	const isEditPending = useMemo(() => {
		return isPendingDelete || isPendingEdit || deleteSubmitted || editSubmitted;
	}, [isPendingDelete, isPendingEdit, deleteSubmitted, editSubmitted]);

	const handleSave = async () => {
		if (!editedContent || !wallet) return;

		// Embedded (Privy) wallets sign silently — we can drop out of edit
		// mode the instant the user clicks save and roll back if anything in
		// the try block throws. External wallets (MetaMask, WalletConnect)
		// pop a signature prompt and the round trip is visible to the user,
		// so we keep the blocking overlay up until the server accepts.
		const isEmbeddedWallet = wallet.walletClientType === "privy";
		const priorProcessed = processedEntry;
		const intendedContent = editedContent;

		setEditSubmitted(true);
		if (isEmbeddedWallet) {
			pendingSavedContentRef.current = intendedContent;
			setProcessedEntry((prev) =>
				prev ? { ...prev, decompressed: intendedContent } : prev,
			);
			setIsEditing(false);
		}

		try {
			const compressedContent = await compress(intendedContent);
			let versionedCompressedContent = `br:${compressedContent}`;
			if (encrypted) {
				// Edits always re-encrypt with v4. Even if the original entry was
				// stored as v1/v2/v3, the updated content is written as v4 — the
				// edit produces a new ciphertext anyway, so we may as well lift it
				// to the secure format. The previous storage_id is preserved on
				// the entry row, so the v4 key is the same one the user would
				// derive for any other entry on this writer.
				const key = await getCachedDerivedKey(
					wallet,
					"v5",
					initialEntry.storageId,
				);
				const encryptedContent = await encrypt(key, compressedContent);
				versionedCompressedContent = `enc:v5:br:${encryptedContent}`;
			}
			const { signature, nonce, entryId, totalChunks, content } =
				await signUpdate(wallet, {
					entryId: Number(id),
					address: address as Hex,
					content: versionedCompressedContent,
					legacyDomain,
				});
			const authToken = await getAccessToken();
			if (!authToken) {
				throw new Error("No auth token found");
			}
			await mutateAsyncEdit({
				address: address as Hex,
				id: entryId,
				signature,
				nonce,
				totalChunks,
				content,
				authToken,
				decompressed: intendedContent,
			});
			pendingSavedContentRef.current = intendedContent;
			setProcessedEntry((prev) =>
				prev
					? {
							...prev,
							decompressed: intendedContent,
							raw: versionedCompressedContent,
						}
					: prev,
			);
			setIsEditing(false);
			setEditSubmitted(false);
		} catch (err) {
			console.error("Edit failed", err);
			if (isEmbeddedWallet) {
				// Optimistic exit failed — restore the prior entry state and
				// bounce the user back into the editor with their draft
				// intact so they can retry without re-typing.
				pendingSavedContentRef.current = null;
				setProcessedEntry(priorProcessed);
				setEditedContent(intendedContent);
				setIsEditing(true);
			}
			setEditSubmitted(false);
		}
	};

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (isEditing && (e.metaKey || e.ctrlKey) && e.key === "Enter") {
				e.preventDefault();
				if (isContentChanged && !isEditPending) {
					handleSave();
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isEditing, isContentChanged, isEditPending, handleSave]);

	const canView = useMemo(() => {
		if (processedEntry) {
			if (isEntryPrivate(processedEntry)) {
				return wallet && isWalletAuthor(wallet, processedEntry);
			}
			return true;
		}
		return false;
	}, [processedEntry, wallet]);

	if (!processedEntry) {
		return (
			<div className="grow flex flex-col">
				<div className="grow flex flex-col p-2 space-y-3">
					<div className="h-6 bg-surface-raised animate-pulse rounded w-3/4" />
					<div className="h-4 bg-surface-raised animate-pulse rounded w-full" />
					<div className="h-4 bg-surface-raised animate-pulse rounded w-full" />
					<div className="h-4 bg-surface-raised animate-pulse rounded w-5/6" />
					<div className="h-4 bg-surface-raised animate-pulse rounded w-full" />
					<div className="h-4 bg-surface-raised animate-pulse rounded w-2/3" />
					<div className="h-4 bg-surface-raised animate-pulse rounded w-full" />
					<div className="h-4 bg-surface-raised animate-pulse rounded w-4/5" />
				</div>
				<div className="flex items-end mt-3">
					<div className="space-y-1">
						<div className="h-4 bg-surface-raised animate-pulse rounded w-32" />
						<div className="h-4 bg-surface-raised animate-pulse rounded w-28" />
					</div>
				</div>
			</div>
		);
	}

	const dateFmt = "MMM do, yyyy";
	const createdAt = processedEntry.createdAtBlockDatetime
		? format(new Date(processedEntry.createdAtBlockDatetime), dateFmt)
		: format(new Date(processedEntry.createdAt), dateFmt);

	// An edit is awaiting on-chain confirmation when the pending-overlay has
	// stamped the entry with a tx id but the indexer hasn't populated
	// updatedAtHash yet. Mirrors EntryList's `!onChainId` pending-new-entry
	// signal.
	const isConfirmingEdit =
		!!initialEntry.updatedAtTransactionId && !initialEntry.updatedAtHash;

	// External wallets (MetaMask, WalletConnect, etc.) pop a signature prompt
	// and the round trip is visible, so we keep the blocking overlay up
	// until the server accepts. Embedded (Privy) wallets sign silently and
	// get the optimistic-exit flow in `handleSave`.
	const isExternalWallet = !!wallet && wallet.walletClientType !== "privy";
	const showBlockingOverlay =
		isEditing && (deleteSubmitted || (isExternalWallet && editSubmitted));

	return (
		<div className="grow flex flex-col">
			{!isEditing && (
				<div className="grow flex flex-col relative">
					{canView && (
						<MarkdownRenderer
							markdown={processedEntry.decompressed ?? ""}
							className="border border-transparent p-2"
						/>
					)}
					{!canView && (
						<div className="flex flex-col gap-2 justify-center items-center grow">
							<div className="text-sm text-neutral-400 dark:text-neutral-600">
								<Logo className="w-8 h-8" />
							</div>
							<div className="text-lg text-neutral-400 dark:text-neutral-600">
								Private
							</div>
						</div>
					)}
					{isEntryPrivate(processedEntry) && (
						<div className="absolute bottom-0 left-0">
							<Lock className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-600" />
						</div>
					)}
					{isPending && (
						<div className="absolute bottom-0 right-0 flex items-center gap-1.5 text-neutral-400 dark:text-neutral-600">
							<span className="text-xs">confirming</span>
							<LoadingRelic size={14} />
						</div>
					)}
				</div>
			)}
			<div
				className={cn("grow flex-col relative", {
					flex: isEditing,
					hidden: !isEditing,
				})}
			>
				<MDX
					markdown={editedContent}
					onChange={setEditedContent}
					className="border border-primary border-dashed bg-surface text-black! dark:text-white! flex-col grow flex w-full aspect-auto!"
					autoFocus={isEditing}
				/>
				<button
					type="button"
					onClick={() => setEncrypted?.(!encrypted)}
					className="hover:text-primary text-neutral-400 dark:text-neutral-600 absolute bottom-3 left-2 z-20"
				>
					{encrypted ? (
						<Lock className="h-3.5 w-3.5" />
					) : (
						<Unlock className="h-3.5 w-3.5 ml-0.5" />
					)}
				</button>
				{showBlockingOverlay && (
					<div
						className={cn(
							"absolute inset-0 flex flex-col items-center justify-between h-full z-20",
							{ "bg-red-700": deleteSubmitted },
							{ "bg-secondary": !deleteSubmitted },
						)}
					>
						<div
							className={cn(
								"w-full text-left wrap-break-word p-2 overflow-hidden",
								{ "[&_*]:!text-red-900": deleteSubmitted },
								{ "[&_*]:!text-primary": !deleteSubmitted },
							)}
						>
							<MarkdownRenderer markdown={editedContent} />
						</div>
						<div className="absolute inset-0 flex justify-center items-center">
							<LoadingRelic size={32} />
						</div>
					</div>
				)}
			</div>

			{/* Footer */}
			<div
				className={cn("flex items-end mt-3", {
					"justify-between": canEdit,
					"justify-start": !canEdit,
				})}
			>
				<div>
					{isConfirmingEdit || editSubmitted ? (
						<span className="pending-entry-spinner inline-flex">
							<span className="pending-entry-spinner-track" />
							<AiOutlineLoading3Quarters className="pending-entry-spinner-icon w-3 h-3 rotating" />
						</span>
					) : (
						<span className="text-neutral-400 dark:text-neutral-600 bold">
							{createdAt}
						</span>
					)}
					{isLoggedIn && walletAddress && (
						<div>
							<button
								type="button"
								className="text-neutral-400 dark:text-neutral-600 hover:text-secondary cursor-pointer"
								disabled={isTogglingSaveEntry}
								onClick={() => toggleSaveEntry()}
							>
								{isSavedEntry ? "unsave" : "save"}
							</button>
						</div>
					)}
				</div>
				{canEdit && (
					<div className="flex gap-2 justify-between">
						<div className="flex flex-col gap-1">
							<div className="flex gap-2">
								<button
									type="button"
									className={cn(
										"text-neutral-400 dark:text-neutral-600 hover:text-secondary cursor-pointer",
									)}
									onClick={() => {
										if (isEditing) {
											setEditedContent(processedEntry?.decompressed ?? "");
											setIsEditing(false);
											setIsDeleting(false);
										} else {
											setIsEditing(true);
										}
									}}
								>
									{isEditing ? "cancel" : "edit"}
								</button>
								{isEditing && (
									<button
										type="button"
										disabled={!isContentChanged}
										onClick={handleSave}
										className={cn(
											"text-green-400 hover:text-green-600 disabled:text-neutral-400 dark:disabled:text-neutral-600",
											{ "cursor-pointer": isContentChanged },
										)}
									>
										save
									</button>
								)}
							</div>
						</div>
						{isEditing && (
							<div className="ml-2">
								{!isDeleting && (
									<button
										type="button"
										className="text-neutral-400 dark:text-neutral-600 hover:text-red-700 cursor-pointer"
										onClick={() => setIsDeleting(true)}
									>
										delete
									</button>
								)}
								{isDeleting && (
									<button
										type="button"
										className="text-red-700 hover:text-red-900 cursor-pointer"
										onClick={async () => {
											setDeletedSubmitted(true);
											if (!wallet) {
												setDeletedSubmitted(false);
												return;
											}
											try {
												const { signature, nonce } = await signRemove(wallet, {
													id: Number(id),
													address: address as Hex,
													legacyDomain,
												});
												const authToken = await getAccessToken();
												if (!authToken) {
													console.error("No auth token found");
													setDeletedSubmitted(false);
													return;
												}
												await mutateAsyncDelete({
													address: address as Hex,
													id: Number(id),
													signature,
													nonce,
													authToken,
												});
												setDeletedSubmitted(false);
											} catch {
												setDeletedSubmitted(false);
											}
										}}
									>
										do it
									</button>
								)}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
