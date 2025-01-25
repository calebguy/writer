import { useMutation } from "@tanstack/react-query";
import { VisuallyHidden } from "radix-ui";
import { useContext, useEffect, useState } from "react";
import { type RgbColor, RgbColorPicker } from "react-colorful";
import { WriterContext } from "../context";
import { setColor as setColorApi } from "../utils/api";
import { useFirstWallet } from "../utils/hooks";
import { signSetColor } from "../utils/signer";
import {
	type RGB,
	RGBToHex,
	hexColorToBytes32,
	setCSSVariableFromRGB,
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
		setRgbColor({
			r: primaryColor[0],
			g: primaryColor[1],
			b: primaryColor[2],
		});
	}, [primaryColor]);

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
						const rgb: RGB = [c.r, c.g, c.b];
						setCSSVariableFromRGB("--color-primary", rgb);
						const secondaryColor = rgb.map((c) => c - 100);
						setCSSVariableFromRGB("--color-secondary", secondaryColor as RGB);
					}}
				/>
				<div className="flex flex-col items-center justify-center ml-6">
					<Blob className="w-44 h-44 text-primary" />
				</div>
			</div>
			<div className="flex items-center justify-center gap-2">
				<button
					type="button"
					className="border border-transparent hover:border-primary border-dashed text-primary p-2 w-full bold text-xl"
					onClick={() => {
						const rgb: RGB = [
							primaryColor[0],
							primaryColor[1],
							primaryColor[2],
						];
						setRgbColor({
							r: rgb[0],
							g: rgb[1],
							b: rgb[2],
						});
						setCSSVariableFromRGB("--color-primary", rgb);
						const secondaryColor = rgb.map((c) => c - 100);
						setCSSVariableFromRGB("--color-secondary", secondaryColor as RGB);
					}}
				>
					reset
				</button>
				<button
					type="button"
					className="border border-transparent hover:border-primary border-dashed text-primary p-2 w-full bold text-xl"
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
