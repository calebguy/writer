import CreateInput from "@/components/CreateInput";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { getWriter } from "@/utils/api";
import Link from "next/link";
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
			{writer.entries?.map((entry) => (
				<Link
					href={`/writer/${writer.address}/${entry.id}`}
					key={entry.id}
					className="aspect-square bg-neutral-900 flex flex-col justify-between px-2 pt-2 pb-0.5"
				>
					<MarkdownRenderer
						markdown={entry.decompressed ?? entry.raw}
						className="text-white"
					/>
				</Link>
			))}
		</div>
	);
}
