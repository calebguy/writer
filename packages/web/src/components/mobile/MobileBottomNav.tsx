"use client";

import { useUnsavedChangesNavigation } from "@/hooks/useUnsavedChangesWarning";
import { useHiddenWriters } from "@/hooks/useHiddenWriters";
import { clearAllCachedKeys } from "@/utils/keyCache";
import { usePrivy } from "@privy-io/react-auth";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ThemeModal } from "../ThemeModal";
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

export function MobileBottomNav({
	preview = false,
}: { preview?: boolean } = {}) {
	const pathname = usePathname();
	const router = useRouter();
	const { logout, authenticated, ready } = usePrivy();
	const isLoggedIn = ready && authenticated;
	const [showSubMenu, setShowSubMenu] = useState(false);
	const [showThemeModal, setShowThemeModal] = useState(false);
	const [showHiddenPlacesModal, setShowHiddenPlacesModal] = useState(false);
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
	const showColorControl = isLoggedIn || preview;

	useEffect(() => {
		setShowSubMenu(false);
		setShowThemeModal(false);
		setShowHiddenPlacesModal(false);
	}, [pathname]);

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

	const longPressTimer = useRef<number | null>(null);
	const didLongPress = useRef(false);

	const onHomePressStart = useCallback(() => {
		didLongPress.current = false;
		longPressTimer.current = window.setTimeout(() => {
			didLongPress.current = true;
			setShowSubMenu(true);
		}, 500);
	}, []);

	const onHomePressEnd = useCallback(() => {
		if (longPressTimer.current) {
			window.clearTimeout(longPressTimer.current);
			longPressTimer.current = null;
		}
	}, []);

	const onHomeTap = async () => {
		if (didLongPress.current) return;
		if (isRouteActive(pathname, "/home")) {
			setShowSubMenu((prev) => !prev);
			return;
		}
		if (!(await confirmNavigation())) return;
		setShowSubMenu(false);
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
						: `md:hidden fixed left-1/2 -translate-x-1/2 z-40 transition-transform duration-300 ease-in-out ${
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
						aria-hidden={!showSubMenu}
						className={`absolute bottom-[calc(100%+10px)] flex origin-bottom items-center gap-1.5 rounded-full bg-background/85 backdrop-blur-[2px] px-3 py-1.5 transition-[opacity,transform] duration-150 ${
							showSubMenu
								? "pointer-events-auto translate-y-0 scale-100 opacity-100"
								: "pointer-events-none translate-y-0 scale-100 opacity-0"
						}`}
					>
						{showColorControl && (
							<button
								type="button"
								title="Color"
								tabIndex={showSubMenu ? 0 : -1}
								className="h-10 w-10 inline-flex items-center justify-center rounded-full cursor-pointer text-neutral-700 dark:text-neutral-300 hover:text-primary"
								onClick={() => {
									setShowSubMenu(false);
									setShowThemeModal(true);
								}}
							>
								<span className="block h-5 w-5 rounded-sm bg-primary" />
							</button>
						)}
						{isLoggedIn && hasHiddenWriters && (
							<button
								type="button"
								title="Hidden Places"
								tabIndex={showSubMenu ? 0 : -1}
								className="h-10 w-10 inline-flex items-center justify-center rounded-full cursor-pointer text-neutral-700 dark:text-neutral-300 hover:text-primary"
								onClick={() => {
									setShowSubMenu(false);
									setShowHiddenPlacesModal(true);
								}}
							>
								<Image
									src="/images/relics/face.webp"
									alt="Hidden Places"
									width={100}
									height={100}
									className="h-7 w-7 shrink-0 object-contain dark:invert"
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
									src="/images/relics/doorway.webp"
									alt="Leave"
									width={100}
									height={100}
									className="h-7 w-7 shrink-0 object-contain dark:invert"
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
								src="/images/relics/relic-5.webp"
								alt="Home"
								width={100}
								height={100}
								className={`w-8 h-8 dark:invert transition-transform duration-300 ${
									showSubMenu ? "rotate-24" : ""
								}`}
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
								src="/images/relics/globe-1.webp"
								alt="Explore"
								width={100}
								height={100}
								className="w-8 h-8 dark:invert"
							/>
						</button>
					</div>
				</div>
			</div>

			<ThemeModal
				open={showThemeModal}
				onClose={() => setShowThemeModal(false)}
			/>
			<HiddenPlacesModal
				open={showHiddenPlacesModal}
				onClose={() => setShowHiddenPlacesModal(false)}
			/>
		</>
	);
}
