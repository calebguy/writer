"use client";

import { createContext, useContext, useMemo, useState } from "react";

type CreateEntryDrawerContextValue = {
	isOpen: boolean;
	open: () => void;
	close: () => void;
	setOpen: (open: boolean) => void;
};

const CreateEntryDrawerContext = createContext<CreateEntryDrawerContextValue | null>(
	null,
);

export function CreateEntryDrawerProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [isOpen, setIsOpen] = useState(false);

	const value = useMemo<CreateEntryDrawerContextValue>(
		() => ({
			isOpen,
			open: () => setIsOpen(true),
			close: () => setIsOpen(false),
			setOpen: (open: boolean) => setIsOpen(open),
		}),
		[isOpen],
	);

	return (
		<CreateEntryDrawerContext.Provider value={value}>
			{children}
		</CreateEntryDrawerContext.Provider>
	);
}

export function useCreateEntryDrawer() {
	const context = useContext(CreateEntryDrawerContext);
	if (!context) {
		throw new Error(
			"useCreateEntryDrawer must be used within CreateEntryDrawerProvider",
		);
	}
	return context;
}
