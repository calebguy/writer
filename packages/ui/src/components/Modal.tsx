import * as Dialog from "@radix-ui/react-dialog";
import { useMutation } from "@tanstack/react-query";
import { VisuallyHidden } from "radix-ui";
import { useEffect, useState } from "react";
import { type RgbColor, RgbColorPicker } from "react-colorful";
import { setColor as setColorApi } from "../utils/api";
import { cn } from "../utils/cn";
import color from "../utils/color";
import { useFirstWallet } from "../utils/hooks";
import { signSetColor } from "../utils/signer";
import { RGBToHex, hexColorToBytes32 } from "../utils/utils";
import { Blob } from "./icons/Blob";
import { Close } from "./icons/Close";
interface ModalProps {
	open: boolean;
	onClose: () => void;
}

export function Modal({ open, onClose }: ModalProps) {
	const wallet = useFirstWallet();
	const [saveClicked, setSaveClicked] = useState(false);
	const { mutateAsync, isPending } = useMutation({
		mutationFn: setColorApi,
		mutationKey: ["set-color"],
		onSuccess: () => {
			setSaveClicked(false);
			onClose();
		},
	});

	const [rgbColor, setRgbColor] = useState<RgbColor>({
		r: color.primaryColor[0],
		g: color.primaryColor[1],
		b: color.primaryColor[2],
	});

	useEffect(() => {
		setRgbColor({
			r: color.primaryColor[0],
			g: color.primaryColor[1],
			b: color.primaryColor[2],
		});
	}, [color.primaryColor]);

	return (
		<Dialog.Root open={open} onOpenChange={onClose}>
			<Dialog.Portal>
				<Dialog.Overlay className="DialogOverlay" />
				<Dialog.Content className={cn("DialogContent", "bg-secondary")}>
					<VisuallyHidden.Root>
						<Dialog.Title className="DialogTitle">Set Color</Dialog.Title>
						<Dialog.Description className="DialogDescription">
							Set the color
						</Dialog.Description>
					</VisuallyHidden.Root>
					<div className="flex items-center justify-center py-4">
						<RgbColorPicker
							className="!border-primary !border-dashed !border"
							color={rgbColor}
							onChange={(c) => {
								setRgbColor(c);
								color.setColorFromRGB([c.r, c.g, c.b]);
							}}
						/>
						<div className="flex flex-col items-center justify-center ml-6">
							<Blob className="w-44 h-44 text-primary" />
						</div>
					</div>
					<button
						type="button"
						className="border border-transparent hover:border-primary border-dashed text-primary p-2 w-full bold text-xl"
						onClick={async () => {
							setSaveClicked(true);
							const hexColor = hexColorToBytes32(
								RGBToHex(rgbColor.r, rgbColor.g, rgbColor.b),
							);
							const { signature, nonce } = await signSetColor(wallet, {
								hexColor,
							});
							await mutateAsync({ signature, nonce, hexColor });
						}}
					>
						{isPending || saveClicked ? "..." : "Save"}
					</button>
					<Dialog.Close asChild>
						<button
							type="button"
							className="IconButton text-primary hover:text-primary/50"
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
