"use client";

import { updateTheme as updateThemeApi } from "@/utils/api";
import { WriterContext } from "@/utils/context";
import { useOPWallet } from "@/utils/hooks";
import {
	type ThemeMode,
	applyThemeMode,
	getStoredThemeMode,
	setStoredThemeMode,
	subscribeSystemThemeChange,
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
import Image from "next/image";
import { VisuallyHidden } from "radix-ui";
import { useContext, useEffect, useState } from "react";
import { type RgbColor, RgbColorPicker } from "react-colorful";
import { Modal, ModalDescription, ModalTitle } from "./dsl/Modal";
import { Check } from "./icons/Check";
import { Close } from "./icons/Close";
import { Undo } from "./icons/Undo";

type ThemeColorTarget = "primary" | "background";
type ThemePreset = {
	mode: ThemeMode;
	label: string;
	src: string;
};

const THEME_PRESETS: ThemePreset[] = [
	{ mode: "light", label: "Light", src: "/images/relics/relic-10.webp" },
	{ mode: "dark", label: "Dark", src: "/images/relics/moon-3.webp" },
	{ mode: "system", label: "System", src: "/images/relics/computer-1.webp" },
	{ mode: "custom", label: "Custom", src: "/images/relics/splat-1.webp" },
];

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
function ThemePresetButton({
	preset,
	active,
	onSelect,
}: {
	preset: ThemePreset;
	active: boolean;
	onSelect: () => void;
}) {
	return (
		<button
			type="button"
			aria-label={`Use ${preset.label.toLowerCase()} theme`}
			title={preset.label}
			className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-background/20 bg-background/10 px-4 py-1 text-background transition-[background-color,transform,opacity] duration-150 hover:bg-background/15 active:scale-[0.98] data-[active=true]:bg-background/90 data-[active=true]:text-primary"
			data-active={active}
			onClick={onSelect}
		>
			<Image
				src={preset.src}
				alt={preset.label}
				width={100}
				height={100}
				className="h-5 w-5 min-w-5 shrink-0"
			/>
		</button>
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
	const [initialThemeMode, setInitialThemeMode] = useState<ThemeMode>("system");
	const [selectedThemeMode, setSelectedThemeMode] =
		useState<ThemeMode>("system");
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
		const storedThemeMode = getStoredThemeMode();
		setInitialThemeMode(storedThemeMode);
		setSelectedThemeMode(storedThemeMode);
		setActiveTarget("primary");
		setPrimaryPickerColor(rgbToPickerColor(primaryColor));
		setBackgroundPickerColor(
			rgbToPickerColor(customBackgroundColor ?? getDefaultCustomBackground()),
		);
		setBackgroundWasEdited(false);
	}, [customBackgroundColor, primaryColor, open]);

	useEffect(() => {
		if (selectedThemeMode !== "system") return;
		return subscribeSystemThemeChange(() => {
			applyThemeMode("system");
		});
	}, [selectedThemeMode]);

	const isBackgroundPickerVisible = selectedThemeMode === "custom";
	const selectedColor =
		activeTarget === "background" && isBackgroundPickerVisible
			? backgroundPickerColor
			: primaryPickerColor;
	const nextPrimaryColor = pickerColorToRGB(primaryPickerColor);
	const nextBackgroundColor = pickerColorToRGB(backgroundPickerColor);
	const primaryHex = RGBToHex(nextPrimaryColor);
	const backgroundHex = RGBToHex(nextBackgroundColor);
	const hasThemeModeChanged = selectedThemeMode !== initialThemeMode;
	const hasPrimaryColorChanged = !colorsMatch(nextPrimaryColor, primaryColor);
	const hasBackgroundChanged =
		isBackgroundPickerVisible &&
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

	const previewThemeMode = (mode: ThemeMode) => {
		if (mode === "custom") {
			previewCustomBackground(nextBackgroundColor);
			return;
		}
		applyThemeMode(mode);
	};

	const selectThemeMode = (mode: ThemeMode) => {
		setSelectedThemeMode(mode);
		if (mode !== "custom" && activeTarget === "background") {
			setActiveTarget("primary");
		}
		previewThemeMode(mode);
	};

	const selectColorTarget = (target: ThemeColorTarget) => {
		if (target === "background" && !isBackgroundPickerVisible) return;
		setActiveTarget(target);
		if (target === "background") {
			previewCustomBackground(nextBackgroundColor);
		}
	};

	const resetPreview = () => {
		setSelectedThemeMode(initialThemeMode);
		setActiveTarget("primary");
		setPrimaryPickerColor(rgbToPickerColor(primaryColor));
		setBackgroundPickerColor(
			rgbToPickerColor(customBackgroundColor ?? getDefaultCustomBackground()),
		);
		setBackgroundWasEdited(false);
		setPrimaryAndSecondaryCSSVariables(primaryColor);
		applyThemeMode(initialThemeMode);
	};

	const updateSelectedColor = (color: RgbColor) => {
		if (activeTarget === "primary" || !isBackgroundPickerVisible) {
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
		const previousThemeMode = initialThemeMode;
		const shouldSaveRemoteTheme =
			hasPrimaryColorChanged || hasBackgroundChanged;

		try {
			if (hasPrimaryColorChanged) {
				setPrimaryColor(nextPrimaryColor);
			}
			if (hasBackgroundChanged) {
				setCustomBackgroundColor(nextBackgroundColor);
			}
			setStoredThemeMode(selectedThemeMode);
			applyThemeMode(selectedThemeMode);
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
					Set color, background, and theme presets
				</ModalDescription>
			</VisuallyHidden.Root>
			<div className="mt-4 flex items-center justify-center">
				<RgbColorPicker color={selectedColor} onChange={updateSelectedColor} />
			</div>
			<div className="mt-4 grid grid-cols-4 gap-2">
				{THEME_PRESETS.map((preset) => (
					<ThemePresetButton
						key={preset.mode}
						preset={preset}
						active={selectedThemeMode === preset.mode}
						onSelect={() => selectThemeMode(preset.mode)}
					/>
				))}
			</div>
			{isBackgroundPickerVisible && (
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
			)}
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
