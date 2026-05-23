import { describe, expect, test } from "bun:test";
import { getHomeOnboardingMode } from "./homeOnboarding";

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
