"use client";

import { useHomeChrome } from "@/components/home/HomeChromeContext";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { FiPlus } from "react-icons/fi";
import { NavDropdown } from "../NavDropdown";

export function HomeHeader() {
	const { authenticated } = usePrivy();
	const pathname = usePathname();
	const router = useRouter();
	const isCreatePlacePage = pathname === "/place/new";
	const homeChrome = useHomeChrome();

	useEffect(() => {
		if (!authenticated || isCreatePlacePage) return;
		router.prefetch("/place/new");
		void import("../markdown/MDX");
	}, [authenticated, isCreatePlacePage, router]);

	return (
		<div className="flex items-center justify-between">
			{authenticated ? (
				<div className="text-3xl transition-colors pr-0.5 text-primary">
					Writer
				</div>
			) : (
				<Link
					href="/"
					className="text-3xl transition-colors pr-0.5 text-primary"
				>
					Writer
				</Link>
			)}
			<div className="flex items-center gap-2">
				{authenticated && !isCreatePlacePage && !homeChrome?.isEmptyHome && (
					<Link
						href="/place/new"
						aria-label="Create writer"
						prefetch
						onTouchStart={() => {
							router.prefetch("/place/new");
							void import("../markdown/MDX");
						}}
						onPointerEnter={() => {
							router.prefetch("/place/new");
							void import("../markdown/MDX");
						}}
						className="md:hidden text-primary hover:opacity-80 transition-opacity cursor-pointer"
					>
						<FiPlus className="h-6 w-6" />
					</Link>
				)}
				<div className="hidden md:block">
					<NavDropdown />
				</div>
			</div>
		</div>
	);
}
