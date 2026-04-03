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
			className={cn("fixed inset-0 z-50 backdrop-blur-xs", className)}
			{...props}
		/>
	);
}

function DynamicDrawerContent({
	className,
	children,
	...props
}: React.ComponentPropsWithoutRef<typeof Drawer.Content>) {
	return (
		<Drawer.Portal>
			<DynamicDrawerOverlay />
			<Drawer.Content
				className={cn(
					"fixed bottom-4 left-4 right-4 z-50 rounded-2xl bg-background p-3 max-h-[85vh] outline-none after:hidden",
					className,
				)}
				{...props}
			>
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
