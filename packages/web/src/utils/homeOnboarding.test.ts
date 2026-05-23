import { describe, expect, test } from "bun:test";
import {
	getHomeOnboardingMode,
	shouldStartHomeOnboarding,
} from "./homeOnboarding";

describe("getHomeOnboardingMode", () => {
	test("shows empty create state when no visible writers remain", () => {
		expect(
			getHomeOnboardingMode({
				hasConfirmedWriter: false,
				hasVisibleWriters: false,
				isCreatingWriter: false,
				hasSubmittedInOnboarding: false,
			}),
		).toBe("empty");
	});

	test("does not treat a submitted onboarding create as empty", () => {
		expect(
			getHomeOnboardingMode({
				hasConfirmedWriter: false,
				hasVisibleWriters: false,
				isCreatingWriter: false,
				hasSubmittedInOnboarding: true,
			}),
		).toBe("creating");
	});

	test("shows created once any visible writer is confirmed", () => {
		expect(
			getHomeOnboardingMode({
				hasConfirmedWriter: true,
				hasVisibleWriters: true,
				isCreatingWriter: false,
				hasSubmittedInOnboarding: false,
			}),
		).toBe("created");
	});
});

describe("shouldStartHomeOnboarding", () => {
	test("starts only when the user has no visible and no hidden writers", () => {
		expect(
			shouldStartHomeOnboarding({
				hasVisibleWriters: false,
				hasHiddenWriters: false,
			}),
		).toBe(true);
	});

	test("does not start when all writers are hidden", () => {
		expect(
			shouldStartHomeOnboarding({
				hasVisibleWriters: false,
				hasHiddenWriters: true,
			}),
		).toBe(false);
	});
});
