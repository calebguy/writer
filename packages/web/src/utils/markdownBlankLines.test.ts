import { describe, expect, test } from "bun:test";
import {
	EDITOR_BLANK_LINE,
	encodeMarkdownBlankLinesForEditor,
	preserveMarkdownBlankLines,
	RENDERED_BLANK_LINE,
	restoreMarkdownBlankLinesFromEditor,
} from "./markdownBlankLines";

describe("markdown blank lines", () => {
	test("encodes extra blank lines as editor paragraphs", () => {
		expect(encodeMarkdownBlankLinesForEditor("one\n\ntwo")).toBe("one\n\ntwo");
		expect(encodeMarkdownBlankLinesForEditor("one\n\n\ntwo")).toBe(
			`one\n\n${EDITOR_BLANK_LINE}\n\ntwo`,
		);
		expect(encodeMarkdownBlankLinesForEditor("one\n\n\n\ntwo")).toBe(
			`one\n\n${EDITOR_BLANK_LINE}\n\n${EDITOR_BLANK_LINE}\n\ntwo`,
		);
	});

	test("restores editor spacer paragraphs to blank lines", () => {
		expect(
			restoreMarkdownBlankLinesFromEditor(`one\n\n${EDITOR_BLANK_LINE}\n\ntwo`),
		).toBe("one\n\n\ntwo");
		expect(
			restoreMarkdownBlankLinesFromEditor(
				`one\n\n${EDITOR_BLANK_LINE}\n\n${EDITOR_BLANK_LINE}\n\ntwo`,
			),
		).toBe("one\n\n\n\ntwo");
	});

	test("leaves fenced code blank lines unchanged", () => {
		const markdown =
			"before\n\n```ts\nconst one = 1;\n\nconst two = 2;\n```\n\nafter";
		expect(encodeMarkdownBlankLinesForEditor(markdown)).toBe(markdown);
		expect(preserveMarkdownBlankLines(markdown)).toBe(markdown);
	});

	test("uses a visible renderer spacer without changing editor markers", () => {
		expect(preserveMarkdownBlankLines("one\n\n\ntwo")).toBe(
			`one\n\n${RENDERED_BLANK_LINE}\n\ntwo`,
		);
	});
});
