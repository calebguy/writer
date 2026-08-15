"use client";

import {
	UNSAVED_CHANGES_TITLE,
	UnsavedChangesContext,
	type UnsavedChangesRegistration,
} from "@/utils/context";
import { useContext, useEffect } from "react";

export function useUnsavedChangesWarning(
	hasUnsavedChanges: boolean,
	prompt: UnsavedChangesRegistration = UNSAVED_CHANGES_TITLE,
) {
	const { registerUnsavedChanges } = useContext(UnsavedChangesContext);

	useEffect(() => {
		if (!hasUnsavedChanges) return;
		return registerUnsavedChanges(prompt);
	}, [hasUnsavedChanges, prompt, registerUnsavedChanges]);
}

export function useUnsavedChangesNavigation() {
	return useContext(UnsavedChangesContext).confirmNavigation;
}
