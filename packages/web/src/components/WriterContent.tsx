"use client";

import { useState } from "react";
import type { Entry } from "@/utils/api";
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

	return (
		<div
			className="grid gap-2"
			style={{
				gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
			}}
		>
			<CreateInput
				placeholder={`Write in ${writerTitle}`}
				onExpand={setIsExpanded}
				canExpand={true}
			/>
			{!isExpanded && (
				<EntryList entries={entries} writerAddress={writerAddress} />
			)}
		</div>
	);
}
