import { describe, expect, test } from "bun:test";
import {
	isEscapeKey,
	isPrimaryEditShortcut,
	isPrimaryEnterShortcut,
} from "./keyboardShortcuts";

function keyEvent(
	key: string,
	modifiers: { meta?: boolean; ctrl?: boolean } = {},
) {
	return {
		key,
		metaKey: modifiers.meta ?? false,
		ctrlKey: modifiers.ctrl ?? false,
	};
}

describe("keyboard shortcuts", () => {
	test("detects primary enter submit shortcuts only", () => {
		expect(isPrimaryEnterShortcut(keyEvent("Enter", { meta: true }))).toBe(
			true,
		);
		expect(isPrimaryEnterShortcut(keyEvent("Enter", { ctrl: true }))).toBe(
			true,
		);
		expect(isPrimaryEnterShortcut(keyEvent("Enter"))).toBe(false);
		expect(
			isPrimaryEnterShortcut(keyEvent("NumpadEnter", { meta: true })),
		).toBe(false);
		expect(isPrimaryEnterShortcut(keyEvent("e", { meta: true }))).toBe(false);
	});

	test("detects primary edit shortcuts without lowercasing every key", () => {
		expect(isPrimaryEditShortcut(keyEvent("e", { meta: true }))).toBe(true);
		expect(isPrimaryEditShortcut(keyEvent("E", { ctrl: true }))).toBe(true);
		expect(isPrimaryEditShortcut(keyEvent("e"))).toBe(false);
		expect(isPrimaryEditShortcut(keyEvent("Enter", { meta: true }))).toBe(
			false,
		);
	});

	test("detects escape keys", () => {
		expect(isEscapeKey(keyEvent("Escape"))).toBe(true);
		expect(isEscapeKey(keyEvent("Esc"))).toBe(true);
		expect(isEscapeKey(keyEvent("Enter"))).toBe(false);
	});
});
