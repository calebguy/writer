"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface EntryLoadingContextType {
	isEntryLoading: boolean;
	setEntryLoading: (loading: boolean) => void;
}

const EntryLoadingContext = createContext<EntryLoadingContextType>({
	isEntryLoading: false,
	setEntryLoading: () => {},
});

export function EntryLoadingProvider({ children }: { children: ReactNode }) {
	const [isEntryLoading, setEntryLoading] = useState(false);

	return (
		<EntryLoadingContext.Provider value={{ isEntryLoading, setEntryLoading }}>
			{children}
		</EntryLoadingContext.Provider>
	);
}

export function useEntryLoading() {
	return useContext(EntryLoadingContext);
}
