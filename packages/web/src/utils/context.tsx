import { createContext } from "react";
import type { Writer } from "./api";
import type { RGB } from "./utils";

export const AuthHintContext = createContext<boolean>(false);

export const UNSAVED_CHANGES_TITLE = "Discard Changes";

export interface UnsavedChangesContextType {
	hasUnsavedChanges: boolean;
	confirmNavigation: () => Promise<boolean>;
	registerUnsavedChanges: (title?: string) => () => void;
}

export const UnsavedChangesContext = createContext<UnsavedChangesContextType>({
	hasUnsavedChanges: false,
	confirmNavigation: async () => true,
	registerUnsavedChanges: () => () => {},
});

export interface NavigationContextType {
	writerCameFromExplore: Record<string, boolean>;
}

export const NavigationContext = createContext<NavigationContextType>({
	writerCameFromExplore: {},
});

export interface WriterContextType {
	writer: Writer | null;
	setWriter: (content: Writer | null) => void;

	defaultColor: RGB;
	primaryColor: RGB;
	setPrimaryColor: (color: RGB) => void;
	setPrimaryFromLongHex: (hex: string) => void;
	resetPrimaryColor: () => void;
}

const fallbackColor: RGB = [252, 186, 3];
export let defaultColor: RGB = fallbackColor;

try {
	const root = document.documentElement;
	const primaryColor =
		getComputedStyle(root).getPropertyValue("--color-primary");
	const primaryColorArray = primaryColor.split(" ").map(Number) as RGB;
	defaultColor = primaryColorArray;
} catch (e) {
	defaultColor = fallbackColor;
}

export const WriterContext = createContext<WriterContextType>({
	writer: null,
	setWriter: () => {},

	defaultColor: defaultColor,
	primaryColor: defaultColor,
	setPrimaryColor: () => {},
	setPrimaryFromLongHex: () => {},
	resetPrimaryColor: () => {},
});
