"use client";

import { LogoDropdown } from "../LogoDropdown";

export function HomeHeader() {
	return (
		<div className="flex items-center justify-between">
			<div className="text-3xl transition-colors pr-0.5 text-primary">
				Writer
			</div>
			<LogoDropdown />
		</div>
	);
}
