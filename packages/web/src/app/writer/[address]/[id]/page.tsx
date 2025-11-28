import Entry from "@/components/Entry";
import { getEntry } from "@/utils/api";
import type { Hex } from "viem";

export default async function EntryPage({
	params,
}: {
	params: Promise<{ address: string; id: string }>;
}) {
	const { address, id } = await params;
	console.log(address, id);
	const entry = await getEntry(address as Hex, Number(id));

	return (
		<div className="flex-grow flex flex-col">
			<Entry
				initialEntry={entry}
				address={address}
				id={id}
				onEntryUpdate={async () => {
					"use server";
					// This will trigger a revalidation of the page
				}}
			/>
		</div>
	);
}
