import { getWriter } from "@/utils/api";
import type { Hex } from "viem";
import { LogoDropdown } from "../LogoDropdown";
import { MarkdownRenderer } from "../MarkdownRenderer";
import { BackButton } from "./BackButton";

export async function WriterHeader({
	address,
}: {
	address: string;
}) {
	const writer = await getWriter(address as Hex);
	return (
		<div className="flex items-center justify-between">
			<div className="flex items-center gap-2 text-primary">
				<BackButton writerAddress={address} />
				<MarkdownRenderer
					markdown={writer.title}
					className="text-primary"
				/>
			</div>

			<LogoDropdown />
		</div>
	);
}
