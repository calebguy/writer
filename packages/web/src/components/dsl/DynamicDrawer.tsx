"use client";

import { cn } from "@/utils/cn";
import { Drawer } from "vaul";

function DynamicDrawerRoot(
	props: React.ComponentPropsWithoutRef<typeof Drawer.Root>,
) {
	return <Drawer.Root repositionInputs={false} {...props} />;
}
const DynamicDrawerTrigger = Drawer.Trigger;
const DynamicDrawerClose = Drawer.Close;
const DynamicDrawerHandle = Drawer.Handle;
const DynamicDrawerTitle = Drawer.Title;
const DynamicDrawerDescription = Drawer.Description;

function DynamicDrawerOverlay({
	className,
	...props
}: React.ComponentPropsWithoutRef<typeof Drawer.Overlay>) {
	return (
		<Drawer.Overlay
			className={cn(
				"fixed inset-0 z-50 bg-black/35 backdrop-blur-xs dark:bg-black/55",
				className,
			)}
			{...props}
		/>
	);
}

function DynamicDrawerContent({
	className,
	children,
	loading = false,
	...props
}: React.ComponentPropsWithoutRef<typeof Drawer.Content> & {
	loading?: boolean;
}) {
	return (
		<Drawer.Portal>
			<DynamicDrawerOverlay />
			<Drawer.Content
				className={cn(
					"fixed inset-x-0 bottom-0 z-50 h-[calc(100dvh-1rem)] rounded-t-2xl p-3 outline-none after:hidden sm:bottom-4 sm:left-4 sm:right-4 sm:h-auto sm:max-h-[85vh] sm:rounded-sm",
					loading ? "bg-primary" : "bg-background dark:bg-surface",
					className,
				)}
				{...props}
			>
				<Drawer.Handle className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-neutral-300 dark:bg-neutral-700" />
				{children}
			</Drawer.Content>
		</Drawer.Portal>
	);
}

export {
	DynamicDrawerClose,
	DynamicDrawerContent,
	DynamicDrawerDescription,
	DynamicDrawerHandle,
	DynamicDrawerOverlay,
	DynamicDrawerRoot,
	DynamicDrawerTitle,
	DynamicDrawerTrigger,
};
