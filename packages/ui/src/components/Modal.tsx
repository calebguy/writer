import * as Dialog from "@radix-ui/react-dialog";
import { VisuallyHidden } from "radix-ui";
import { useEffect, useState } from "react";
import { HslStringColorPicker } from "react-colorful";
import { cn } from "../utils/cn";
import { Blob } from "./icons/Blob";
import { Close } from "./icons/Close";

interface ModalProps {
	open: boolean;
	onClose: () => void;
}

export function Modal({ open, onClose }: ModalProps) {
	const rootStyles = getComputedStyle(document.documentElement);
	const h = rootStyles.getPropertyValue("--color-primary-h").trim();
	const s = rootStyles.getPropertyValue("--color-primary-s").trim();
	const l = rootStyles.getPropertyValue("--color-primary-l").trim();
	const hsl = `hsl(${h}, ${s}, ${l})`;
	const [color, setColor] = useState(hsl);

	useEffect(() => {
		// Regular expression to extract HSL components
		const hslRegex = /hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/;
		const match = color.match(hslRegex);
		if (match) {
			const hue = Number.parseInt(match[1], 10); // 137
			const saturation = Number.parseInt(match[2], 10); // 90
			const lightness = Number.parseInt(match[3], 10); // 50

			document.documentElement.style.setProperty(
				"--color-primary-h",
				hue.toString(),
			);
			document.documentElement.style.setProperty(
				"--color-primary-s",
				saturation.toString(),
			);
			document.documentElement.style.setProperty(
				"--color-primary-l",
				lightness.toString(),
			);
		}
	}, [color]);

	return (
		<Dialog.Root open={open} onOpenChange={onClose}>
			<Dialog.Portal>
				<Dialog.Overlay className="DialogOverlay" />
				<Dialog.Content className={cn("DialogContent", "bg-neutral-800")}>
					<VisuallyHidden.Root>
						<Dialog.Title className="DialogTitle">Set Color</Dialog.Title>
						<Dialog.Description className="DialogDescription">
							Set the color
						</Dialog.Description>
					</VisuallyHidden.Root>
					<div className="flex items-center justify-center py-4">
						<HslStringColorPicker color={color} onChange={setColor} />
						<div className="flex flex-col items-center justify-center ml-8 bg-secondary py-9 px-6">
							<span className="text-primary text-5xl mb-3">Writer</span>
							<Blob className="w-24 h-24 text-primary rounded-lg" />
						</div>
					</div>
					<button
						type="button"
						className="hover:bg-secondary hover:text-primary p-2 w-full bold text-xl mt-4"
					>
						Save
					</button>
					<Dialog.Close asChild>
						<button
							type="button"
							className="IconButton text-primary hover:text-secondary"
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
