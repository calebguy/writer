import { Drawer as VaulDrawer } from "vaul";

interface DrawerProps {
	children: JSX.Element;
	open: boolean;
	setOpen: (open: boolean) => void;
	title?: string;
}

export function Drawer({ open, setOpen, title, children }: DrawerProps) {
	return (
		<VaulDrawer.Root open={open} onOpenChange={setOpen}>
			<VaulDrawer.Overlay className="fixed inset-0 bg-black/40" />

			<VaulDrawer.Portal>
				<VaulDrawer.Content
					className={
						"flex flex-col bg-neutral-800 border border-neutral-600 mt-24 h-[80%] max-h-[96%] fixed bottom-0 left-0 right-0 md:max-w-[650px] md:mx-auto lg:max-w-[65vw] p-4 mb-6"
					}
				>
					<VaulDrawer.Title className="text-4xl mb-4">{title}</VaulDrawer.Title>
					<VaulDrawer.Handle />
					{children}
				</VaulDrawer.Content>
			</VaulDrawer.Portal>
		</VaulDrawer.Root>
	);
}
