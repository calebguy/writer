"use client";

import { clearAllCachedKeys } from "@/utils/keyCache";
import {
	type ThemeMode,
	applyThemeMode,
	getStoredThemeMode,
	setStoredThemeMode,
	subscribeSystemThemeChange,
} from "@/utils/theme";
import { usePrivy } from "@privy-io/react-auth";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { IoExit } from "react-icons/io5";
import { ColorDrawer } from "../ColorDrawer";
import { queryClient } from "../Providers";

const VISIBLE_PATHS = new Set(["/home", "/explore", "/saved", "/writer"]);

function isRouteActive(pathname: string, target: string) {
	return pathname === target || pathname.startsWith(`${target}/`);
}

function navIconClass(active: boolean) {
	return active
		? "cursor-pointer text-primary bg-primary/15 dark:bg-primary/20"
		: "cursor-pointer text-neutral-700 dark:text-neutral-300 hover:text-primary";
}

export function MobileBottomNav() {
	const pathname = usePathname();
	const router = useRouter();
	const { logout } = usePrivy();
	const [showSubMenu, setShowSubMenu] = useState(false);
	const [showColorDrawer, setShowColorDrawer] = useState(false);
	const [themeMode, setThemeMode] = useState<ThemeMode>("system");
	const containerRef = useRef<HTMLDivElement>(null);

	const shouldShow = useMemo(() => {
		for (const path of VISIBLE_PATHS) {
			if (isRouteActive(pathname, path)) {
				return true;
			}
		}
		return false;
	}, [pathname]);

	useEffect(() => {
		setShowSubMenu(false);
	}, [pathname]);

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

	useEffect(() => {
		if (!showSubMenu) return;
		const handleClickOutside = (event: MouseEvent) => {
			if (!containerRef.current) return;
			if (!containerRef.current.contains(event.target as Node)) {
				setShowSubMenu(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [showSubMenu]);

	const setTheme = (mode: ThemeMode) => {
		setThemeMode(mode);
		applyThemeMode(mode);
		setStoredThemeMode(mode);
	};

	if (!shouldShow) {
		return null;
	}

	const onHomeTap = () => {
		if (isRouteActive(pathname, "/home")) {
			setShowSubMenu((prev) => !prev);
			return;
		}
		setShowSubMenu(false);
		router.push("/home");
	};

	return (
		<>
			<div
				ref={containerRef}
				className="md:hidden fixed left-1/2 -translate-x-1/2 z-40"
				style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 40px)" }}
			>
				<div className="relative flex items-center justify-center">
					{showSubMenu && (
						<div className="absolute bottom-[calc(100%+10px)] flex items-center gap-1.5 rounded-full bg-white/85 dark:bg-neutral-900/85 backdrop-blur-[2px] px-3 py-1.5">
							<button
								type="button"
								title="Color"
								className="p-2.5 rounded-full cursor-pointer text-neutral-700 dark:text-neutral-300 hover:text-primary"
								onClick={() => {
									setShowSubMenu(false);
									setShowColorDrawer(true);
								}}
							>
								<span className="block w-3.5 h-3.5 bg-primary rounded-sm" />
							</button>
							<button
								type="button"
								title="Light"
								className={`p-2.5 rounded-full transition-colors ${navIconClass(
									themeMode === "light",
								)}`}
								onClick={() => setTheme("light")}
							>
								<Image
									src="/images/relics/relic-10.png"
									alt="Light"
									width={100}
									height={100}
									className="w-5 h-5 min-w-5 shrink-0 dark:invert"
									priority
								/>
							</button>
							<button
								type="button"
								title="Dark"
								className={`p-2.5 rounded-full transition-colors ${navIconClass(
									themeMode === "dark",
								)}`}
								onClick={() => setTheme("dark")}
							>
								<Image
									src="/images/relics/moon-3.png"
									alt="Dark"
									width={96.4}
									height={100}
									className="h-5 w-full min-w-5 shrink-0 dark:invert"
									priority
								/>
							</button>
							<button
								type="button"
								title="System"
								className={`p-2.5 rounded-full transition-colors ${navIconClass(
									themeMode === "system",
								)}`}
								onClick={() => setTheme("system")}
							>
								<Image
									src="/images/relics/computer-1.png"
									alt="System"
									width={100}
									height={100}
									className="w-5 h-5 min-w-5 shrink-0 dark:invert"
									priority
								/>
							</button>
							<button
								type="button"
								title="Leave"
								className="p-2.5 rounded-full cursor-pointer text-neutral-700 dark:text-neutral-300 hover:text-primary"
								onClick={() =>
									logout().then(() => {
										clearAllCachedKeys();
										queryClient.clear();
										window.location.href = "/";
									})
								}
							>
								<IoExit className="h-4.5 w-4.5" />
							</button>
						</div>
					)}

					<div className="flex items-center gap-2.5 rounded-full bg-white/85 dark:bg-neutral-900/85 backdrop-blur-[2px] px-4 py-2">
						<button
							type="button"
							title="Home"
							className={`p-2 rounded-full transition-colors ${navIconClass(
								isRouteActive(pathname, "/home"),
							)}`}
							onClick={onHomeTap}
						>
							<Image
								src="/images/relics/relic-5.png"
								alt="Home"
								width={100}
								height={100}
								className={`w-6 h-6 dark:invert transition-transform duration-300 ${
									showSubMenu ? "rotate-24" : ""
								}`}
								priority
							/>
						</button>
						<button
							type="button"
							title="Explore"
							className={`p-2 rounded-full transition-colors ${navIconClass(
								isRouteActive(pathname, "/explore"),
							)}`}
							onClick={() => {
								setShowSubMenu(false);
								router.push("/explore");
							}}
						>
							<Image
								src="/images/relics/globe-1.png"
								alt="Explore"
								width={100}
								height={100}
								className="w-6 h-6 dark:invert"
								priority
							/>
						</button>
						<button
							type="button"
							title="Saved"
							className={`p-2 rounded-full transition-colors ${navIconClass(
								isRouteActive(pathname, "/saved"),
							)}`}
							onClick={() => {
								setShowSubMenu(false);
								router.push("/saved");
							}}
						>
							<Image
								src="/images/relics/splat-1.png"
								alt="Saved"
								width={100}
								height={100}
								className="w-6 h-6 dark:invert"
								priority
							/>
						</button>
					</div>
				</div>
			</div>

			<ColorDrawer open={showColorDrawer} onOpenChange={setShowColorDrawer} />
		</>
	);
}
