"use client";

import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { NavigationContext } from "@/utils/context";
import { usePathname, useRouter } from "next/navigation";
import { useContext } from "react";
import { FiArrowLeft } from "react-icons/fi";

export function BackButton({ writerAddress }: { writerAddress: string }) {
	const pathname = usePathname();
	const router = useRouter();
	const isLoggedIn = useIsLoggedIn();
	const { writerCameFromExplore } = useContext(NavigationContext);
	const segments = pathname.split("/").filter(Boolean);

	const isWriterRoute = segments[0] === "writer";
	const currentWriterAddress = segments[1] ?? writerAddress;
	const normalizedWriterAddress = currentWriterAddress.toLowerCase();
	const isEntryPage = isWriterRoute && segments.length === 3;

	const handleBack = () => {
		if (isEntryPage) {
			router.push(`/writer/${currentWriterAddress}`);
			return;
		}

		if (!isLoggedIn || writerCameFromExplore[normalizedWriterAddress]) {
			router.push("/explore");
			return;
		}

		router.push("/home");
	};

	return (
		<button type="button" onClick={handleBack} className="cursor-pointer">
			<FiArrowLeft className="w-7 h-7 text-primary hover:text-secondary transition-colors" />
		</button>
	);
}
