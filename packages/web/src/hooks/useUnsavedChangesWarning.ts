"use client";

import { UNSAVED_CHANGES_TITLE, UnsavedChangesContext } from "@/utils/context";
import { useContext, useEffect } from "react";

export function useUnsavedChangesWarning(
	hasUnsavedChanges: boolean,
	title = UNSAVED_CHANGES_TITLE,
) {
	const { registerUnsavedChanges } = useContext(UnsavedChangesContext);

	useEffect(() => {
		if (!hasUnsavedChanges) return;
		return registerUnsavedChanges(title);
	}, [hasUnsavedChanges, title, registerUnsavedChanges]);
}

export function useUnsavedChangesNavigation() {
	return useContext(UnsavedChangesContext).confirmNavigation;
}
