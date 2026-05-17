"use client";

import { Modal, ModalTitle } from "./dsl/Modal";
import { Check } from "./icons/Check";
import { Close } from "./icons/Close";

interface DeleteConfirmModalProps {
	open: boolean;
	onClose: () => void;
	onConfirm: () => void | Promise<void>;
	isDeleting?: boolean;
}

export function DeleteConfirmModal({
	open,
	onClose,
	onConfirm,
	isDeleting = false,
}: DeleteConfirmModalProps) {
	return (
		<Modal
			open={open}
			onClose={onClose}
			className="w-auto min-w-48 max-w-[260px] p-4 bg-surface"
		>
			<div className="flex flex-col gap-4 text-center">
				<ModalTitle>Delete</ModalTitle>
				<div className="flex items-center justify-center gap-2">
					<button
						type="button"
						aria-label="Cancel delete"
						onClick={onClose}
						className="px-4 py-1 text-neutral-500 dark:text-neutral-400 hover:text-primary cursor-pointer bg-surface rounded-lg w-full flex items-center justify-center"
					>
						<Close className="w-5 h-5" />
					</button>
					<button
						type="button"
						aria-label="Confirm delete"
						disabled={isDeleting}
						onClick={() => void onConfirm()}
						className="px-4 py-1 text-neutral-500 dark:text-neutral-400 hover:text-primary cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-surface rounded-lg w-full flex items-center justify-center"
					>
						<Check className="w-5 h-5" />
					</button>
				</div>
			</div>
		</Modal>
	);
}
