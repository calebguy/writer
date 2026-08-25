export const EDITOR_BLANK_LINE = "\u2060";
export const RENDERED_BLANK_LINE = "\u00A0";

function markdownFenceDelimiter(line: string) {
	const trimmed = line.trimStart();
	if (trimmed.startsWith("```")) return "```";
	if (trimmed.startsWith("~~~")) return "~~~";
	return null;
}

function encodeExtraBlankLines(input: string, marker: string) {
	const output: string[] = [];
	const lines = input.split("\n");
	let pendingBlankLines = 0;
	let activeFence: string | null = null;

	const flushBlankLines = () => {
		if (pendingBlankLines === 0) return;
		output.push("");
		for (let index = 1; index < pendingBlankLines; index += 1) {
			output.push(marker, "");
		}
		pendingBlankLines = 0;
	};

	for (const line of lines) {
		const fenceDelimiter = markdownFenceDelimiter(line);
		if (!activeFence && line.trim().length === 0) {
			pendingBlankLines += 1;
			continue;
		}

		flushBlankLines();
		output.push(line);

		if (!fenceDelimiter) continue;
		if (!activeFence) {
			activeFence = fenceDelimiter;
			continue;
		}
		if (activeFence === fenceDelimiter) activeFence = null;
	}

	flushBlankLines();
	return output.join("\n");
}

export function preserveMarkdownBlankLines(input: string) {
	return encodeExtraBlankLines(input, RENDERED_BLANK_LINE);
}

export function encodeMarkdownBlankLinesForEditor(input: string) {
	return encodeExtraBlankLines(input, EDITOR_BLANK_LINE);
}

export function restoreMarkdownBlankLinesFromEditor(input: string) {
	const output: string[] = [];
	const lines = input.split("\n");
	let pendingBlankLines = 0;
	let activeFence: string | null = null;
	let skippingEditorSeparator = false;

	const flushBlankLines = () => {
		while (pendingBlankLines > 0) {
			output.push("");
			pendingBlankLines -= 1;
		}
	};

	for (const line of lines) {
		const fenceDelimiter = markdownFenceDelimiter(line);
		if (!activeFence && line === EDITOR_BLANK_LINE && pendingBlankLines > 0) {
			pendingBlankLines += 1;
			skippingEditorSeparator = true;
			continue;
		}

		if (!activeFence && line.trim().length === 0) {
			if (skippingEditorSeparator) {
				skippingEditorSeparator = false;
				continue;
			}
			pendingBlankLines += 1;
			continue;
		}

		skippingEditorSeparator = false;
		flushBlankLines();
		output.push(line);

		if (!fenceDelimiter) continue;
		if (!activeFence) {
			activeFence = fenceDelimiter;
			continue;
		}
		if (activeFence === fenceDelimiter) activeFence = null;
	}

	flushBlankLines();
	return output.join("\n");
}
