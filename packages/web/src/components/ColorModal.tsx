"use client";

import { setColor as setColorApi } from "@/utils/api";
import { WriterContext } from "@/utils/context";
import { useOPWallet } from "@/utils/hooks";
import { signSetColor } from "@/utils/signer";
import { useMutation } from "@tanstack/react-query";
import { VisuallyHidden } from "radix-ui";
import { useContext, useEffect, useState } from "react";
import { type RgbColor, RgbColorPicker } from "react-colorful";
import {
	RGBToHex,
	hexColorToBytes32,
	setPrimaryAndSecondaryCSSVariables,
} from "../utils/utils";
import { Modal, ModalDescription, ModalTitle } from "./dsl/Modal";
import { LoadingRelic } from "./LoadingRelic";
import { Save } from "./icons/Save";
import { Undo } from "./icons/Undo";
interface ModalProps {
	open: boolean;
	onClose: () => void;
}

export function ColorModal({ open, onClose }: ModalProps) {
	const [wallet] = useOPWallet();
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

	const isSaving = isPending || saveClicked;

	return (
		<Modal
			open={open}
			className="bg-primary!"
			onClose={() => {
				setRgbColor({
					r: primaryColor[0],
					g: primaryColor[1],
					b: primaryColor[2],
				});
				setPrimaryAndSecondaryCSSVariables(primaryColor);
				onClose();
			}}
		>
			<VisuallyHidden.Root>
				<ModalTitle>Set Color</ModalTitle>
				<ModalDescription>Set the color</ModalDescription>
			</VisuallyHidden.Root>
			<div className="flex items-center justify-center">
				<RgbColorPicker
					color={rgbColor}
					onChange={(c) => {
						setRgbColor(c);
						setPrimaryAndSecondaryCSSVariables([c.r, c.g, c.b]);
					}}
				/>
			</div>
			<div className="flex items-center justify-center gap-2 mt-4">
				<button
					type="button"
					className="border border-transparent hover:border-secondary border-dashed text-secondary p-2 w-full bold text-xl disabled:hover:border-transparent disabled:opacity-30 disabled:cursor-not-allowed flex justify-center items-center cursor-pointer"
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
					<Undo className="w-5 h-5" />
				</button>
				<button
					type="button"
					className="border border-transparent hover:border-secondary border-dashed text-secondary p-2 w-full bold text-xl disabled:hover:border-transparent disabled:opacity-30 disabled:cursor-not-allowed flex justify-center items-center cursor-pointer"
					disabled={
						rgbColor.r === primaryColor[0] &&
						rgbColor.g === primaryColor[1] &&
						rgbColor.b === primaryColor[2]
					}
					onClick={async () => {
						setSaveClicked(true);
						if (!wallet) {
							console.error("No ethereum wallet available for signing");
							setSaveClicked(false);
							return;
						}
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
					<Save className="w-5 h-5" />
				</button>
			</div>
			{isSaving && (
				<div className="absolute inset-0 bg-primary flex items-center justify-center rounded-lg z-10">
					<LoadingRelic size={32} className="bg-secondary!" />
				</div>
			)}
		</Modal>
	);
}
