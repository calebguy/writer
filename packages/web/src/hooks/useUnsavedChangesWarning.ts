"use client";

import {
	UNSAVED_CHANGES_MESSAGE,
	UnsavedChangesContext,
} from "@/utils/context";
import { useContext, useEffect } from "react";

export function useUnsavedChangesWarning(
	hasUnsavedChanges: boolean,
	message = UNSAVED_CHANGES_MESSAGE,
) {
	const { registerUnsavedChanges } = useContext(UnsavedChangesContext);

	useEffect(() => {
		if (!hasUnsavedChanges) return;
		return registerUnsavedChanges(message);
	}, [hasUnsavedChanges, message, registerUnsavedChanges]);
}

export function useUnsavedChangesNavigation() {
	return useContext(UnsavedChangesContext).confirmNavigation;
}
