"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useEffect, useState } from "react";
import { cn } from "../../utils/cn";

interface DropdownProps {
	children: React.ReactNode;
	trigger: React.ReactNode;
	side?: "left" | "right" | "top" | "bottom";
}

const dropdownMenuItemClasses = cn(
	"logo-dropdown-item text-white flex relative user-select-none outline-none text-sm py-1 px-1.5 hover:bg-neutral-800 cursor-pointer",
);

const dropdownMenuContentClasses = cn(
	"logo-dropdown-content min-w-24 bg-neutral-900 p-1.5 shadow-sm border border-neutral-800 z-[200]",
);

export function Dropdown({
	children,
	trigger,
	side = "bottom",
}: DropdownProps) {
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
					className="inline-flex items-center justify-center outline-none cursor-pointer"
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
						sideOffset={10}
						// alignOffset={10}
						collisionPadding={28}
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
