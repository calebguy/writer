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
	hexColorToBytes32,
	readDocumentBackgroundColor,
	getCustomBackgroundResolvedTheme,
	setPrimaryAndSecondaryCSSVariables,
	setCustomBackgroundCSSVariables,
} from "@/utils/utils";
import { usePrivy } from "@privy-io/react-auth";
import { useMutation } from "@tanstack/react-query";
import { VisuallyHidden } from "radix-ui";
import { useContext, useEffect, useState } from "react";
import { type RgbColor, RgbColorPicker } from "react-colorful";
import { Modal, ModalDescription, ModalTitle } from "./dsl/Modal";
import { Check } from "./icons/Check";
import { Close } from "./icons/Close";
import { Undo } from "./icons/Undo";

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

function getDefaultCustomBackground(): RGB {
	return readDocumentBackgroundColor() ?? [255, 255, 255];
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
	const [primaryPickerColor, setPrimaryPickerColor] = useState<RgbColor>(
		rgbToPickerColor(primaryColor),
	);
	const [backgroundPickerColor, setBackgroundPickerColor] = useState<RgbColor>(
		rgbToPickerColor(customBackgroundColor ?? getDefaultCustomBackground()),
	);
	const [backgroundWasEdited, setBackgroundWasEdited] = useState(false);
	const [saveClicked, setSaveClicked] = useState(false);

	useEffect(() => {
		if (!open) return;
		setPrimaryPickerColor(rgbToPickerColor(primaryColor));
		setBackgroundPickerColor(
			rgbToPickerColor(customBackgroundColor ?? getDefaultCustomBackground()),
		);
		setBackgroundWasEdited(false);
	}, [customBackgroundColor, primaryColor, open]);

	const selectedColor =
		activeTarget === "primary" ? primaryPickerColor : backgroundPickerColor;
	const nextPrimaryColor = pickerColorToRGB(primaryPickerColor);
	const nextBackgroundColor = pickerColorToRGB(backgroundPickerColor);
	const primaryHex = RGBToHex(nextPrimaryColor);
	const backgroundHex = RGBToHex(nextBackgroundColor);
	const hasPrimaryColorChanged = !colorsMatch(nextPrimaryColor, primaryColor);
	const hasBackgroundChanged =
		backgroundWasEdited &&
		!colorsMatch(nextBackgroundColor, customBackgroundColor);
	const hasChanges = hasPrimaryColorChanged || hasBackgroundChanged;
	const isSaving = themeIsPending || saveClicked;

	const backgroundRequiresCustomTheme =
		activeTarget === "background" && getStoredThemeMode() !== "custom";

	const previewCustomBackground = (background: RGB) => {
		const resolvedTheme = getCustomBackgroundResolvedTheme(background);
		document.documentElement.dataset.theme = resolvedTheme;
		document.documentElement.dataset.themeMode = "custom";
		setCustomBackgroundCSSVariables(background, resolvedTheme);
	};

	const selectColorTarget = (target: ThemeColorTarget) => {
		setActiveTarget(target);
		if (target === "background") {
			previewCustomBackground(nextBackgroundColor);
		}
	};

	const resetColors = () => {
		setPrimaryPickerColor(rgbToPickerColor(primaryColor));
		setBackgroundPickerColor(
			rgbToPickerColor(customBackgroundColor ?? getDefaultCustomBackground()),
		);
		setPrimaryAndSecondaryCSSVariables(primaryColor);
		applyThemeMode(getStoredThemeMode());
	};

	const updateSelectedColor = (color: RgbColor) => {
		if (activeTarget === "primary") {
			setPrimaryPickerColor(color);
			setPrimaryAndSecondaryCSSVariables(pickerColorToRGB(color));
			return;
		}
		setBackgroundPickerColor(color);
		setBackgroundWasEdited(true);
		previewCustomBackground(pickerColorToRGB(color));
	};

	const closeAndReset = () => {
		resetColors();
		onClose();
	};

	const saveTheme = async () => {
		setSaveClicked(true);
		if (!wallet) {
			console.error("No ethereum wallet available for theme update");
			setSaveClicked(false);
			return;
		}

		const previousPrimaryColor = primaryColor;
		const previousBackgroundColor = customBackgroundColor;
		const previousThemeMode = getStoredThemeMode();
		if (hasPrimaryColorChanged) {
			setPrimaryColor(nextPrimaryColor);
		}
		if (hasBackgroundChanged) {
			setCustomBackgroundColor(nextBackgroundColor);
			setStoredThemeMode("custom");
			applyThemeMode("custom");
		}
		onClose();

		try {
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
				customBackgroundColor: hasBackgroundChanged
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
		<Modal open={open} className="bg-primary!" onClose={closeAndReset}>
			<VisuallyHidden.Root>
				<ModalTitle>Customize Theme</ModalTitle>
				<ModalDescription>
					Set your primary and custom background colors
				</ModalDescription>
			</VisuallyHidden.Root>
			<div className="flex items-center justify-center">
				<RgbColorPicker color={selectedColor} onChange={updateSelectedColor} />
			</div>
			<div className="mt-4 grid grid-cols-2 rounded-full bg-background/10 p-1 text-sm ring-1 ring-background/30 backdrop-blur-[1px]">
				<button
					type="button"
					className="flex cursor-pointer items-center justify-center gap-2 rounded-full px-3 py-2 text-background transition-[background-color,color,transform,opacity] duration-150 hover:bg-background/15 active:scale-[0.98] data-[active=true]:bg-background/95 data-[active=true]:text-primary"
					data-active={activeTarget === "primary"}
					onClick={() => selectColorTarget("primary")}
				>
					<span
						className="h-3 w-3 rounded-full ring-1 ring-primary/40"
						style={{ backgroundColor: primaryHex }}
					/>
					<span>Front</span>
				</button>
				<button
					type="button"
					className="flex cursor-pointer items-center justify-center gap-2 rounded-full px-3 py-2 text-background transition-[background-color,color,transform,opacity] duration-150 hover:bg-background/15 active:scale-[0.98] data-[active=true]:bg-background/95 data-[active=true]:text-primary"
					data-active={activeTarget === "background"}
					onClick={() => selectColorTarget("background")}
				>
					<span
						className="h-3 w-3 rounded-full ring-1 ring-primary/40"
						style={{ backgroundColor: backgroundHex }}
					/>
					<span>Back</span>
				</button>
			</div>
			{backgroundRequiresCustomTheme && (
				<p className="mt-3 text-center text-xs text-background/80">
					Background appears in Custom mode.
				</p>
			)}
			<div className="mt-4 flex items-center justify-center gap-2">
				<button
					type="button"
					aria-label="Cancel theme changes"
					onClick={closeAndReset}
					className="flex w-full cursor-pointer items-center justify-center rounded-lg bg-background/75 px-4 py-1 text-primary backdrop-blur-[1px] transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
				>
					<Close className="w-5 h-5" />
				</button>
				<button
					type="button"
					aria-label="Reset theme changes"
					className="flex w-full cursor-pointer items-center justify-center rounded-lg bg-background/75 px-4 py-1 text-primary backdrop-blur-[1px] transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
					onClick={resetColors}
					disabled={!hasChanges}
				>
					<Undo className="w-5 h-5" />
				</button>
				<button
					type="button"
					aria-label="Save theme"
					className="flex w-full cursor-pointer items-center justify-center rounded-lg bg-background/75 px-4 py-1 text-primary backdrop-blur-[1px] transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
					disabled={!hasChanges || isSaving}
					onClick={() => void saveTheme()}
				>
					<Check className="w-5 h-5" />
				</button>
			</div>
		</Modal>
	);
}
