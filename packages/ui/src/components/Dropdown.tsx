import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
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
	"DropdownMenuContent min-w-xl w-full min-w-40 bg-neutral-900 p-1.5 shadow-sm will-change-transform will-change-[opacity]",
);

export function Dropdown({ children, trigger, side = "left" }: DropdownProps) {
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
			<DropdownMenu.Portal>
				<DropdownMenu.Content
					side={side}
					className={cn(dropdownMenuContentClasses)}
					sideOffset={10}
				>
					{children}
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
}

export function DropdownItem(props: DropdownMenu.DropdownMenuItemProps) {
	return (
		<DropdownMenu.Item {...props} className={cn(dropdownMenuItemClasses)} />
	);
}
