"use client";

import { usePathname, useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";

export function BackButton({ writerAddress }: { writerAddress: string }) {
	const pathname = usePathname();
	const router = useRouter();
	const segments = pathname.split("/").filter(Boolean);

	// Check if we're on an entry page:
	// - /writer/:address/:entryId (3 segments)
	// - /writer/:address/pending/:id (4 segments)
	const isEntryPage =
		segments.length === 3 ||
		(segments.length === 4 && segments[2] === "pending");

	const handleBack = () => {
		// If there's no history to go back to, navigate to the appropriate fallback
		if (window.history.length <= 1) {
			if (isEntryPage) {
				router.push(`/writer/${writerAddress}`);
			} else {
				router.push("/home");
			}
		} else {
			router.back();
		}
	};

	return (
		<button type="button" onClick={handleBack} className="cursor-pointer">
			<FiArrowLeft className="w-7 h-7 text-primary hover:text-secondary transition-colors" />
		</button>
	);
}
