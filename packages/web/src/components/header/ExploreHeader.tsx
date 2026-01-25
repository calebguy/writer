"use client";

import Link from "next/link";
import { LogoDropdown } from "../LogoDropdown";

export function ExploreHeader() {
	return (
		<div className="flex items-center justify-between">
			<div className="text-3xl transition-colors pr-0.5 text-primary flex items-center gap-1">
				<Link
					href="/"
					className="text-secondary hover:text-primary transition-colors"
				>
					Writer
				</Link>
				<span className="text-primary">Explore</span>
			</div>
			<LogoDropdown />
		</div>
	);
}
