"use client";

import { updateTheme as updateThemeApi } from "@/utils/api";
import { WriterContext } from "@/utils/context";
import { useTargetWallet } from "@/utils/hooks";
import { type ThemeMode, applyThemeMode } from "@/utils/theme";
import {
	type RGB,
	RGBToHex,
	hexColorToBytes32,
	getCustomBackgroundResolvedTheme,
	readDocumentBackgroundColor,
	setCustomBackgroundCSSVariables,
	setPrimaryAndSecondaryCSSVariables,
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
	const [wallet] = useTargetWallet();
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
	const [initialHasBackground, setInitialHasBackground] = useState(false);
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
		setInitialHasBackground(customBackgroundColor !== null);
		setActiveTarget("primary");
		setPrimaryPickerColor(rgbToPickerColor(primaryColor));
		setBackgroundPickerColor(
			rgbToPickerColor(customBackgroundColor ?? getDefaultCustomBackground()),
		);
		setBackgroundWasEdited(false);
	}, [customBackgroundColor, primaryColor, open]);

	const selectedColor =
		activeTarget === "background" ? backgroundPickerColor : primaryPickerColor;
	const nextPrimaryColor = pickerColorToRGB(primaryPickerColor);
	const nextBackgroundColor = pickerColorToRGB(backgroundPickerColor);
	const primaryHex = RGBToHex(nextPrimaryColor);
	const backgroundHex = RGBToHex(nextBackgroundColor);
	const hasThemeModeChanged =
		(customBackgroundColor !== null || backgroundWasEdited) !==
		initialHasBackground;
	const hasPrimaryColorChanged = !colorsMatch(nextPrimaryColor, primaryColor);
	const hasBackgroundChanged =
		backgroundWasEdited &&
		!colorsMatch(nextBackgroundColor, customBackgroundColor);
	const hasChanges =
		hasThemeModeChanged || hasPrimaryColorChanged || hasBackgroundChanged;
	const isSaving = themeIsPending || saveClicked;

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

	const resetPreview = () => {
		setInitialHasBackground(customBackgroundColor !== null);
		setActiveTarget("primary");
		setPrimaryPickerColor(rgbToPickerColor(primaryColor));
		setBackgroundPickerColor(
			rgbToPickerColor(customBackgroundColor ?? getDefaultCustomBackground()),
		);
		setBackgroundWasEdited(false);
		setPrimaryAndSecondaryCSSVariables(primaryColor);
		applyThemeMode(customBackgroundColor ? "custom" : "system");
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
		resetPreview();
		onClose();
	};

	const saveTheme = async () => {
		setSaveClicked(true);
		const previousPrimaryColor = primaryColor;
		const previousBackgroundColor = customBackgroundColor;
		const previousThemeMode: ThemeMode = previousBackgroundColor
			? "custom"
			: "system";
		const nextThemeMode: ThemeMode =
			customBackgroundColor || backgroundWasEdited ? "custom" : "system";
		const shouldSaveRemoteTheme =
			hasPrimaryColorChanged || hasBackgroundChanged;
		try {
			if (hasPrimaryColorChanged) {
				setPrimaryColor(nextPrimaryColor);
			}
			if (hasBackgroundChanged) {
				setCustomBackgroundColor(nextBackgroundColor);
			}
			applyThemeMode(nextThemeMode);
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
				customBackgroundColor: hasBackgroundChanged
					? hexColorToBytes32(RGBToHex(nextBackgroundColor))
					: undefined,
			});
		} catch (error) {
			console.error("Failed to save theme", error);
			setPrimaryColor(previousPrimaryColor);
			setCustomBackgroundColor(previousBackgroundColor);
			applyThemeMode(previousThemeMode);
		} finally {
			setSaveClicked(false);
		}
	};

	return (
		<Modal open={open} className="bg-primary!" onClose={closeAndReset}>
			<VisuallyHidden.Root>
				<ModalTitle>Customize Theme</ModalTitle>
				<ModalDescription>Set text and page colors</ModalDescription>
			</VisuallyHidden.Root>
			<div className="mt-4 flex items-center justify-center">
				<div className="relative">
					<div className="absolute top-4 -left-3 z-10 flex flex-col gap-2">
						<button
							type="button"
							aria-label="Edit text color"
							aria-pressed={activeTarget === "primary"}
							title="Text"
							className="h-6 w-6 cursor-pointer rounded-full border border-white/55 shadow-sm transition-[opacity,transform,box-shadow] duration-150 hover:opacity-100 active:scale-95 data-[active=false]:opacity-80 data-[active=true]:scale-110 data-[active=true]:ring-2 data-[active=true]:ring-white"
							data-active={activeTarget === "primary"}
							style={{ backgroundColor: primaryHex }}
							onClick={() => selectColorTarget("primary")}
						/>
						<button
							type="button"
							aria-label="Edit page color"
							aria-pressed={activeTarget === "background"}
							title="Page"
							className="h-6 w-6 cursor-pointer rounded-full border border-white/55 shadow-sm transition-[opacity,transform,box-shadow] duration-150 hover:opacity-100 active:scale-95 data-[active=false]:opacity-80 data-[active=true]:scale-110 data-[active=true]:ring-2 data-[active=true]:ring-white"
							data-active={activeTarget === "background"}
							style={{ backgroundColor: backgroundHex }}
							onClick={() => selectColorTarget("background")}
						/>
					</div>
					<RgbColorPicker
						color={selectedColor}
						onChange={updateSelectedColor}
					/>
				</div>
			</div>
			<div className="mt-4 flex items-center justify-center gap-2">
				<button
					type="button"
					aria-label="Cancel theme changes"
					onClick={closeAndReset}
					className="flex w-full cursor-pointer items-center justify-center rounded-lg bg-background/75 px-4 py-1 text-primary backdrop-blur-[1px] transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
				>
					<Close className="h-5 w-5" />
				</button>
				<button
					type="button"
					aria-label="Reset theme changes"
					className="flex w-full cursor-pointer items-center justify-center rounded-lg bg-background/75 px-4 py-1 text-primary backdrop-blur-[1px] transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
					onClick={resetPreview}
					disabled={!hasChanges}
				>
					<Undo className="h-5 w-5" />
				</button>
				<button
					type="button"
					aria-label="Save theme"
					className="flex w-full cursor-pointer items-center justify-center rounded-lg bg-background/75 px-4 py-1 text-primary backdrop-blur-[1px] transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
					disabled={!hasChanges || isSaving}
					onClick={() => void saveTheme()}
				>
					<Check className="h-5 w-5" />
				</button>
			</div>
		</Modal>
	);
}
