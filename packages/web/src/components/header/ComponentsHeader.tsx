"use client";

import Link from "next/link";
import { NavDropdown } from "../NavDropdown";

export function ComponentsHeader() {
	return (
		<div className="flex items-center justify-between">
			<div className="text-3xl transition-colors pr-0.5 text-primary flex items-center gap-1">
				<Link
					href="/home"
					className="text-secondary hover:text-primary transition-colors"
				>
					Writer
				</Link>
				<span className="text-primary">Components</span>
			</div>
			<div className="hidden md:block">
				<NavDropdown />
			</div>
		</div>
	);
}
