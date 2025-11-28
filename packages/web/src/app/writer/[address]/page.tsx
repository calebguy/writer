import WriterContent from "@/components/WriterContent";
import { getWriter } from "@/utils/api";
import type { Hex } from "viem";

export default async function Writer({
	params,
}: {
	params: Promise<{ address: string }>;
}) {
	const { address } = await params;
	const writer = await getWriter(address as Hex);

	return (
		<WriterContent
			writerTitle={writer.title}
			writerAddress={writer.address}
			entries={writer.entries}
		/>
	);
}
