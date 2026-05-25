"use client";

import { setColor as setColorApi } from "@/utils/api";
import { WriterContext } from "@/utils/context";
import { useOPWallet } from "@/utils/hooks";
import { signSetColor } from "@/utils/signer";
import { usePrivy } from "@privy-io/react-auth";
import { useMutation } from "@tanstack/react-query";
import { VisuallyHidden } from "radix-ui";
import { useContext, useEffect, useState } from "react";
import { type RgbColor, RgbColorPicker } from "react-colorful";
import {
	RGBToHex,
	hexColorToBytes32,
	setPrimaryAndSecondaryCSSVariables,
} from "../utils/utils";
import { LoadingRelic } from "./LoadingRelic";
import { Modal, ModalDescription, ModalTitle } from "./dsl/Modal";
import { Check } from "./icons/Check";
import { Close } from "./icons/Close";
import { Undo } from "./icons/Undo";
interface ModalProps {
	open: boolean;
	onClose: () => void;
}

export function ColorModal({ open, onClose }: ModalProps) {
	const [wallet] = useOPWallet();
	const { getAccessToken } = usePrivy();
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

	const resetColor = () => {
		setRgbColor({
			r: primaryColor[0],
			g: primaryColor[1],
			b: primaryColor[2],
		});
		setPrimaryAndSecondaryCSSVariables(primaryColor);
	};
	const hasColorChanged =
		rgbColor.r !== primaryColor[0] ||
		rgbColor.g !== primaryColor[1] ||
		rgbColor.b !== primaryColor[2];
	return (
		<Modal
			open={open}
			className="bg-primary!"
			onClose={() => {
				resetColor();
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
					aria-label="Cancel color change"
					onClick={() => {
						resetColor();
						onClose();
					}}
					className="px-4 py-1 rounded-lg w-full flex items-center justify-center bg-background/75 text-primary backdrop-blur-[1px] hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
				>
					<Close className="w-5 h-5" />
				</button>
				<button
					type="button"
					aria-label="Reset color"
					className="px-4 py-1 rounded-lg w-full flex items-center justify-center bg-background/75 text-primary backdrop-blur-[1px] hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
					onClick={resetColor}
					disabled={!hasColorChanged}
				>
					<Undo className="w-5 h-5" />
				</button>
				<button
					type="button"
					aria-label="Save color"
					className="px-4 py-1 rounded-lg w-full flex items-center justify-center bg-background/75 text-primary backdrop-blur-[1px] hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
					disabled={!hasColorChanged || isSaving}
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
						const authToken = await getAccessToken();
						if (!authToken) {
							console.error("No auth token found");
							setSaveClicked(false);
							return;
						}
						await mutateAsync({ signature, nonce, hexColor, authToken });
						setSaveClicked(false);
						onClose();
					}}
				>
					<Check className="w-5 h-5" />
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
