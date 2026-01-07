"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";

export function BackButton({ writerAddress }: { writerAddress: string }) {
	const pathname = usePathname();
	const segments = pathname.split("/").filter(Boolean);

	// Check if we're on an entry page:
	// - /writer/:address/:entryId (3 segments)
	// - /writer/:address/pending/:id (4 segments)
	const isEntryPage =
		segments.length === 3 || (segments.length === 4 && segments[2] === "pending");

	const backHref = isEntryPage ? `/writer/${writerAddress}` : "/home";

	return (
		<Link href={backHref}>
			<FiArrowLeft className="w-7 h-7" />
		</Link>
	);
}
