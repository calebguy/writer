import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import type { Hex } from "viem";
import { Button } from "../components/Button";
import { Editor } from "../components/Editor";
import { MD } from "../components/MD";
import { getWriter } from "../utils/api";
import { useFirstWallet } from "../utils/hooks";

export default function Entry() {
	const wallet = useFirstWallet();
	const { address, id } = useParams();
	const [isEditing, setIsEditing] = useState(false);
	const { data } = useQuery({
		queryFn: () => getWriter(address as Hex),
		queryKey: ["get-writer", address],
		enabled: !!address,
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
			{!isEditing && <MD>{entry?.content}</MD>}
			{isEditing && (
				<Editor
					content={content}
					onChange={(editor) =>
						setContent(editor.storage.markdown.getMarkdown())
					}
				/>
			)}
			{canEdit && (
				<div>
					<Button onClick={() => setIsEditing(!isEditing)}>
						{isEditing ? "Cancel" : "Edit"}
					</Button>
					{isEditing && (
						<Button disabled={!isContentChanged} onClick={() => setIsEditing(false)}>Save</Button>
					)}
				</div>
			)}
		</div>
	);
}
