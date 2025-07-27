"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useEffect, useState } from "react";
import { cn } from "../utils/cn";

interface DropdownProps {
	children: React.ReactNode;
	trigger: React.ReactNode;
	side?: "left" | "right" | "top" | "bottom";
}

const dropdownMenuItemClasses = cn(
	"text-white flex relative user-select-none outline-none text-sm py-1 px-1.5 hover:bg-neutral-800 cursor-pointer",
);

const dropdownMenuContentClasses = cn(
	"min-w-40 bg-neutral-900 p-1.5 shadow-sm border border-neutral-800",
);

export function Dropdown({ children, trigger, side = "left" }: DropdownProps) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger
				asChild
				onClick={(e) => {
					e.stopPropagation();
					e.preventDefault();
				}}
			>
				<button
					type="button"
					className={cn(
						"inline-flex",
						"items-center",
						"justify-center",
						"outline-none",
					)}
				>
					{trigger}
				</button>
			</DropdownMenu.Trigger>
			{mounted && (
				<DropdownMenu.Portal container={document.body}>
					<DropdownMenu.Content
						side={side}
						align="start"
						className={cn(dropdownMenuContentClasses)}
						sideOffset={8}
						alignOffset={0}
						collisionPadding={8}
						onCloseAutoFocus={(e) => e.preventDefault()}
					>
						{children}
					</DropdownMenu.Content>
				</DropdownMenu.Portal>
			)}
		</DropdownMenu.Root>
	);
}

export function DropdownItem(props: DropdownMenu.DropdownMenuItemProps) {
	return (
		<DropdownMenu.Item {...props} className={cn(dropdownMenuItemClasses)} />
	);
}
