"use client";

import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiPlus } from "react-icons/fi";
import { NavDropdown } from "../NavDropdown";

export function HomeHeader() {
	const { authenticated } = usePrivy();
	const pathname = usePathname();
	const isCreatePlacePage = pathname === "/place/new";

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
				{authenticated && !isCreatePlacePage && (
					<Link
						href="/place/new"
						aria-label="Create writer"
						className="lg:hidden text-primary hover:opacity-80 transition-opacity cursor-pointer"
					>
						<FiPlus className="h-6 w-6" />
					</Link>
				)}
				<div className="hidden lg:block">
					<NavDropdown />
				</div>
			</div>
		</div>
	);
}
