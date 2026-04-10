"use client";

import type { Writer } from "@/utils/api";
import { useOPWallet } from "@/utils/hooks";
import { clearAllCachedKeys } from "@/utils/keyCache";
import {
	type ThemeMode,
	applyThemeMode,
	getStoredThemeMode,
	setStoredThemeMode,
	subscribeSystemThemeChange,
} from "@/utils/theme";
import { isEntryPrivate, isWalletAuthor } from "@/utils/utils";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ColorModal } from "./ColorModal";
import { type MigrateEntry, MigrateModal } from "./MigrateModal";
import { queryClient as globalQueryClient } from "./Providers";
import { Dropdown, DropdownItem } from "./dsl/Dropdown";

function ThemeButton({
	src,
	label,
	active,
	onClick,
}: {
	src: string;
	label: string;
	active: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			aria-label={`Use ${label.toLowerCase()} theme`}
			title={label}
			className="p-1 inline-flex items-center justify-center cursor-pointer border border-transparent dark:text-secondary transition-colors duration-120 hover:bg-surface dark:hover:bg-surface-raised data-[active=true]:bg-surface-raised"
			data-active={active}
			onClick={onClick}
		>
			<Image
				src={src}
				alt={label}
				width={100}
				height={100}
				className="h-4.5 w-4.5 min-w-4.5 shrink-0 dark:invert"
				priority
			/>
		</button>
	);
}

function isLegacyEncrypted(raw: string | undefined | null): boolean {
	if (!raw) return false;
	return raw.startsWith("enc:v2:br:") || raw.startsWith("enc:br:");
}

export function NavDropdown() {
	const { logout, authenticated, login, user } = usePrivy();
	const [wallet] = useOPWallet();
	const router = useRouter();
	const pathname = usePathname();
	const queryClient = useQueryClient();

	const navItems = [
		{ label: "Home", href: "/home" },
		{ label: "Explore", href: "/explore" },
		...(authenticated ? [{ label: "Saved", href: "/saved" }] : []),
	].filter((item) => item.href !== pathname);
	const [open, setOpen] = useState(false);
	const [migrateOpen, setMigrateOpen] = useState(false);
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const [themeMode, setThemeMode] = useState<ThemeMode>("system");

	// Derive legacy entries from the cached get-writers query
	const address = user?.wallet?.address;
	const writersData = queryClient.getQueryData<Writer[]>([
		"get-writers",
		address,
	]);

	const entriesToMigrate = useMemo<MigrateEntry[]>(() => {
		if (!writersData || !wallet) return [];
		const result: MigrateEntry[] = [];
		for (const writer of writersData) {
			for (const entry of writer.entries) {
				if (
					isEntryPrivate(entry) &&
					isWalletAuthor(wallet, entry) &&
					isLegacyEncrypted(entry.raw) &&
					entry.onChainId
				) {
					result.push({
						entry,
						writerAddress: writer.address,
						writerTitle: writer.title,
					});
				}
			}
		}
		return result;
	}, [writersData, wallet]);

	const hasLegacyEntries = entriesToMigrate.length > 0;

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

	const preloadImages = [
		"/images/relics/relic-10.png",
		"/images/relics/moon-3.png",
		"/images/relics/computer-1.png",
	];

	return (
		<>
			{preloadImages.map((src) => (
				<link key={src} rel="preload" as="image" href={src} />
			))}
			<Dropdown
				onOpenChange={setDropdownOpen}
				trigger={
					<Image
						src={"/images/relics/relic-5.png"}
						alt={"dropdown trigger"}
						width={38}
						height={38}
						priority
						className={`transition-transform duration-300 hover:rotate-12 active:scale-90 dark:invert ${
							dropdownOpen ? "rotate-12" : ""
						}`}
					/>
				}
			>
				{navItems.map((item) => (
					<DropdownItem key={item.href} onClick={() => router.push(item.href)}>
						{item.label}
					</DropdownItem>
				))}
				{authenticated && (
					<DropdownItem onClick={() => setOpen(true)}>
						<div className="flex items-center justify-between gap-2 w-full">
							<span>Color</span>
							<span className="w-2 h-2 bg-primary" />
						</div>
					</DropdownItem>
				)}
				{authenticated && hasLegacyEntries && (
					<DropdownItem onClick={() => setMigrateOpen(true)}>
						<div className="flex items-center justify-between gap-2 w-full">
							<span>Migrate</span>
							<span className="text-xs text-neutral-400 dark:text-neutral-500">
								{entriesToMigrate.length}
							</span>
						</div>
					</DropdownItem>
				)}
				{authenticated ? (
					<DropdownItem
						onClick={() =>
							logout().then(() => {
								clearAllCachedKeys();
								globalQueryClient.clear();
							})
						}
					>
						Sign out
					</DropdownItem>
				) : (
					<DropdownItem onClick={() => login()}>Sign in</DropdownItem>
				)}
				<div className="flex items-center justify-between gap-1 mt-1 pt-1 border-t border-neutral-300 dark:border-neutral-800/60">
					<ThemeButton
						src="/images/relics/relic-10.png"
						label="Light"
						active={themeMode === "light"}
						onClick={() => setTheme("light")}
					/>
					<ThemeButton
						src="/images/relics/moon-3.png"
						label="Dark"
						active={themeMode === "dark"}
						onClick={() => setTheme("dark")}
					/>
					<ThemeButton
						src="/images/relics/computer-1.png"
						label="System"
						active={themeMode === "system"}
						onClick={() => setTheme("system")}
					/>
				</div>
			</Dropdown>
			<ColorModal open={open} onClose={() => setOpen(false)} />
			<MigrateModal
				open={migrateOpen}
				onClose={() => setMigrateOpen(false)}
				entriesToMigrate={entriesToMigrate}
			/>
		</>
	);
}
