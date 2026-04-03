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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
	const { logout, authenticated, ready } = usePrivy();
	const isLoggedIn = !ready || authenticated;
	const [showSubMenu, setShowSubMenu] = useState(false);
	const [showColorDrawer, setShowColorDrawer] = useState(false);
	const [themeMode, setThemeMode] = useState<ThemeMode>("system");
	const [hidden, setHidden] = useState(false);
	const lastScrollY = useRef(0);
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

	const touchStartY = useRef(0);

	useEffect(() => {
		const threshold = 20;

		// Desktop / Android: window scroll
		const handleScroll = () => {
			const currentY = window.scrollY;
			if (currentY > lastScrollY.current && currentY > 50) {
				setHidden(true);
				setShowSubMenu(false);
			} else if (currentY < lastScrollY.current) {
				setHidden(false);
			}
			lastScrollY.current = currentY;
		};

		// Touch devices (including iOS Safari): respond during move, not just at end
		const handleTouchStart = (e: TouchEvent) => {
			touchStartY.current = e.touches[0].clientY;
		};

		const handleTouchMove = (e: TouchEvent) => {
			const delta = touchStartY.current - e.touches[0].clientY;
			if (delta > threshold) {
				setHidden(true);
				setShowSubMenu(false);
			} else if (delta < -threshold) {
				setHidden(false);
			}
		};

		window.addEventListener("scroll", handleScroll, { passive: true });
		// Use capture phase to ensure we see events before any container stops propagation
		document.addEventListener("touchstart", handleTouchStart, { capture: true, passive: true });
		document.addEventListener("touchmove", handleTouchMove, { capture: true, passive: true });
		return () => {
			window.removeEventListener("scroll", handleScroll);
			document.removeEventListener("touchstart", handleTouchStart, { capture: true });
			document.removeEventListener("touchmove", handleTouchMove, { capture: true });
		};
	}, []);

	const setTheme = (mode: ThemeMode) => {
		setThemeMode(mode);
		applyThemeMode(mode);
		setStoredThemeMode(mode);
	};

	if (!shouldShow) {
		return null;
	}

	const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const didLongPress = useRef(false);

	const onHomePressStart = useCallback(() => {
		didLongPress.current = false;
		longPressTimer.current = setTimeout(() => {
			didLongPress.current = true;
			setShowSubMenu(true);
		}, 500);
	}, []);

	const onHomePressEnd = useCallback(() => {
		if (longPressTimer.current) {
			clearTimeout(longPressTimer.current);
			longPressTimer.current = null;
		}
	}, []);

	const onHomeTap = () => {
		if (didLongPress.current) return;
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
				className={`md:hidden fixed left-1/2 -translate-x-1/2 z-40 transition-transform duration-300 ease-in-out ${
					hidden ? "translate-y-[calc(100%+60px)]" : ""
				}`}
				style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 30px)" }}
			>
				<div className="relative flex items-center justify-center">
					{showSubMenu && (
						<div className="absolute bottom-[calc(100%+10px)] flex items-center gap-1.5 rounded-full bg-white/85 dark:bg-neutral-900/85 backdrop-blur-[2px] px-3 py-1.5">
							{isLoggedIn && (
								<button
									type="button"
									title="Color"
									className="p-1.5 rounded-full cursor-pointer text-neutral-700 dark:text-neutral-300 hover:text-primary"
									onClick={() => {
										setShowSubMenu(false);
										setShowColorDrawer(true);
									}}
								>
									<span className="block w-5 h-5 bg-primary rounded-sm" />
								</button>
							)}
							<button
								type="button"
								title="Light"
								className={`p-1.5 rounded-full transition-colors ${navIconClass(
									themeMode === "light",
								)}`}
								onClick={() => setTheme("light")}
							>
								<Image
									src="/images/relics/relic-10.png"
									alt="Light"
									width={100}
									height={100}
									className="w-7 h-7 min-w-7 shrink-0 dark:invert"
									priority
								/>
							</button>
							<button
								type="button"
								title="Dark"
								className={`p-1.5 rounded-full transition-colors ${navIconClass(
									themeMode === "dark",
								)}`}
								onClick={() => setTheme("dark")}
							>
								<Image
									src="/images/relics/moon-3.png"
									alt="Dark"
									width={96.4}
									height={100}
									className="h-7 w-full min-w-7 shrink-0 dark:invert"
									priority
								/>
							</button>
							<button
								type="button"
								title="System"
								className={`p-1.5 rounded-full transition-colors ${navIconClass(
									themeMode === "system",
								)}`}
								onClick={() => setTheme("system")}
							>
								<Image
									src="/images/relics/computer-1.png"
									alt="System"
									width={100}
									height={100}
									className="w-7 h-7 min-w-7 shrink-0 dark:invert"
									priority
								/>
							</button>
							{isLoggedIn && (
								<button
									type="button"
									title="Leave"
									className="p-1.5 rounded-full cursor-pointer text-neutral-700 dark:text-neutral-300 hover:text-primary"
									onClick={() =>
										logout().then(() => {
											clearAllCachedKeys();
											queryClient.clear();
										})
									}
								>
									<Image
										src="/images/relics/arrow-1.png"
										alt="Leave"
										width={100}
										height={100}
										className="w-7 h-7 min-w-7 shrink-0 dark:invert"
										priority
									/>
								</button>
							)}
						</div>
					)}

					<div className="flex items-center gap-2.5 rounded-full bg-white/85 dark:bg-neutral-900/85 backdrop-blur-[2px] px-3 py-1.5">
						<button
							type="button"
							title="Home"
							className={`p-1.5 rounded-full transition-colors ${navIconClass(
								isRouteActive(pathname, "/home"),
							)}`}
							onClick={onHomeTap}
							onTouchStart={onHomePressStart}
							onTouchEnd={onHomePressEnd}
							onTouchCancel={onHomePressEnd}
							onMouseDown={onHomePressStart}
							onMouseUp={onHomePressEnd}
							onMouseLeave={onHomePressEnd}
						>
							<Image
								src="/images/relics/relic-5.png"
								alt="Home"
								width={100}
								height={100}
								className={`w-8 h-8 dark:invert transition-transform duration-300 ${
									showSubMenu ? "rotate-24" : ""
								}`}
								priority
							/>
						</button>
						<button
							type="button"
							title="Explore"
							className={`p-1.5 rounded-full transition-colors ${navIconClass(
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
								className="w-8 h-8 dark:invert"
								priority
							/>
						</button>
						{isLoggedIn && (
							<button
								type="button"
								title="Saved"
								className={`p-1.5 rounded-full transition-colors ${navIconClass(
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
									className="w-8 h-8 dark:invert"
									priority
								/>
							</button>
						)}
					</div>
				</div>
			</div>

			<ColorDrawer open={showColorDrawer} onOpenChange={setShowColorDrawer} />
		</>
	);
}
