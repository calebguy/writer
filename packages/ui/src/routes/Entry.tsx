import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Hex } from "viem";
import { Button, ButtonVariant } from "../components/Button";
import { Editor } from "../components/Editor";
import { MD } from "../components/MD";
import { Blob } from "../components/icons/Blob";
import { queryClient } from "../main";
import { deleteEntry, getWriter } from "../utils/api";
import { useFirstWallet } from "../utils/hooks";
import { signDelete } from "../utils/signer";

export default function Entry() {
	const wallet = useFirstWallet();
	const navigate = useNavigate();
	const { address, id } = useParams();
	const [isEditing, setIsEditing] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
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

	return (
		<div className="flex-grow flex flex-col">
			{!isEditing && (
				<MD className="border-[1px] border-transparent p-2">
					{entry?.content}
				</MD>
			)}
			{isEditing && (
				<div className="flex-grow flex flex-col relative">
					<Editor
						className="border-[1px] border-lime border-dashed p-2 bg-neutral-900"
						content={content}
						onChange={(editor) =>
							setContent(editor.storage.markdown.getMarkdown())
						}
					/>
					{isPending && (
						<div className="absolute w-full h-full flex justify-center items-center bg-red-700 z-20">
							<Blob className="w-6 h-6 rotating text-black" />
						</div>
					)}
				</div>
			)}
			{canEdit && (
				<div className="mt-2 flex gap-2 justify-between">
					<div className="flex gap-2">
						<Button
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
							{isEditing ? "Cancel" : "Edit"}
						</Button>
						{isEditing && (
							<Button
								variant={ButtonVariant.LimeHover}
								disabled={!isContentChanged}
								onClick={() => setIsEditing(false)}
							>
								Save
							</Button>
						)}
					</div>
					{isEditing && (
						<>
							{!isDeleting && (
								<Button
									className="bg-neutral-800 hover:bg-red-700"
									onClick={() => setIsDeleting(true)}
								>
									Delete
								</Button>
							)}
							{isDeleting && (
								<Button
									className="bg-red-700 hover:bg-red-900"
									onClick={async () => {
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
									}}
								>
									Do it
								</Button>
							)}
						</>
					)}
				</div>
			)}
		</div>
	);
}
