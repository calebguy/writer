"use client";

import { updateTheme as updateThemeApi } from "@/utils/api";
import { WriterContext } from "@/utils/context";
import { useOPWallet } from "@/utils/hooks";
import {
	applyThemeMode,
	getStoredThemeMode,
	setStoredThemeMode,
} from "@/utils/theme";
import {
	type RGB,
	RGBToHex,
	getCustomBackgroundResolvedTheme,
	hexColorToBytes32,
	readDocumentBackgroundColor,
	setCustomBackgroundCSSVariables,
	setPrimaryAndSecondaryCSSVariables,
} from "@/utils/utils";
import { usePrivy } from "@privy-io/react-auth";
import { useMutation } from "@tanstack/react-query";
import { useContext, useEffect, useState } from "react";
import { type RgbColor, RgbColorPicker } from "react-colorful";
import { Modal, ModalDescription, ModalTitle } from "./dsl/Modal";
import { Check } from "./icons/Check";
import { Close } from "./icons/Close";

type ThemeColorTarget = "primary" | "background";

interface ModalProps {
	open: boolean;
	onClose: () => void;
}

function rgbToPickerColor(rgb: RGB): RgbColor {
	return { r: rgb[0], g: rgb[1], b: rgb[2] };
}

function pickerColorToRGB(color: RgbColor): RGB {
	return [color.r, color.g, color.b];
}

function colorsMatch(left: RGB | null, right: RGB | null) {
	if (!left || !right) return left === right;
	return left[0] === right[0] && left[1] === right[1] && left[2] === right[2];
}

function getCurrentBackgroundColor(customBackgroundColor: RGB | null): RGB {
	return (
		customBackgroundColor ?? readDocumentBackgroundColor() ?? [255, 255, 255]
	);
}

