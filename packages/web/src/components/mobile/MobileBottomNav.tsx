"use client";

import { useUnsavedChangesNavigation } from "@/hooks/useUnsavedChangesWarning";
import { useHiddenWriters } from "@/hooks/useHiddenWriters";
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
import { ColorModal } from "../ColorModal";
import { HiddenPlacesModal } from "../HiddenPlacesModal";
import { queryClient } from "../Providers";

const VISIBLE_PATHS = new Set(["/home", "/explore", "/writer"]);

function isComposeRoute(pathname: string) {
	const segments = pathname.split("/").filter(Boolean);
	return (
		pathname === "/place/new" ||
		(segments[0] === "writer" &&
			(segments[2] === "new" || segments[3] === "edit"))
	);
}

function isRouteActive(pathname: string, target: string) {
	return pathname === target || pathname.startsWith(`${target}/`);
}

function navIconClass(active: boolean) {
	return active
		? "cursor-pointer text-primary bg-primary/15 dark:bg-primary/20"
		: "cursor-pointer text-neutral-700 dark:text-neutral-300 hover:text-primary";
}

const THEME_OPTIONS = [
	{
		mode: "light",
		title: "Light",
		src: "/images/relics/relic-10.png",
		width: 100,
		height: 100,
		className: "h-7 w-7 shrink-0 object-contain dark:invert",
	},
	{
		mode: "dark",
		title: "Dark",
		src: "/images/relics/moon-3.png",
		width: 96.4,
		height: 100,
		className: "h-7 w-7 shrink-0 object-contain dark:invert",
	},
	{
		mode: "system",
		title: "System",
		src: "/images/relics/computer-1.png",
		width: 100,
		height: 100,
		className: "h-7 w-7 shrink-0 object-contain dark:invert",
	},
] satisfies readonly {
	mode: ThemeMode;
	title: string;
	src: string;
	width: number;
	height: number;
	className: string;
}[];

function getThemeOption(mode: ThemeMode) {
	switch (mode) {
		case "light":
			return THEME_OPTIONS[0];
		case "dark":
			return THEME_OPTIONS[1];
		case "system":
			return THEME_OPTIONS[2];
	}
}

