"use client";

import { setColor as setColorApi } from "@/utils/api";
import { WriterContext } from "@/utils/context";
import { useOPWallet } from "@/utils/hooks";
import { signSetColor } from "@/utils/signer";
import { usePrivy } from "@privy-io/react-auth";
import { useMutation } from "@tanstack/react-query";
import { useContext, useEffect, useState } from "react";
import { type RgbColor, RgbColorPicker } from "react-colorful";
import {
	RGBToHex,
	hexColorToBytes32,
	setPrimaryAndSecondaryCSSVariables,
} from "../utils/utils";
import {
	DynamicDrawerContent,
	DynamicDrawerRoot,
	DynamicDrawerTitle,
} from "./dsl/DynamicDrawer";
import { LoadingRelic } from "./LoadingRelic";
import { Save } from "./icons/Save";
import { Undo } from "./icons/Undo";

interface ColorDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ColorDrawer({ open, onOpenChange }: ColorDrawerProps) {
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
	const hasChanges =
		rgbColor.r !== primaryColor[0] ||
		rgbColor.g !== primaryColor[1] ||
		rgbColor.b !== primaryColor[2];

	const handleClose = () => {
		setRgbColor({
			r: primaryColor[0],
			g: primaryColor[1],
			b: primaryColor[2],
		});
		setPrimaryAndSecondaryCSSVariables(primaryColor);
		onOpenChange(false);
	};

	return (
		<DynamicDrawerRoot open={open} onOpenChange={(o) => {
			if (!o) handleClose();
			else onOpenChange(o);
		}}>
			<DynamicDrawerContent className="bg-primary!" loading={isSaving}>
				<DynamicDrawerTitle className="sr-only">Set Color</DynamicDrawerTitle>
				{isSaving ? (
					<div className="flex items-center justify-center py-20">
						<LoadingRelic size={32} className="bg-secondary!" />
					</div>
				) : (
					<div className="flex flex-col items-center gap-6 py-4">
						<RgbColorPicker
							color={rgbColor}
							onChange={(c) => {
								setRgbColor(c);
								setPrimaryAndSecondaryCSSVariables([c.r, c.g, c.b]);
							}}
							style={{ width: "100%", maxWidth: "320px" }}
						/>
						<div className="flex items-center justify-center gap-2 w-full max-w-[320px]">
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
								disabled={!hasChanges}
							>
								<Undo className="w-5 h-5" />
							</button>
							<button
								type="button"
								className="border border-transparent hover:border-secondary border-dashed text-secondary p-2 w-full bold text-xl disabled:hover:border-transparent disabled:opacity-30 disabled:cursor-not-allowed flex justify-center items-center cursor-pointer"
								disabled={!hasChanges}
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
									onOpenChange(false);
								}}
							>
								<Save className="w-5 h-5" />
							</button>
						</div>
					</div>
				)}
			</DynamicDrawerContent>
		</DynamicDrawerRoot>
	);
}