export function ThemeModal({ open, onClose }: ModalProps) {
	const [wallet] = useOPWallet();
	const { getAccessToken } = usePrivy();
	const { mutateAsync: saveThemeSettings, isPending: themeIsPending } =
		useMutation({
			mutationFn: updateThemeApi,
			mutationKey: ["update-theme"],
		});
	const {
		customBackgroundColor,
		primaryColor,
		setCustomBackgroundColor,
		setPrimaryColor,
	} = useContext(WriterContext);

	const [activeTarget, setActiveTarget] = useState<ThemeColorTarget>("primary");
	const [initialBackgroundColor, setInitialBackgroundColor] = useState<RGB>(
		() => getCurrentBackgroundColor(customBackgroundColor),
	);
	const [primaryPickerColor, setPrimaryPickerColor] = useState<RgbColor>(
		rgbToPickerColor(primaryColor),
	);
	const [backgroundPickerColor, setBackgroundPickerColor] = useState<RgbColor>(
		rgbToPickerColor(initialBackgroundColor),
	);
	const [saveClicked, setSaveClicked] = useState(false);

	useEffect(() => {
		if (!open) return;
		const currentBackground = getCurrentBackgroundColor(customBackgroundColor);
		setInitialBackgroundColor(currentBackground);
		setActiveTarget("primary");
		setPrimaryPickerColor(rgbToPickerColor(primaryColor));
		setBackgroundPickerColor(rgbToPickerColor(currentBackground));
	}, [customBackgroundColor, primaryColor, open]);

	const selectedColor =
		activeTarget === "background" ? backgroundPickerColor : primaryPickerColor;
	const nextPrimaryColor = pickerColorToRGB(primaryPickerColor);
	const nextBackgroundColor = pickerColorToRGB(backgroundPickerColor);
	const primaryHex = RGBToHex(nextPrimaryColor);
	const backgroundHex = RGBToHex(nextBackgroundColor);
	const hasPrimaryColorChanged = !colorsMatch(nextPrimaryColor, primaryColor);
	const hasBackgroundChanged = !colorsMatch(
		nextBackgroundColor,
		initialBackgroundColor,
	);
	const shouldPersistBackground =
		hasBackgroundChanged || (hasPrimaryColorChanged && !customBackgroundColor);
	const hasChanges = hasPrimaryColorChanged || hasBackgroundChanged;
	const isSaving = themeIsPending || saveClicked;

	const previewCustomBackground = (background: RGB) => {
		const resolvedTheme = getCustomBackgroundResolvedTheme(background);
		document.documentElement.dataset.theme = resolvedTheme;
		document.documentElement.dataset.themeMode = "custom";
		setCustomBackgroundCSSVariables(background, resolvedTheme);
	};

	const resetPreview = () => {
		setActiveTarget("primary");
		setPrimaryPickerColor(rgbToPickerColor(primaryColor));
		setBackgroundPickerColor(rgbToPickerColor(initialBackgroundColor));
		setPrimaryAndSecondaryCSSVariables(primaryColor);
		if (customBackgroundColor) {
			previewCustomBackground(customBackgroundColor);
			return;
		}
		applyThemeMode("system");
	};

	const updateSelectedColor = (color: RgbColor) => {
		if (activeTarget === "primary") {
			setPrimaryPickerColor(color);
			setPrimaryAndSecondaryCSSVariables(pickerColorToRGB(color));
			return;
		}
		setBackgroundPickerColor(color);
		previewCustomBackground(pickerColorToRGB(color));
	};

	const closeAndReset = () => {
		resetPreview();
		onClose();
	};

	const saveTheme = async () => {
		setSaveClicked(true);
		const previousPrimaryColor = primaryColor;
		const previousBackgroundColor = customBackgroundColor;
		const previousThemeMode = getStoredThemeMode();
		const shouldSaveRemoteTheme =
			hasPrimaryColorChanged || shouldPersistBackground;

		try {
			setStoredThemeMode("custom");
			if (hasPrimaryColorChanged) {
				setPrimaryColor(nextPrimaryColor);
			}
			if (shouldPersistBackground) {
				setCustomBackgroundColor(nextBackgroundColor);
			}
			applyThemeMode("custom");
			onClose();

			if (!shouldSaveRemoteTheme) return;
			if (!wallet) {
				throw new Error("No ethereum wallet available for theme update");
			}
			const authToken = await getAccessToken();
			if (!authToken) {
				throw new Error("No auth token found");
			}
			await saveThemeSettings({
				address: wallet.address,
				authToken,
				color: hasPrimaryColorChanged
					? hexColorToBytes32(RGBToHex(nextPrimaryColor))
					: undefined,
				customBackgroundColor: shouldPersistBackground
					? hexColorToBytes32(RGBToHex(nextBackgroundColor))
					: undefined,
			});
		} catch (error) {
			console.error("Failed to save theme", error);
			setPrimaryColor(previousPrimaryColor);
			setCustomBackgroundColor(previousBackgroundColor);
			setStoredThemeMode(previousThemeMode);
			applyThemeMode(previousThemeMode);
		} finally {
			setSaveClicked(false);
		}
	};

	return (
		<Modal
			open={open}
			className="w-[min(28rem,calc(100vw-2rem))] bg-surface! text-foreground shadow-[0_18px_80px_rgb(0_0_0/0.28)]"
			onClose={closeAndReset}
		>
			<div className="space-y-4">
				<div className="space-y-1 text-center">
					<ModalTitle>Colors</ModalTitle>
					<ModalDescription>Choose the front and back colors.</ModalDescription>
				</div>
				<div className="flex items-center justify-center rounded-xs bg-background/65 p-3 ring-1 ring-border/70">
					<RgbColorPicker
						color={selectedColor}
						onChange={updateSelectedColor}
					/>
				</div>
				<div className="grid grid-cols-2 rounded-full bg-background/65 p-1 text-sm ring-1 ring-border/70">
					<button
						type="button"
						className="flex cursor-pointer items-center justify-center gap-2 rounded-full px-3 py-2 text-muted transition-[background-color,color,transform] duration-150 hover:text-primary active:scale-[0.98] data-[active=true]:bg-primary data-[active=true]:text-background"
						data-active={activeTarget === "primary"}
						onClick={() => setActiveTarget("primary")}
					>
						<span
							className="h-3 w-3 rounded-full ring-1 ring-border"
							style={{ backgroundColor: primaryHex }}
						/>
						<span>Front</span>
					</button>
					<button
						type="button"
						className="flex cursor-pointer items-center justify-center gap-2 rounded-full px-3 py-2 text-muted transition-[background-color,color,transform] duration-150 hover:text-primary active:scale-[0.98] data-[active=true]:bg-primary data-[active=true]:text-background"
						data-active={activeTarget === "background"}
						onClick={() => setActiveTarget("background")}
					>
						<span
							className="h-3 w-3 rounded-full ring-1 ring-border"
							style={{ backgroundColor: backgroundHex }}
						/>
						<span>Back</span>
					</button>
				</div>
				<div className="grid grid-cols-2 gap-2">
					<button
						type="button"
						aria-label="Cancel color changes"
						onClick={closeAndReset}
						className="flex cursor-pointer items-center justify-center rounded-lg bg-background/75 px-4 py-2 text-primary transition-[background-color,transform,opacity] duration-150 hover:bg-background active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
					>
						<Close className="h-5 w-5" />
					</button>
					<button
						type="button"
						aria-label="Save colors"
						className="flex cursor-pointer items-center justify-center rounded-lg bg-primary px-4 py-2 text-background transition-[background-color,transform,opacity] duration-150 hover:bg-secondary active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
						disabled={!hasChanges || isSaving}
						onClick={() => void saveTheme()}
					>
						<Check className="h-5 w-5" />
					</button>
				</div>
			</div>
		</Modal>
	);
}
