import Entry from "@/components/Entry";
import { getEntry } from "@/utils/api";
import { revalidatePath } from "next/cache";
import type { Hex } from "viem";

export default async function EntryPage({
	params,
}: {
	params: Promise<{ address: string; id: string }>;
}) {
	const { address, id } = await params;
	console.log(address, id);
	const entry = await getEntry(address as Hex, Number(id));
	console.log(entry);

	return (
		<div className="flex-grow flex flex-col">
			<Entry
				initialEntry={entry}
				address={address}
				id={id}
				onEntryUpdate={async () => {
					"use server";
					revalidatePath(`/writer/${address}/${id}`);
				}}
			/>
		</div>
	);
}
