import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Hex } from "viem";
import { Editor } from "../components/Editor";
import { MD } from "../components/MD";
import { Blob } from "../components/icons/Blob";
import { WriterContext } from "../layouts/App.layout";
import { queryClient } from "../main";
import { deleteEntry, getWriter } from "../utils/api";
import { cn } from "../utils/cn";
import { useFirstWallet } from "../utils/hooks";
import { signDelete } from "../utils/signer";
import { shortenAddress } from "../utils/utils";

export default function Entry() {
	const wallet = useFirstWallet();
	const navigate = useNavigate();
	const { address, id } = useParams();
	const { setWriter } = useContext(WriterContext);
	const [isEditing, setIsEditing] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [deleteClicked, setDeleteClicked] = useState(false);
	const { data } = useQuery({
		queryFn: () => getWriter(address as Hex),
		queryKey: ["get-writer", address],
		enabled: !!address,
	});

	const { mutateAsync, isPending } = useMutation({
		mutationFn: deleteEntry,
		mutationKey: ["delete-entry", address, id],
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["get-writer", address],
			});
			navigate(`/writer/${address}`);
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

	const [content, setContent] = useState(entry?.content);
	const isContentChanged = useMemo(() => {
		return content !== entry?.content;
	}, [content, entry?.content]);

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
						content={content}
						onChange={(editor) =>
							setContent(editor.storage.markdown.getMarkdown())
						}
					/>
					{(isPending || deleteClicked) && (
						<div className="absolute w-full h-full flex justify-center items-center bg-red-700 z-20">
							<Blob className="w-8 h-8 rotating text-red-900" />
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
										setContent(entry?.content);
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
									onClick={() => setIsEditing(false)}
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
											setDeleteClicked(true);
											const { signature, nonce } = await signDelete(wallet, {
												id: Number(id),
												address: address as Hex,
											});
											mutateAsync({
												address: address as Hex,
												id: Number(id),
												signature,
												nonce,
											});
											setDeleteClicked(false);
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
