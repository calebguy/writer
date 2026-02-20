import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "../../utils/cn";
import { Close } from "../icons/Close";
interface ModalProps {
	open: boolean;
	onClose: () => void;
	children: React.ReactNode;
	className?: string;
}

export function Modal({ open, onClose, children, className }: ModalProps) {
	return (
		<Dialog.Root open={open} onOpenChange={onClose}>
			<Dialog.Portal>
				<Dialog.Overlay className="modal-overlay fixed inset-0 z-[100]" />
				<Dialog.Content
					// style={{
					// 	animation: "contentShow 150ms cubic-bezier(0.16, 1, 0.3, 1)",
					// }}
					className={cn(
						"DialogContent",
						"fixed top-1/2 left-1/2 z-[101] transform -translate-x-1/2 -translate-y-1/2 w-80vw max-w-450px max-h-85vh p-[25px] bg-neutral-800",
						className,
					)}
				>
					{children}
					<Dialog.Close asChild>
						<button
							type="button"
							className="inline-flex items-center justify-center absolute top-4 right-4 text-primary hover:text-primary/50 cursor-pointer"
							aria-label="Close"
						>
							<Close className="w-4 h-4" />
						</button>
					</Dialog.Close>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

export function ModalTitle({ children }: { children: React.ReactNode }) {
	return <Dialog.Title className="DialogTitle">{children}</Dialog.Title>;
}

export function ModalDescription({ children }: { children: React.ReactNode }) {
	return (
		<Dialog.Description className="DialogDescription">
			{children}
		</Dialog.Description>
	);
}
