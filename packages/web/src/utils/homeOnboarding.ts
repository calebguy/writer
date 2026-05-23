export type HomeOnboardingMode = "empty" | "creating" | "created";
export function shouldStartHomeOnboarding({
	hasVisibleWriters,
	hasHiddenWriters,
}: {
	hasVisibleWriters: boolean;
	hasHiddenWriters: boolean;
}): boolean {
	return !hasVisibleWriters && !hasHiddenWriters;
}

export function getHomeOnboardingMode({
	hasConfirmedWriter,
	hasVisibleWriters,
	isCreatingWriter,
	hasSubmittedInOnboarding,
}: {
	hasConfirmedWriter: boolean;
	hasVisibleWriters: boolean;
	isCreatingWriter: boolean;
	hasSubmittedInOnboarding: boolean;
}): HomeOnboardingMode {
	if (hasConfirmedWriter) {
		return "created";
	}
	if (isCreatingWriter || hasVisibleWriters || hasSubmittedInOnboarding) {
		return "creating";
	}
	return "empty";
}
