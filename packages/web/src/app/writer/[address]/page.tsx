import CreateInput from "@/components/CreateInput";
import EntryList from "@/components/EntryList";
import { getWriter } from "@/utils/api";
import type { Hex } from "viem";

export default async function Writer({
	params,
}: {
	params: { address: string };
}) {
	const { address } = params;
	const writer = await getWriter(address as Hex);

	return (
		<div
			className="grid gap-2"
			style={{
				gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
			}}
		>
			<CreateInput placeholder={`Write in ${writer.title}`} />
			<EntryList entries={writer.entries} writerAddress={writer.address} />
		</div>
	);
}
