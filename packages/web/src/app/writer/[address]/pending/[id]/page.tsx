import Entry from "@/components/Entry";
import { getPendingEntry } from "@/utils/api";
import { revalidatePath } from "next/cache";
import type { Hex } from "viem";

export default async function PendingEntryPage({
	params,
}: {
	params: Promise<{ address: string; id: string }>;
}) {
	const { address, id } = await params;
	const entry = await getPendingEntry(address as Hex, Number(id));

	return (
		<div className="flex-grow flex flex-col">
			<Entry
				initialEntry={entry}
				address={address}
				id={id}
				isPending
				onEntryUpdate={async () => {
					"use server";
					revalidatePath(`/writer/${address}/pending/${id}`);
				}}
			/>
		</div>
	);
}
