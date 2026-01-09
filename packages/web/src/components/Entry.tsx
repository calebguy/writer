"use client";

import type { Entry as EntryType } from "@/utils/api";
import { deleteEntry, editEntry, getPendingEntry } from "@/utils/api";
import { cn } from "@/utils/cn";
import { useOPWallet } from "@/utils/hooks";
import { getDerivedSigningKey, signRemove, signUpdate } from "@/utils/signer";
import {
	compress,
	encrypt,
	isEntryPrivate,
	isWalletAuthor,
	processEntry,
	shortenAddress,
	sleep,
} from "@/utils/utils";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Hex } from "viem";
import { Lock } from "./icons/Lock";
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
}: {
	initialEntry: EntryType;
	address: string;
	id: string;
	isPending?: boolean;
	onEntryUpdate: () => void;
}) {
	const [wallet] = useOPWallet();
	const router = useRouter();
	const [isEditing, setIsEditing] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [deleteSubmitted, setDeletedSubmitted] = useState(false);
	const [editSubmitted, setEditSubmitted] = useState(false);
	const [processedEntry, setProcessedEntry] = useState<EntryType | null>(null);
	const [encrypted, setEncrypted] = useState(false);
	const [editedContent, setEditedContent] = useState("");
	const awaitingRefreshRef = useRef(false);
	const initializedRef = useRef(false);

	const { mutateAsync: mutateAsyncDelete, isPending: isPendingDelete } =
		useMutation({
			mutationFn: deleteEntry,
			mutationKey: ["delete-entry", address, id],
			onSuccess: () => {
				router.push(`/writer/${address}`);
			},
		});

	const { mutateAsync: mutateAsyncEdit, isPending: isPendingEdit } =
		useMutation({
			mutationFn: editEntry,
			mutationKey: ["edit-entry", address, id],
			onSuccess: () => {
				onEntryUpdate();
			},
		});

	useEffect(() => {
		async function loadProcessedEntry() {
			if (!initialEntry) return;

			// If already processed (has decompressed content), set immediately
			if (initialEntry.decompressed) {
				setProcessedEntry(initialEntry);
				setEditedContent(initialEntry.decompressed);
				setEncrypted(isEntryPrivate(initialEntry));
				if (awaitingRefreshRef.current) {
					awaitingRefreshRef.current = false;
					setEditSubmitted(false);
					setIsEditing(false);
				}
				initializedRef.current = true;
				return;
			}

			// Skip if already initialized (avoid re-processing on wallet change)
			if (initializedRef.current && processedEntry) return;

			// Only sleep for unprocessed entries that need decryption
			await sleep(200);

			if (isEntryPrivate(initialEntry)) {
				setEncrypted(true);
				if (isWalletAuthor(wallet, initialEntry)) {
					const key = await getDerivedSigningKey(wallet);
					const processed = await processEntry(key, initialEntry);
					setProcessedEntry(processed);
					setEditedContent(processed.decompressed ?? "");
				} else {
					setProcessedEntry(initialEntry);
					setEditedContent(initialEntry.decompressed ?? "");
				}
			} else {
				setProcessedEntry(initialEntry);
				setEditedContent(initialEntry.decompressed ?? "");
			}

			initializedRef.current = true;

			if (awaitingRefreshRef.current) {
				awaitingRefreshRef.current = false;
				setEditSubmitted(false);
				setIsEditing(false);
			}
		}
		loadProcessedEntry();
	}, [initialEntry, wallet, processedEntry]);

	const canEdit = useMemo(() => {
		return initialEntry && isWalletAuthor(wallet, initialEntry) && !isPending;
	}, [initialEntry, wallet, isPending]);

	// Poll for on-chain confirmation when pending
	useEffect(() => {
		if (!isPending) return;

		const pollInterval = setInterval(async () => {
			try {
				const entry = await getPendingEntry(address as Hex, Number(id));
				if (entry.onChainId) {
					clearInterval(pollInterval);
					router.replace(`/writer/${address}/${entry.onChainId}`);
				}
			} catch (error) {
				console.error("Error polling for entry confirmation:", error);
			}
		}, 3000);

		return () => clearInterval(pollInterval);
	}, [isPending, address, id, router]);

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
		setEditSubmitted(true);
		if (!editedContent) {
			return;
		}
		const compressedContent = await compress(editedContent);
		let versionedCompressedContent = `br:${compressedContent}`;
		if (encrypted) {
			const key = await getDerivedSigningKey(wallet);
			const encryptedContent = await encrypt(key, compressedContent);
			versionedCompressedContent = `enc:br:${encryptedContent}`;
		}
		const { signature, nonce, entryId, totalChunks, content } =
			await signUpdate(wallet, {
				entryId: Number(id),
				address: address as Hex,
				content: versionedCompressedContent,
			});
		await mutateAsyncEdit({
			address: address as Hex,
			id: entryId,
			signature,
			nonce,
			totalChunks,
			content,
		});
		awaitingRefreshRef.current = true;
		onEntryUpdate();
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
				return isWalletAuthor(wallet, processedEntry);
			}
			return true;
		}
		return false;
	}, [processedEntry, wallet]);

	if (!processedEntry) {
		return (
			<div className="flex-grow flex flex-col animate-pulse">
				<div className="flex-grow flex flex-col p-2 space-y-3">
					<div className="h-6 bg-neutral-700 rounded w-3/4" />
					<div className="h-4 bg-neutral-700 rounded w-full" />
					<div className="h-4 bg-neutral-700 rounded w-full" />
					<div className="h-4 bg-neutral-700 rounded w-5/6" />
					<div className="h-4 bg-neutral-700 rounded w-full" />
					<div className="h-4 bg-neutral-700 rounded w-2/3" />
					<div className="h-4 bg-neutral-700 rounded w-full" />
					<div className="h-4 bg-neutral-700 rounded w-4/5" />
				</div>
				<div className="flex items-end mt-3">
					<div className="space-y-1">
						<div className="h-4 bg-neutral-700 rounded w-32" />
						<div className="h-4 bg-neutral-700 rounded w-28" />
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex-grow flex flex-col">
			{!isEditing && (
				<div className="flex-grow flex flex-col relative">
					{canView && (
						<MarkdownRenderer
							markdown={processedEntry.decompressed ?? ""}
							className="border-[1px] border-transparent p-2"
						/>
					)}
					{!canView && (
						<div className="flex flex-col gap-2 justify-center items-center grow">
							<div className="text-sm text-neutral-600">
								<Logo className="w-8 h-8" />
							</div>
							<div className="text-lg text-neutral-600">Private</div>
						</div>
					)}
					{isEntryPrivate(processedEntry) && (
						<div className="absolute bottom-0 left-0">
							<Lock className="w-3.5 h-3.5 text-neutral-600" />
						</div>
					)}
					{isPending && (
						<div className="absolute bottom-0 right-0 flex items-center gap-1.5 text-neutral-600">
							<span className="text-xs">confirming</span>
							<Logo className="w-3.5 h-3.5 rotating" />
						</div>
					)}
				</div>
			)}
			<div
				className={cn("flex-grow flex-col relative", {
					flex: isEditing,
					hidden: !isEditing,
				})}
			>
				<MDX
					markdown={editedContent}
					onChange={setEditedContent}
					className="border border-primary border-dashed bg-neutral-900 text-secondary! flex-col grow flex w-full aspect-auto!"
					autoFocus={isEditing}
				/>
				<button
					type="button"
					onClick={() => setEncrypted?.(!encrypted)}
					className="hover:text-primary text-neutral-600 absolute bottom-3 left-2 z-20"
				>
					{encrypted ? (
						<Lock className="h-3.5 w-3.5" />
					) : (
						<Unlock className="h-3.5 w-3.5 ml-0.5" />
					)}
				</button>
				{isEditing && isEditPending && (
					<div
						className={cn(
							"absolute inset-0 flex flex-col items-center justify-between h-full z-20",
							{ "bg-red-700": deleteSubmitted },
							{ "bg-secondary": !deleteSubmitted },
						)}
					>
						<div
							className={cn(
								"w-full text-left break-words p-2 overflow-hidden",
								{ "text-red-900": deleteSubmitted },
								{ "text-primary": !deleteSubmitted },
							)}
						>
							<MarkdownRenderer markdown={editedContent} />
						</div>
						<div className="absolute inset-0 flex justify-center items-center">
							<Logo
								className={cn("w-8 h-8 rotating", {
									"text-red-900": deleteSubmitted,
									"text-primary": !deleteSubmitted,
								})}
							/>
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
					<div className="flex gap-1">
						<span className="text-neutral-600">
							by:{" "}
							<span className="text-neutral-600">
								{shortenAddress(processedEntry.author as Hex)}
							</span>
						</span>
					</div>
					<span className="text-neutral-600 bold">
						on: {format(new Date(processedEntry.createdAt), "MM/dd/yyyy")}
					</span>
				</div>
				{canEdit && (
					<div className="flex gap-2 justify-between">
						<div className="flex flex-col gap-1">
							<div className="flex gap-2">
								<button
									type="button"
									className={cn(
										"text-neutral-600 hover:text-secondary cursor-pointer",
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
											"text-green-400 hover:text-green-600 disabled:text-neutral-600",
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
										className="text-neutral-600 hover:text-red-700 cursor-pointer"
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
											const { signature, nonce } = await signRemove(wallet, {
												id: Number(id),
												address: address as Hex,
											});
											await mutateAsyncDelete({
												address: address as Hex,
												id: Number(id),
												signature,
												nonce,
											});
											setDeletedSubmitted(false);
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
