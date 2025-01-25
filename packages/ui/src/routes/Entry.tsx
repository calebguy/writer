import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Hex } from "viem";
import { queryClient } from "../app";
import { Editor } from "../components/Editor";
import { MD } from "../components/MD";
import { Blob } from "../components/icons/Blob";
import { WriterContext } from "../context";
import { deleteEntry, editEntry, getWriter } from "../utils/api";
import { cn } from "../utils/cn";
import { useFirstWallet } from "../utils/hooks";
import { signDelete, signEdit } from "../utils/signer";
import { shortenAddress } from "../utils/utils";

export default function Entry() {
	const wallet = useFirstWallet();
	const navigate = useNavigate();
	const { address, id } = useParams();
	const { setWriter } = useContext(WriterContext);
	const [isEditing, setIsEditing] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [deleteSubmitted, setDeletedSubmitted] = useState(false);
	const [editSubmitted, setEditSubmitted] = useState(false);
	const { data } = useQuery({
		queryFn: () => getWriter(address as Hex),
		queryKey: ["get-writer", address],
		enabled: !!address,
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
		if (data) {
			setWriter(data);
		}
	}, [data, setWriter]);

	const entry = useMemo(() => {
		return data?.entries.find((e) => e.onChainId === id);
	}, [data, id]);
	const canEdit = useMemo(() => {
		return data?.managers.includes(wallet?.address);
	}, [data?.managers, wallet?.address]);

	const [editedContent, setEditedContent] = useState(entry?.content);
	const isContentChanged = useMemo(() => {
		return editedContent !== entry?.content;
	}, [editedContent, entry?.content]);

	const isEditPending = useMemo(() => {
		return isPendingDelete || isPendingEdit || deleteSubmitted || editSubmitted;
	}, [isPendingDelete, isPendingEdit, deleteSubmitted, editSubmitted]);

	if (!entry) {
		return <div>Entry not found</div>;
	}
	return (
		<div className="flex-grow flex flex-col">
			{!isEditing && (
				<MD className="border-[1px] border-transparent p-2">{entry.content}</MD>
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
					{isEditPending && (
						<div
							className={cn(
								"absolute w-full h-full flex justify-center items-center z-20",
								{ "bg-red-700": isPendingDelete },
								{ "bg-primary": isPendingEdit },
							)}
						>
							<Blob
								className={cn("w-8 h-8 rotating", {
									"text-red-900": isPendingDelete,
									"text-secondary": isPendingEdit,
								})}
							/>
						</div>
					)}
				</div>
			)}
			<div
				className={cn("flex items-end mt-1", {
					"justify-between": canEdit,
					"justify-end": !canEdit,
				})}
			>
				{canEdit && (
					<div className="mt-2 flex gap-2 justify-between">
						<div className="flex gap-2">
							<button
								type="button"
								className={cn("text-neutral-600 hover:text-secondary")}
								onClick={() => {
									if (isEditing) {
										setEditedContent(entry?.content);
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
										const { signature, nonce, entryId, totalChunks, content } =
											await signEdit(wallet, {
												entryId: Number(id),
												address: address as Hex,
												content: editedContent as string,
											});
										mutateAsyncEdit({
											address: address as Hex,
											id: entryId,
											signature,
											nonce,
											totalChunks,
											content,
										});
										setEditSubmitted(false);
										setIsEditing(false);
									}}
									className="text-primary disabled:text-neutral-600 hover:text-secondary"
								>
									save
								</button>
							)}
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
											const { signature, nonce } = await signDelete(wallet, {
												id: Number(id),
												address: address as Hex,
											});
											mutateAsyncDelete({
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
				<div className="flex">
					<Link
						to={`/account/${entry.author}`}
						className="text-primary underline cursor-pointer mr-1"
					>
						{shortenAddress(entry.author as Hex)}
					</Link>
					<span className="text-neutral-600 bold">
						on {format(new Date(entry.createdAt), "MM/dd/yyyy")}
					</span>
				</div>
			</div>
		</div>
	);
}
