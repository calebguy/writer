"use client";

import { clearAllCachedKeys } from "@/utils/keyCache";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ColorModal } from "./ColorModal";
import { Dropdown, DropdownItem } from "./dsl/Dropdown";
import { Logo } from "./icons/Logo";

export function LogoDropdown() {
	const { logout } = usePrivy();
	const router = useRouter();
	const [open, setOpen] = useState(false);
	return (
		<>
			<Dropdown
				trigger={
					<Logo className="h-8 transition-colors text-primary hover:text-secondary" />
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
