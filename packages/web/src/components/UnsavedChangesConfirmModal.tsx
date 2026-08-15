"use client";

import { Modal, ModalTitle } from "@/components/dsl/Modal";
import type { UnsavedChangesPrompt } from "@/utils/context";
import { Check } from "@/components/icons/Check";
import { Close } from "@/components/icons/Close";

type UnsavedChangesConfirmModalProps = {
	prompt: UnsavedChangesPrompt | null;
	onResolve: (confirmed: boolean) => void;
};

export function UnsavedChangesConfirmModal({
	prompt,
	onResolve,
}: UnsavedChangesConfirmModalProps) {
	const closeLabel = "Keep editing";
	const confirmLabel = "Discard unsaved changes";

	return (
		<Modal
			open={prompt !== null}
			onClose={() => onResolve(false)}
			className="w-auto min-w-64 max-w-[340px] p-4 bg-surface"
		>
			<div className="flex flex-col gap-4 text-center">
				<ModalTitle>{prompt?.title}</ModalTitle>
				<div className="flex items-center justify-center gap-2">
					<button
						type="button"
						aria-label={closeLabel}
						onClick={() => onResolve(false)}
						className="px-4 py-1 text-neutral-500 dark:text-neutral-400 hover:text-primary cursor-pointer bg-surface rounded-lg w-full flex items-center justify-center"
					>
						<Close className="w-5 h-5" />
					</button>
					<button
						type="button"
						aria-label={confirmLabel}
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
