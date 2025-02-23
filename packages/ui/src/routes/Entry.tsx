import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Hex } from "viem";
import { queryClient } from "../app";
import { Blob } from "../components/icons/Blob";
import { Lock } from "../components/icons/Lock";
import { Unlock } from "../components/icons/Unlock";
import { Editor } from "../components/markdown/Editor";
import { MD } from "../components/markdown/MD";
import type { Entry as EntryType } from "../utils/api";
import { deleteEntry, editEntry, getEntry } from "../utils/api";
import { cn } from "../utils/cn";
import { useFirstWallet } from "../utils/hooks";
import { getDerivedSigningKey, signRemove, signUpdate } from "../utils/signer";
import {
	compress,
	encrypt,
	isEntryPrivate,
	isWalletAuthor,
	processEntry,
	shortenAddress,
	sleep,
} from "../utils/utils";

export default function Entry() {
	const wallet = useFirstWallet();
	const navigate = useNavigate();
	const { address, id } = useParams();
	const [isEditing, setIsEditing] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [deleteSubmitted, setDeletedSubmitted] = useState(false);
	const [editSubmitted, setEditSubmitted] = useState(false);
	const [processedEntry, setProcessedEntry] = useState<EntryType | null>(null);
	const [encrypted, setEncrypted] = useState(false);
	const { data: entry, refetch: refetchEntry } = useQuery({
		queryFn: () => getEntry(address as Hex, Number(id)),
		queryKey: ["get-entry", address, id],
		enabled: !!address && !!id,
	});

	const { mutateAsync: mutateAsyncDelete, isPending: isPendingDelete } =
		useMutation({
			mutationFn: deleteEntry,
			mutationKey: ["delete-entry", address, id],
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: ["get-writer", address],
				});
				navigate(`/writer/${address}`);
			},
		});

	const { mutateAsync: mutateAsyncEdit, isPending: isPendingEdit } =
		useMutation({
			mutationFn: editEntry,
			mutationKey: ["edit-entry", address, id],
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: ["get-writer", address],
				});
			},
		});

	useEffect(() => {
		async function loadProcessedEntry() {
			await sleep(200);
			if (entry) {
				if (isEntryPrivate(entry)) {
					setEncrypted(true);
					if (isWalletAuthor(wallet, entry)) {
						const key = await getDerivedSigningKey(wallet);
						const processed = await processEntry(key, entry);
						setProcessedEntry(processed);
						setEditedContent(processed.decompressed);
					} else {
						setProcessedEntry(entry);
						setEditedContent(entry.decompressed);
					}
				} else {
					setProcessedEntry(entry);
					setEditedContent(entry.decompressed);
				}
			}
		}
		loadProcessedEntry();
	}, [entry, wallet]);

	const canEdit = useMemo(() => {
		return entry && isWalletAuthor(wallet, entry);
	}, [entry, wallet]);

	const [editedContent, setEditedContent] = useState(
		processedEntry?.decompressed,
	);
	const isContentChanged = useMemo(() => {
		return (
			editedContent !== processedEntry?.decompressed ||
			(processedEntry && encrypted !== isEntryPrivate(processedEntry))
		);
	}, [editedContent, processedEntry, encrypted]);

	const isEditPending = useMemo(() => {
		return isPendingDelete || isPendingEdit || deleteSubmitted || editSubmitted;
	}, [isPendingDelete, isPendingEdit, deleteSubmitted, editSubmitted]);

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
			<div className="flex-grow flex flex-col">
				<div className="flex-grow flex flex-col relative">
					<div className="absolute w-full h-full flex justify-center items-center">
						<Blob className="w-8 h-8 rotating text-primary" />
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
						<MD className="border-[1px] border-transparent p-2">
							{processedEntry.decompressed}
						</MD>
					)}
					{!canView && (
						<div className="flex flex-col gap-2 justify-center items-center grow">
							<div className="text-sm text-neutral-600">
								<Blob className="w-8 h-8" />
							</div>
							<div className="text-lg text-neutral-600">Private</div>
						</div>
					)}
					{isEntryPrivate(processedEntry) && (
						<div className="absolute bottom-0 left-0">
							<Lock className="w-3.5 h-3.5 text-neutral-600" />
						</div>
					)}
				</div>
			)}
			{isEditing && (
				<div className="flex-grow flex flex-col relative">
					<Editor
						className="border-[1px] border-primary border-dashed p-2 bg-neutral-900"
						content={editedContent}
						onChange={(editor) =>
							setEditedContent(editor.storage.markdown.getMarkdown())
						}
					/>
					<button
						type="button"
						onClick={() => setEncrypted?.(!encrypted)}
						className="hover:text-primary text-neutral-600 absolute bottom-3 left-2"
					>
						{encrypted ? (
							<Lock className="h-3.5 w-3.5" />
						) : (
							<Unlock className="h-3.5 w-3.5 ml-0.5" />
						)}
					</button>
					{isEditPending && (
						<div
							className={cn(
								"absolute w-full h-full flex justify-center items-center z-20",
								{ "bg-red-700": isPendingDelete },
								{ "bg-primary": isEditPending },
							)}
						>
							<Blob
								className={cn("w-8 h-8 rotating", {
									"text-red-900": isPendingDelete,
									"text-secondary": isEditPending,
								})}
							/>
						</div>
					)}
				</div>
			)}

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
									className={cn("text-neutral-600 hover:text-secondary")}
									onClick={() => {
										if (isEditing) {
											setEditedContent(processedEntry?.decompressed);
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
										onClick={async () => {
											setEditSubmitted(true);
											if (!editedContent) {
												return;
											}
											const compressedContent = await compress(editedContent);
											let versionedCompressedContent = `br:${compressedContent}`;
											if (encrypted) {
												const key = await getDerivedSigningKey(wallet);
												const encrypted = await encrypt(key, compressedContent);
												versionedCompressedContent = `enc:br:${encrypted}`;
											}
											const {
												signature,
												nonce,
												entryId,
												totalChunks,
												content,
											} = await signUpdate(wallet, {
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
											await refetchEntry();
											await sleep(250);
											setEditSubmitted(false);
											setIsEditing(false);
										}}
										className="text-primary disabled:text-neutral-600 hover:text-secondary"
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
										className="text-neutral-600 hover:text-red-700"
										onClick={() => setIsDeleting(true)}
									>
										delete
									</button>
								)}
								{isDeleting && (
									<button
										type="button"
										className="text-red-700 hover:text-red-900"
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
