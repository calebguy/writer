"use client";

import { clearAllCachedKeys } from "@/utils/keyCache";
import {
	applyThemeMode,
	type ThemeMode,
	getStoredThemeMode,
	setStoredThemeMode,
	subscribeSystemThemeChange,
} from "@/utils/theme";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ColorModal } from "./ColorModal";
import { Dropdown, DropdownItem } from "./dsl/Dropdown";
import { Logo } from "./icons/Logo";

export function LogoDropdown() {
	const { logout } = usePrivy();
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [themeMode, setThemeMode] = useState<ThemeMode>("system");

	useEffect(() => {
		if (typeof window === "undefined") return;
		const initialMode = getStoredThemeMode();
		setThemeMode(initialMode);
		applyThemeMode(initialMode);
	}, []);

	useEffect(() => {
		if (themeMode !== "system") return;
		return subscribeSystemThemeChange(() => {
			applyThemeMode("system");
		});
	}, [themeMode]);

	const cycleThemeMode = () => {
		const next: ThemeMode =
			themeMode === "system"
				? "light"
				: themeMode === "light"
					? "dark"
					: "system";
		setThemeMode(next);
		applyThemeMode(next);
		setStoredThemeMode(next);
	};

	const themeModeLabel =
		themeMode === "system"
			? "System"
			: themeMode === "light"
				? "Light"
				: "Dark";

	return (
		<>
			<Dropdown
				trigger={
					<Logo className="logo-dropdown-trigger h-8 transition-colors text-primary hover:text-secondary" />
				}
			>
				<DropdownItem onClick={() => router.push("/explore")}>
					Explore
				</DropdownItem>
				<DropdownItem onClick={() => setOpen(true)}>
					<div className="flex items-center justify-between gap-2 w-full">
						<span>Color</span>
						<span className="w-2 h-2 bg-primary" />
					</div>
				</DropdownItem>
				<DropdownItem onClick={cycleThemeMode}>
					<div className="flex items-center justify-between gap-2 w-full">
						<span>Theme</span>
						<span className="logo-dropdown-meta text-xs text-neutral-500">
							{themeModeLabel}
						</span>
					</div>
				</DropdownItem>
				<DropdownItem
					onClick={() =>
						logout().then(() => {
							clearAllCachedKeys();
							window.location.href = "/";
						})
					}
				>
					Leave
				</DropdownItem>
			</Dropdown>
			<ColorModal open={open} onClose={() => setOpen(false)} />
		</>
	);
}
