import {
	type RGB,
	RGBToHex,
	clearInlineCustomBackgroundCSSVariables,
	getCustomBackgroundResolvedTheme,
	hexToRGB,
	setCustomBackgroundCSSVariables,
} from "./utils";

export type ThemeMode = "light" | "dark" | "system" | "custom";
export type ResolvedTheme = "light" | "dark";

const THEME_STORAGE_KEY = "writer-theme";
const PRIMARY_COLOR_STORAGE_KEY = "writer-primary-color";
const CUSTOM_BACKGROUND_STORAGE_KEY = "writer-custom-background-color";
const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";
const THEME_CHANGE_EVENT = "writer:theme-changed";

function isThemeMode(value: string | null): value is ThemeMode {
	return (
		value === "light" ||
		value === "dark" ||
		value === "system" ||
		value === "custom"
	);
}

export function getStoredThemeMode(): ThemeMode {
	if (typeof window === "undefined") return "system";
	const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
	return isThemeMode(stored) ? stored : "system";
}

export function setStoredThemeMode(mode: ThemeMode) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(THEME_STORAGE_KEY, mode);
}

export function getStoredPrimaryColor(): RGB | null {
	if (typeof window === "undefined") return null;
	const stored = window.localStorage.getItem(PRIMARY_COLOR_STORAGE_KEY);
	if (!stored) return null;
	try {
		return hexToRGB(stored);
	} catch {
		return null;
	}
}

export function setStoredPrimaryColor(color: RGB) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(PRIMARY_COLOR_STORAGE_KEY, RGBToHex(color));
}

export function clearStoredPrimaryColor() {
	if (typeof window === "undefined") return;
	window.localStorage.removeItem(PRIMARY_COLOR_STORAGE_KEY);
}

export function getStoredCustomBackgroundColor(): RGB | null {
	if (typeof window === "undefined") return null;
	const stored = window.localStorage.getItem(CUSTOM_BACKGROUND_STORAGE_KEY);
	if (!stored) return null;
	try {
		return hexToRGB(stored);
	} catch {
		return null;
	}
}

export function setStoredCustomBackgroundColor(color: RGB) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(CUSTOM_BACKGROUND_STORAGE_KEY, RGBToHex(color));
}

export function clearStoredCustomBackgroundColor() {
	if (typeof window === "undefined") return;
	window.localStorage.removeItem(CUSTOM_BACKGROUND_STORAGE_KEY);
}

export function resolveThemeMode(mode: ThemeMode): ResolvedTheme {
	if (mode === "light" || mode === "dark") return mode;
	if (mode === "custom") {
		const customBackground = getStoredCustomBackgroundColor();
		return customBackground
			? getCustomBackgroundResolvedTheme(customBackground)
			: "light";
	}
	if (typeof window === "undefined") return "dark";
	return window.matchMedia(DARK_MEDIA_QUERY).matches ? "dark" : "light";
}

export function applyThemeMode(mode: ThemeMode): ResolvedTheme {
	const resolved = resolveThemeMode(mode);
	if (typeof document !== "undefined") {
		document.documentElement.dataset.theme = resolved;
		document.documentElement.dataset.themeMode = mode;
		if (mode === "custom") {
			const customBackground = getStoredCustomBackgroundColor();
			if (customBackground) {
				setCustomBackgroundCSSVariables(customBackground, resolved);
			} else {
				clearInlineCustomBackgroundCSSVariables();
			}
		} else {
			clearInlineCustomBackgroundCSSVariables();
		}
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent(THEME_CHANGE_EVENT, { detail: resolved }),
			);
		}
	}
	return resolved;
}

export function onThemeChange(
	listener: (resolvedTheme: ResolvedTheme) => void,
) {
	if (typeof window === "undefined") return () => {};
	const handler = (event: Event) => {
		listener((event as CustomEvent<ResolvedTheme>).detail);
	};
	window.addEventListener(THEME_CHANGE_EVENT, handler);
	return () => window.removeEventListener(THEME_CHANGE_EVENT, handler);
}

export function subscribeSystemThemeChange(
	onChange: (resolvedTheme: ResolvedTheme) => void,
) {
	if (typeof window === "undefined") return () => {};

	const mediaQuery = window.matchMedia(DARK_MEDIA_QUERY);
	const listener = (event: MediaQueryListEvent) => {
		onChange(event.matches ? "dark" : "light");
	};

	mediaQuery.addEventListener("change", listener);
	return () => mediaQuery.removeEventListener("change", listener);
}
