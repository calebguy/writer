"use client";

import {
	type ReactNode,
	createContext,
	useContext,
	useMemo,
	useState,
} from "react";

type ComposeHeaderActionsContextValue = {
	actions: ReactNode;
	setActions: (actions: ReactNode) => void;
};

const ComposeHeaderActionsContext =
	createContext<ComposeHeaderActionsContextValue | null>(null);

export function ComposeHeaderActionsProvider({
	children,
}: {
	children: ReactNode;
}) {
	const [actions, setActions] = useState<ReactNode>(null);
	const value = useMemo(() => ({ actions, setActions }), [actions]);

	return (
		<ComposeHeaderActionsContext.Provider value={value}>
			{children}
		</ComposeHeaderActionsContext.Provider>
	);
}

export function useComposeHeaderActions() {
	const context = useContext(ComposeHeaderActionsContext);
	if (!context) {
		throw new Error(
			"useComposeHeaderActions must be used within ComposeHeaderActionsProvider",
		);
	}
	return context;
}