export function MobileBottomNav({
	preview = false,
}: { preview?: boolean } = {}) {
	const pathname = usePathname();
	const router = useRouter();
	const { logout, authenticated, ready } = usePrivy();
	const isLoggedIn = ready && authenticated;
	const [showSubMenu, setShowSubMenu] = useState(false);
	const [showThemeMenu, setShowThemeMenu] = useState(false);
	const [showColorModal, setShowColorModal] = useState(false);
	const [showHiddenPlacesModal, setShowHiddenPlacesModal] = useState(false);
	const [themeMode, setThemeMode] = useState<ThemeMode>("system");
	const [hidden, setHidden] = useState(false);
	const lastScrollY = useRef(0);
	const containerRef = useRef<HTMLDivElement>(null);
	const confirmNavigation = useUnsavedChangesNavigation();

	const { data: hiddenWriters } = useHiddenWriters();
	const hasHiddenWriters = (hiddenWriters?.length ?? 0) > 0;
	const shouldShow = useMemo(() => {
		if (!isLoggedIn || isComposeRoute(pathname)) {
			return false;
		}
		for (const path of VISIBLE_PATHS) {
			if (isRouteActive(pathname, path)) {
				return true;
			}
		}
		return false;
	}, [isLoggedIn, pathname]);

	useEffect(() => {
		setShowSubMenu(false);
		setShowThemeMenu(false);
		setShowColorModal(false);
		setShowHiddenPlacesModal(false);
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
				setShowThemeMenu(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [showSubMenu]);

	const touchStartY = useRef(0);

	useEffect(() => {
		const threshold = 44;

		let scrollDirection: "down" | "up" | null = null;
		let prevScrollY = window.scrollY;

		// Desktop / Android: window scroll
		const handleScroll = () => {
			const currentY = window.scrollY;
			const dir = currentY > prevScrollY ? "down" : "up";
			prevScrollY = currentY;

			// Direction changed — reset anchor point
			if (dir !== scrollDirection) {
				scrollDirection = dir;
				lastScrollY.current = currentY;
				return;
			}

			const distance = Math.abs(currentY - lastScrollY.current);
			if (distance < threshold) return;

			if (dir === "down" && currentY > 50) {
				setHidden(true);
				setShowSubMenu(false);
				setShowThemeMenu(false);
			} else if (dir === "up") {
				const atBottom =
					window.innerHeight + window.scrollY >=
					document.documentElement.scrollHeight - 10;
				if (!atBottom) {
					setHidden(false);
				}
			}
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
				setShowThemeMenu(false);
			} else if (delta < -threshold) {
				// Don't show on overscroll bounce at the bottom
				const atBottom =
					window.innerHeight + window.scrollY >=
					document.documentElement.scrollHeight - 10;
				if (!atBottom) {
					setHidden(false);
				}
			}
		};

		window.addEventListener("scroll", handleScroll, { passive: true });
		// Use capture phase to ensure we see events before any container stops propagation
		document.addEventListener("touchstart", handleTouchStart, {
			capture: true,
			passive: true,
		});
		document.addEventListener("touchmove", handleTouchMove, {
			capture: true,
			passive: true,
		});
		return () => {
			window.removeEventListener("scroll", handleScroll);
			document.removeEventListener("touchstart", handleTouchStart, {
				capture: true,
			});
			document.removeEventListener("touchmove", handleTouchMove, {
				capture: true,
			});
		};
	}, []);

	const setTheme = (mode: ThemeMode) => {
		setThemeMode(mode);
		applyThemeMode(mode);
		setStoredThemeMode(mode);
	};
	const activeThemeOption = getThemeOption(themeMode);
	const themeMenuVisible = showSubMenu && showThemeMenu;

	const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const didLongPress = useRef(false);

	const onHomePressStart = useCallback(() => {
		didLongPress.current = false;
		longPressTimer.current = setTimeout(() => {
			didLongPress.current = true;
			setShowSubMenu(true);
			setShowThemeMenu(false);
		}, 500);
	}, []);

	const onHomePressEnd = useCallback(() => {
		if (longPressTimer.current) {
			clearTimeout(longPressTimer.current);
			longPressTimer.current = null;
		}
	}, []);

	const onHomeTap = async () => {
		if (didLongPress.current) return;
		if (isRouteActive(pathname, "/home")) {
			setShowThemeMenu(false);
			setShowSubMenu((prev) => !prev);
			return;
		}
		if (!(await confirmNavigation())) return;
		setShowSubMenu(false);
		setShowThemeMenu(false);
		router.push("/home");
	};

	if ((!shouldShow && !preview) || (!isLoggedIn && !preview)) {
		return null;
	}

	return (
		<>
			<div
				ref={containerRef}
				className={
					preview
						? "relative flex justify-center"
						: `lg:hidden fixed left-1/2 -translate-x-1/2 z-40 transition-transform duration-300 ease-in-out ${
								hidden ? "translate-y-[calc(100%+60px)]" : ""
							}`
				}
				style={
					preview
						? undefined
						: { bottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)" }
				}
			>
				<div className="relative flex items-center justify-center">
					<div
						aria-hidden={!themeMenuVisible}
						className={`absolute bottom-[calc(100%+72px)] flex origin-bottom items-center gap-1.5 rounded-full bg-background/85 backdrop-blur-[2px] px-3 py-1.5 transition-[opacity,transform] duration-150 ${
							themeMenuVisible
								? "pointer-events-auto translate-y-0 scale-100 opacity-100"
								: "pointer-events-none translate-y-0 scale-100 opacity-0"
						}`}
					>
						{THEME_OPTIONS.map((option) => (
							<button
								key={option.mode}
								type="button"
								title={option.title}
								tabIndex={themeMenuVisible ? 0 : -1}
								className={`h-10 w-10 inline-flex items-center justify-center rounded-full transition-colors ${navIconClass(
									themeMode === option.mode,
								)}`}
								onClick={() => setTheme(option.mode)}
							>
								<Image
									src={option.src}
									alt={option.title}
									width={option.width}
									height={option.height}
									className={option.className}
									priority
								/>
							</button>
						))}
					</div>
					<div
						aria-hidden={!showSubMenu}
						className={`absolute bottom-[calc(100%+10px)] flex origin-bottom items-center gap-1.5 rounded-full bg-background/85 backdrop-blur-[2px] px-3 py-1.5 transition-[opacity,transform] duration-150 ${
							showSubMenu
								? "pointer-events-auto translate-y-0 scale-100 opacity-100"
								: "pointer-events-none translate-y-0 scale-100 opacity-0"
						}`}
					>
						{isLoggedIn && (
							<button
								type="button"
								title="Color"
								tabIndex={showSubMenu ? 0 : -1}
								className="h-10 w-10 inline-flex items-center justify-center rounded-full cursor-pointer text-neutral-700 dark:text-neutral-300 hover:text-primary"
								onClick={() => {
									setShowSubMenu(false);
									setShowThemeMenu(false);
									setShowColorModal(true);
								}}
							>
								<span className="block h-5 w-5 rounded-sm bg-primary" />
							</button>
						)}
						<button
							type="button"
							title="Theme"
							tabIndex={showSubMenu ? 0 : -1}
							aria-expanded={showThemeMenu}
							className={`h-10 w-10 inline-flex items-center justify-center rounded-full transition-colors ${navIconClass(
								showThemeMenu,
							)}`}
							onClick={() => setShowThemeMenu((prev) => !prev)}
						>
							<Image
								src={activeThemeOption.src}
								alt={`Theme: ${activeThemeOption.title.toLowerCase()}`}
								width={activeThemeOption.width}
								height={activeThemeOption.height}
								className={`${
									activeThemeOption.className
								} transition-transform duration-300 ${
									showThemeMenu ? "rotate-24" : ""
								}`}
								priority
							/>
						</button>
						{isLoggedIn && hasHiddenWriters && (
							<button
								type="button"
								title="Hidden Places"
								tabIndex={showSubMenu ? 0 : -1}
								className="h-10 w-10 inline-flex items-center justify-center rounded-full cursor-pointer text-neutral-700 dark:text-neutral-300 hover:text-primary"
								onClick={() => {
									setShowSubMenu(false);
									setShowThemeMenu(false);
									setShowHiddenPlacesModal(true);
								}}
							>
								<Image
									src="/images/relics/face.png"
									alt="Hidden Places"
									width={100}
									height={100}
									className="h-7 w-7 shrink-0 object-contain dark:invert"
									priority
								/>
							</button>
						)}
						{isLoggedIn && (
							<button
								type="button"
								title="Leave"
								tabIndex={showSubMenu ? 0 : -1}
								className="h-10 w-10 inline-flex items-center justify-center rounded-full cursor-pointer text-neutral-700 dark:text-neutral-300 hover:text-primary"
								onClick={async () => {
									if (!(await confirmNavigation())) return;
									logout().then(() => {
										clearAllCachedKeys();
										queryClient.clear();
									});
								}}
							>
								<Image
									src="/images/relics/doorway.png"
									alt="Leave"
									width={100}
									height={100}
									className="h-7 w-7 shrink-0 object-contain dark:invert"
									priority
								/>
							</button>
						)}
					</div>

					<div className="flex items-center gap-2.5 rounded-full bg-background/85 backdrop-blur-[2px] px-3 py-1.5">
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
							onClick={async () => {
								if (!(await confirmNavigation())) return;
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
					</div>
				</div>
			</div>

			<ColorModal
				open={showColorModal}
				onClose={() => setShowColorModal(false)}
			/>
			<HiddenPlacesModal
				open={showHiddenPlacesModal}
				onClose={() => setShowHiddenPlacesModal(false)}
			/>
		</>
	);
}
