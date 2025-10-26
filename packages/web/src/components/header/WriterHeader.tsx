import { getWriter } from "@/utils/api";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import type { Hex } from "viem";
import { LogoDropdown } from "../LogoDropdown";
import { MarkdownRenderer } from "../MarkdownRenderer";
export async function WriterHeader({
	address,
}: {
	address: string;
}) {
	const writer = await getWriter(address as Hex);
	return (
		<div className="flex items-center justify-between">
			<div className="flex items-center gap-2 text-primary">
				<Link href="/home">
					<FiArrowLeft className="w-7 h-7" />
				</Link>
				<MarkdownRenderer markdown={writer.title} className="text-primary" />
			</div>

			<LogoDropdown />
		</div>
	);
}
