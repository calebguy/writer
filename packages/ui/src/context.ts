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

export const defaultColor: RGB = [255, 255, 255];

export const WriterContext = createContext<WriterContextType>({
	writer: null,
	setWriter: () => {},

	defaultColor: defaultColor,
	primaryColor: defaultColor,
	setPrimaryColor: () => {},
	setPrimaryFromLongHex: () => {},
});
