"use client";

import { cn } from "@/utils/cn";
import { usePrivy } from "@privy-io/react-auth";
import { useState } from "react";
import { ColorModal } from "./ColorModal";
import { Dropdown, DropdownItem } from "./Dropdown";
import { Logo } from "./icons/Logo";

export function Header() {
	const { ready, authenticated, logout } = usePrivy();
	const isLoggedIn = ready && authenticated;
	const [open, setOpen] = useState(false);

	return (
		<div className="flex items-center justify-between">
			<div className="text-3xl transition-colors text-primary pr-0.5">
				Writer
			</div>
			<Dropdown
				trigger={
					// <Blob
					// 	className={cn("h-8 transition-colors", {
					// 		"text-primary": isLoggedIn,
					// 		"text-secondary": !isLoggedIn,
					// 	})}
					// />
					<Logo
						className={cn("h-8 transition-colors", {
							"text-primary": isLoggedIn,
							"text-secondary": !isLoggedIn,
						})}
					/>
				}
			>
				<DropdownItem onClick={() => setOpen(true)}>
					<div className="flex items-center justify-between gap-2 w-full">
						<span>Color</span>
						<span className="w-2 h-2 bg-primary" />
					</div>
				</DropdownItem>
				<DropdownItem
					onClick={() =>
						logout().then(() => {
							window.location.href = "/";
						})
					}
				>
					Leave
				</DropdownItem>
			</Dropdown>
			<ColorModal open={open} onClose={() => setOpen(false)} />
		</div>
	);
}
