export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const THEME_STORAGE_KEY = "writer-theme";
const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";
const THEME_CHANGE_EVENT = "writer:theme-changed";

function isThemeMode(value: string | null): value is ThemeMode {
	return value === "light" || value === "dark" || value === "system";
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

export function resolveThemeMode(mode: ThemeMode): ResolvedTheme {
	if (mode === "light" || mode === "dark") return mode;
	if (typeof window === "undefined") return "dark";
	return window.matchMedia(DARK_MEDIA_QUERY).matches ? "dark" : "light";
}

export function applyThemeMode(mode: ThemeMode): ResolvedTheme {
	const resolved = resolveThemeMode(mode);
	if (typeof document !== "undefined") {
		document.documentElement.dataset.theme = resolved;
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
