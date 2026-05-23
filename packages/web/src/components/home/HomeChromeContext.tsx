"use client";

import {
	createContext,
	type ReactNode,
	useContext,
	useMemo,
	useState,
} from "react";

type HomeChromeContextValue = {
	isEmptyHome: boolean;
	setIsEmptyHome: (isEmptyHome: boolean) => void;
};

const HomeChromeContext = createContext<HomeChromeContextValue | null>(null);

export function HomeChromeProvider({ children }: { children: ReactNode }) {
	const [isEmptyHome, setIsEmptyHome] = useState(false);
	const value = useMemo(
		() => ({ isEmptyHome, setIsEmptyHome }),
		[isEmptyHome],
	);

	return (
		<HomeChromeContext.Provider value={value}>
			{children}
		</HomeChromeContext.Provider>
	);
}

export function useHomeChrome() {
	return useContext(HomeChromeContext);
}
