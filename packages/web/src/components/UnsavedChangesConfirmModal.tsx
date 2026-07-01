"use client";

import { Modal, ModalTitle } from "@/components/dsl/Modal";
import { Check } from "@/components/icons/Check";
import { Close } from "@/components/icons/Close";

type UnsavedChangesConfirmModalProps = {
	title: string | null;
	onResolve: (confirmed: boolean) => void;
};

export function UnsavedChangesConfirmModal({
	title,
	onResolve,
}: UnsavedChangesConfirmModalProps) {
	return (
		<Modal
			open={title !== null}
			onClose={() => onResolve(false)}
			className="w-auto min-w-64 max-w-[340px] p-4 bg-surface"
		>
			<div className="flex flex-col gap-4 text-center">
				<ModalTitle>{title}</ModalTitle>
				<div className="flex items-center justify-center gap-2">
					<button
						type="button"
						aria-label="Keep editing"
						onClick={() => onResolve(false)}
						className="px-4 py-1 text-neutral-500 dark:text-neutral-400 hover:text-primary cursor-pointer bg-surface rounded-lg w-full flex items-center justify-center"
					>
						<Close className="w-5 h-5" />
					</button>
					<button
						type="button"
						aria-label="Discard unsaved changes"
						onClick={() => onResolve(true)}
						className="px-4 py-1 text-neutral-500 dark:text-neutral-400 hover:text-primary cursor-pointer bg-surface rounded-lg w-full flex items-center justify-center"
					>
						<Check className="w-5 h-5" />
					</button>
				</div>
			</div>
		</Modal>
	);
}
