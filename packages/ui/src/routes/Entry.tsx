import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import type { Hex } from "viem";
import { Button } from "../components/Button";
import { Editor } from "../components/Editor";
import { MD } from "../components/MD";
import { deleteEntry, getWriter } from "../utils/api";
import { useFirstWallet } from "../utils/hooks";
import { signDelete } from "../utils/signer";

export default function Entry() {
	const wallet = useFirstWallet();
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
				<Editor
					className="border-[1px] border-lime border-dashed p-2 bg-neutral-900"
					content={content}
					onChange={(editor) =>
						setContent(editor.storage.markdown.getMarkdown())
					}
				/>
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
								className="hover:bg-lime hover:text-black"
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
										await mutateAsync({
											address: address as Hex,
											id: Number(id),
											signature,
											nonce,
										});
									}}
								>
									Confirm Delete
								</Button>
							)}
						</>
					)}
				</div>
			)}
		</div>
	);
}
