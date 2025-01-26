import { useMutation } from "@tanstack/react-query";
import { VisuallyHidden } from "radix-ui";
import { useContext, useEffect, useState } from "react";
import { type RgbColor, RgbColorPicker } from "react-colorful";
import { WriterContext } from "../context";
import { setColor as setColorApi } from "../utils/api";
import { useFirstWallet } from "../utils/hooks";
import { signSetColor } from "../utils/signer";
import {
	RGBToHex,
	hexColorToBytes32,
	setPrimaryAndSecondaryCSSVariables,
} from "../utils/utils";
import { Modal, ModalDescription, ModalTitle } from "./Modal";
import { Blob } from "./icons/Blob";
interface ModalProps {
	open: boolean;
	onClose: () => void;
}

export function ColorModal({ open, onClose }: ModalProps) {
	const wallet = useFirstWallet();
	const [saveClicked, setSaveClicked] = useState(false);
	const { mutateAsync, isPending } = useMutation({
		mutationFn: setColorApi,
		mutationKey: ["set-color"],
	});
	const { primaryColor, setPrimaryColor } = useContext(WriterContext);

	const [rgbColor, setRgbColor] = useState<RgbColor>({
		r: primaryColor[0],
		g: primaryColor[1],
		b: primaryColor[2],
	});

	useEffect(() => {
		if (open) {
			setRgbColor({
				r: primaryColor[0],
				g: primaryColor[1],
				b: primaryColor[2],
			});
		}
	}, [primaryColor, open]);

	return (
		<Modal open={open} onClose={onClose}>
			<VisuallyHidden.Root>
				<ModalTitle>Set Color</ModalTitle>
				<ModalDescription>Set the color</ModalDescription>
			</VisuallyHidden.Root>
			<div className="flex items-center justify-center py-4">
				<RgbColorPicker
					className="!border-primary !border-dashed !border"
					color={rgbColor}
					onChange={(c) => {
						setRgbColor(c);
						setPrimaryAndSecondaryCSSVariables([c.r, c.g, c.b]);
					}}
				/>
				<div className="flex flex-col items-center justify-center ml-6">
					<Blob className="w-44 h-44 text-primary" />
				</div>
			</div>
			<div className="flex items-center justify-center gap-2">
				<button
					type="button"
					className="border border-transparent hover:border-primary border-dashed text-primary p-2 w-full bold text-xl disabled:hover:border-transparent disabled:opacity-30 disabled:cursor-not-allowed"
					onClick={() => {
						setRgbColor({
							r: primaryColor[0],
							g: primaryColor[1],
							b: primaryColor[2],
						});
						setPrimaryAndSecondaryCSSVariables(primaryColor);
					}}
					disabled={
						rgbColor.r === primaryColor[0] &&
						rgbColor.g === primaryColor[1] &&
						rgbColor.b === primaryColor[2]
					}
				>
					reset
				</button>
				<button
					type="button"
					className="border border-transparent hover:border-primary border-dashed text-primary p-2 w-full bold text-xl disabled:hover:border-transparent disabled:opacity-30 disabled:cursor-not-allowed"
					disabled={
						rgbColor.r === primaryColor[0] &&
						rgbColor.g === primaryColor[1] &&
						rgbColor.b === primaryColor[2]
					}
					onClick={async () => {
						setSaveClicked(true);
						setPrimaryColor([rgbColor.r, rgbColor.g, rgbColor.b]);
						const hexColor = hexColorToBytes32(
							RGBToHex([rgbColor.r, rgbColor.g, rgbColor.b]),
						);
						const { signature, nonce } = await signSetColor(wallet, {
							hexColor,
						});
						await mutateAsync({ signature, nonce, hexColor });
						setSaveClicked(false);
						onClose();
					}}
				>
					{isPending || saveClicked ? "..." : "save"}
				</button>
			</div>
		</Modal>
	);
}
