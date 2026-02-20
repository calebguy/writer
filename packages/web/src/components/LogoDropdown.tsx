"use client";

import { clearAllCachedKeys } from "@/utils/keyCache";
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
	const [theme, setTheme] = useState<"dark" | "light">("dark");

	useEffect(() => {
		if (typeof window === "undefined") return;
		const stored = window.localStorage.getItem("writer-theme");
		const initial = stored === "light" ? "light" : "dark";
		setTheme(initial);
		document.documentElement.dataset.theme = initial;
	}, []);

	const toggleTheme = () => {
		const next = theme === "dark" ? "light" : "dark";
		setTheme(next);
		if (typeof window !== "undefined") {
			document.documentElement.dataset.theme = next;
			window.localStorage.setItem("writer-theme", next);
		}
	};
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
				<DropdownItem onClick={toggleTheme}>
					<div className="flex items-center justify-between gap-2 w-full">
						<span>Light Mode</span>
						<span className="logo-dropdown-meta text-xs text-neutral-500">
							{theme === "light" ? "On" : "Off"}
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
