import Entry from "@/components/Entry";
import { getPendingEntry, getWriter } from "@/utils/api";
import { revalidatePath } from "next/cache";
import type { Hex } from "viem";

export default async function PendingEntryPage({
	params,
}: {
	params: Promise<{ address: string; id: string }>;
}) {
	const { address, id } = await params;
	const [entry, writer] = await Promise.all([
		getPendingEntry(address as Hex, Number(id)),
		getWriter(address as Hex),
	]);

	return (
		<div className="flex-grow flex flex-col">
			<Entry
				initialEntry={entry}
				address={address}
				id={id}
				isPending
				legacyDomain={writer?.legacyDomain ?? true}
				onEntryUpdate={async () => {
					"use server";
					revalidatePath(`/writer/${address}/pending/${id}`);
				}}
			/>
		</div>
	);
}
