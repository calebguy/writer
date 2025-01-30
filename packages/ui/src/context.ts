import { createContext } from "react";
import type { Writer } from "./utils/api";
import type { RGB } from "./utils/utils";

export interface WriterContextType {
	writer: Writer | null;
	setWriter: (content: Writer | null) => void;

	defaultColor: RGB;
	primaryColor: RGB;
	setPrimaryColor: (color: RGB) => void;
	setPrimaryFromLongHex: (hex: string) => void;
}

export let defaultColor: RGB;
const fallbackColor: RGB = [252, 186, 3];

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
});
