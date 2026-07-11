"use client";

import { useUnsavedChangesNavigation } from "@/hooks/useUnsavedChangesWarning";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { NavigationContext } from "@/utils/context";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useContext, useEffect } from "react";
import { FiArrowLeft } from "react-icons/fi";
import { Close } from "../icons/Close";

export function BackButton({ writerAddress }: { writerAddress: string }) {
	const pathname = usePathname();
	const router = useRouter();
	const isLoggedIn = useIsLoggedIn();
	const { writerCameFromExplore } = useContext(NavigationContext);
	const confirmNavigation = useUnsavedChangesNavigation();
	const segments = pathname.split("/").filter(Boolean);

	const isWriterRoute = segments[0] === "writer";
	const currentWriterAddress = segments[1] ?? writerAddress;
	const normalizedWriterAddress = currentWriterAddress.toLowerCase();
	const isEntryPage = isWriterRoute && segments.length >= 3;
	const isCreateEntryPage = isEntryPage && segments[2] === "new";
	const isEditEntryPage = isEntryPage && segments[3] === "edit";
	const backHref = isEditEntryPage
		? `/writer/${currentWriterAddress}/${segments[2]}`
		: isEntryPage
			? `/writer/${currentWriterAddress}`
			: !isLoggedIn || writerCameFromExplore[normalizedWriterAddress]
				? "/explore"
				: "/home";

	const prefetchBackTarget = useCallback(() => {
		router.prefetch(backHref);
	}, [backHref, router]);

	useEffect(() => {
		prefetchBackTarget();
	}, [prefetchBackTarget]);


	const handleBack = async () => {
		if (!(await confirmNavigation())) return;
		router.push(backHref);
	};

	return (
		<button
			type="button"
			onClick={handleBack}
			onFocus={prefetchBackTarget}
			onPointerEnter={prefetchBackTarget}
			onTouchStart={prefetchBackTarget}
			className="cursor-pointer"
		>
			{isCreateEntryPage || isEditEntryPage ? (
				<Close className="w-7 h-7 text-primary hover:text-secondary transition-colors" />
			) : (
				<FiArrowLeft className="w-7 h-7 text-primary hover:text-secondary transition-colors" />
			)}
		</button>
	);
}
