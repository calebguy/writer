"use client";

import { cn } from "@/utils/cn";
import { usePrivy } from "@privy-io/react-auth";
import { useState } from "react";
import { ColorModal } from "./ColorModal";
import { Dropdown, DropdownItem } from "./dsl/Dropdown";
import { Logo } from "./icons/Logo";

export function Header() {
	const { ready, authenticated, logout } = usePrivy();
	const isLoggedIn = ready && authenticated;
	const [open, setOpen] = useState(false);

	return (
		<div className="flex items-center justify-between">
			<div
				className={cn("text-3xl transition-colors pr-0.5", {
					"text-primary": isLoggedIn,
					"text-secondary": !isLoggedIn,
				})}
			>
				Writer
			</div>
			<Dropdown
				trigger={
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
