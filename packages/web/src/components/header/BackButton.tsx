"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";

export function BackButton({ writerAddress }: { writerAddress: string }) {
	const pathname = usePathname();

	// Check if we're on an entry page (has 3 segments: /writer/:address/:entryId)
	const isEntryPage = pathname.split("/").filter(Boolean).length === 3;

	const backHref = isEntryPage ? `/writer/${writerAddress}` : "/home";

	return (
		<Link href={backHref}>
			<FiArrowLeft className="w-7 h-7" />
		</Link>
	);
}
