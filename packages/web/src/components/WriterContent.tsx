"use client";

import type { Entry } from "@/utils/api";
import { useState } from "react";
import CreateInput from "./CreateInput";
import EntryList from "./EntryList";

export default function WriterContent({
	writerTitle,
	writerAddress,
	entries,
}: {
	writerTitle: string;
	writerAddress: string;
	entries: Entry[];
}) {
	const [isExpanded, setIsExpanded] = useState(false);

	const handleSubmit = async (markdown: string) => {
		console.log("handleSubmit", markdown);
	};

	return (
		<div
			className={`relative ${isExpanded ? "h-full" : "grid gap-2"}`}
			style={
				!isExpanded
					? { gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }
					: undefined
			}
		>
			<CreateInput
				placeholder={`Write in ${writerTitle}`}
				onExpand={setIsExpanded}
				canExpand={true}
				onSubmit={handleSubmit}
			/>
			{!isExpanded && (
				<EntryList entries={entries} writerAddress={writerAddress} />
			)}
		</div>
	);
}
