"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useEffect, useState } from "react";
import { cn } from "../../utils/cn";

interface DropdownProps {
	children: React.ReactNode;
	trigger: React.ReactNode;
	side?: "left" | "right" | "top" | "bottom";
	onOpenChange?: (open: boolean) => void;
}

const dropdownMenuItemClasses = cn(
	"text-black dark:text-white flex relative user-select-none outline-none text-base py-1 px-1.5 hover:bg-surface-raised cursor-pointer",
);

const dropdownMenuContentClasses = cn(
	"shadow-none min-w-24 bg-surface p-1.5 border border-neutral-300 dark:border-neutral-800 z-[200]",
);

export function Dropdown({
	children,
	trigger,
	side = "bottom",
	onOpenChange: onOpenChangeProp,
}: DropdownProps) {
	const [mounted, setMounted] = useState(false);
	const [open, setOpen] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const handleOpenChange = (value: boolean) => {
		setOpen(value);
		onOpenChangeProp?.(value);
	};

	return (
		<DropdownMenu.Root open={open} onOpenChange={handleOpenChange}>
			<DropdownMenu.Trigger
				asChild
				onPointerDown={(e) => {
					e.preventDefault();
				}}
				onClick={(e) => {
					e.stopPropagation();
					e.preventDefault();
				}}
			>
				<button
					type="button"
					className="inline-flex items-center justify-center outline-none cursor-pointer"
					onPointerUp={() => handleOpenChange(!open)}
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
