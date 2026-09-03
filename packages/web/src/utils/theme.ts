import {
	type RGB,
	RGBToHex,
	clearInlineCustomBackgroundCSSVariables,
	getCustomBackgroundResolvedTheme,
	hexToRGB,
	setCustomBackgroundCSSVariables,
} from "./utils";

export type ThemeMode = "system" | "custom";
export type ResolvedTheme = "light" | "dark";

const PRIMARY_COLOR_STORAGE_KEY = "writer-primary-color";
const CUSTOM_BACKGROUND_STORAGE_KEY = "writer-custom-background-color";
const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";
const THEME_CHANGE_EVENT = "writer:theme-changed";

function resolveSystemTheme(): ResolvedTheme {
	if (typeof window === "undefined") return "dark";
	return window.matchMedia(DARK_MEDIA_QUERY).matches ? "dark" : "light";
}

export function getStoredThemeMode(): ThemeMode {
	return getStoredCustomBackgroundColor() ? "custom" : "system";
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
	if (mode === "custom") {
		const customBackground = getStoredCustomBackgroundColor();
		return customBackground
			? getCustomBackgroundResolvedTheme(customBackground)
			: resolveSystemTheme();
	}
	return resolveSystemTheme();
}

export function applyThemeMode(mode: ThemeMode): ResolvedTheme {
	const customBackground =
		mode === "custom" ? getStoredCustomBackgroundColor() : null;
	const effectiveMode: ThemeMode = customBackground ? "custom" : "system";
	const resolved = customBackground
		? getCustomBackgroundResolvedTheme(customBackground)
		: resolveSystemTheme();
	if (typeof document !== "undefined") {
		document.documentElement.dataset.theme = resolved;
		document.documentElement.dataset.themeMode = effectiveMode;
		if (customBackground) {
			setCustomBackgroundCSSVariables(customBackground, resolved);
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
