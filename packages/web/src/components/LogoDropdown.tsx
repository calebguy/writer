"use client";

import { clearAllCachedKeys } from "@/utils/keyCache";
import {
	type ThemeMode,
	applyThemeMode,
	getStoredThemeMode,
	setStoredThemeMode,
	subscribeSystemThemeChange,
} from "@/utils/theme";
import { useLogin, usePrivy } from "@privy-io/react-auth";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IoMdMoon, IoMdSunny } from "react-icons/io";
import { RiComputerFill } from "react-icons/ri";
import { ColorModal } from "./ColorModal";
import { queryClient } from "./Providers";
import { Dropdown, DropdownItem } from "./dsl/Dropdown";

export function LogoDropdown() {
	const { logout, authenticated } = usePrivy();
	const { login } = useLogin({
		onComplete: () => {
			window.location.reload();
		},
	});
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

	const setTheme = (mode: ThemeMode) => {
		setThemeMode(mode);
		applyThemeMode(mode);
		setStoredThemeMode(mode);
	};

	return (
		<>
			<Dropdown
				trigger={
					// <Logo className="logo-dropdown-trigger h-8 transition-colors text-primary hover:text-secondary" />
					<Image
						src={"/images/relics/relic-5.png"}
						alt={"dropdown trigger"}
						width={38}
						height={38}
						className="transition-transform duration-300 hover:rotate-12 active:scale-90 active:rotate-12 dark:invert"
					/>
				}
			>
				<DropdownItem onClick={() => router.push("/explore")}>
					Explore
				</DropdownItem>
				{authenticated && (
					<>
						<DropdownItem onClick={() => router.push("/saved")}>Saved</DropdownItem>
						<DropdownItem onClick={() => setOpen(true)}>
							<div className="flex items-center justify-between gap-2 w-full">
								<span>Color</span>
								<span className="w-2 h-2 bg-primary" />
							</div>
						</DropdownItem>
					</>
				)}
				{authenticated ? (
					<DropdownItem
						onClick={() =>
							logout().then(() => {
								clearAllCachedKeys();
								queryClient.clear();
								window.location.href = "/";
							})
						}
					>
						Leave
					</DropdownItem>
				) : (
					<DropdownItem onClick={() => login()}>
						Login
					</DropdownItem>
				)}
				<div className="logo-theme-switcher mt-1 pt-1 border-t border-neutral-800/60">
					<button
						type="button"
						aria-label="Use light theme"
						title="Light"
						className="logo-theme-icon cursor-pointer"
						data-active={themeMode === "light"}
						onClick={() => setTheme("light")}
					>
						<IoMdSunny className="h-3.5 w-3.5" />
					</button>
					<button
						type="button"
						aria-label="Use dark theme"
						title="Dark"
						className="logo-theme-icon cursor-pointer"
						data-active={themeMode === "dark"}
						onClick={() => setTheme("dark")}
					>
						<IoMdMoon className="h-3.5 w-3.5" />
					</button>
					<button
						type="button"
						aria-label="Use system theme"
						title="System"
						className="logo-theme-icon cursor-pointer"
						data-active={themeMode === "system"}
						onClick={() => setTheme("system")}
					>
						<RiComputerFill className="h-3.5 w-3.5" />
					</button>
				</div>
			</Dropdown>
			<ColorModal open={open} onClose={() => setOpen(false)} />
		</>
	);
}
