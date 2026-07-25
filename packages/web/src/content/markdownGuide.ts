export type MarkdownSyntaxItem = {
	name: string;
	input: string;
	result: string;
	details: string;
};

export type MarkdownSyntaxGroup = {
	title: string;
	items: MarkdownSyntaxItem[];
};

export type MarkdownShortcutItem = {
	action: string;
	mac: string;
	windows: string;
	details: string;
};

export const markdownGuideIntro =
	"Writer entries are composed in markdown. Type the markdown marker at the start of a block, then press space to turn it into formatted text while writing.";

export const markdownSyntaxGroups: MarkdownSyntaxGroup[] = [
	{
		title: "Text",
		items: [
			{
				name: "Bold",
				input: "**important**",
				result: "important text with heavier weight",
				details:
					"Wrap text in double asterisks, or select text and use the bold shortcut.",
			},
			{
				name: "Italic",
				input: "*emphasis*",
				result: "slanted emphasis",
				details:
					"Wrap text in single asterisks, or select text and use the italic shortcut.",
			},
			{
				name: "Strikethrough",
				input: "~~removed~~",
				result: "text with a strike through it",
				details:
					"Use double tildes, or select text and use the strikethrough shortcut.",
			},
		],
	},
	{
		title: "Blocks",
		items: [
			{
				name: "Headings",
				input: "# Heading 1\n## Heading 2\n### Heading 3",
				result: "different sized section headings",
				details:
					"Use one to six # characters, then a space. More # characters make smaller headings.",
			},
			{
				name: "Bulleted lists",
				input: "- first item\n- second item",
				result: "an unordered list",
				details: "Start each list item with a dash and a space.",
			},
			{
				name: "Numbered lists",
				input: "1. first item\n2. second item",
				result: "an ordered list",
				details: "Start each list item with a number, a period, and a space.",
			},
			{
				name: "Quotes",
				input: "> quoted text",
				result: "an indented block quote",
				details: "Start the line with > and a space.",
			},
			{
				name: "Code blocks",
				input: '```ts\nconst place = "Writer";\n```',
				result: "a syntax-highlighted code block",
				details:
					"Use triple backticks. Add a language name like ts, js, solidity, python, or bash for highlighting.",
			},
		],
	},
	{
		title: "Links and images",
		items: [
			{
				name: "Links",
				input: "[Writer](https://writer.place)",
				result: "clickable linked text",
				details:
					"Use bracket text plus a URL. You can also select text and paste a URL to link it.",
			},
			{
				name: "Images",
				input: "![Alt text](https://example.com/image.png)",
				result: "an embedded image",
				details:
					"Use the image form of a markdown link. Click an image in the editor to adjust its metadata.",
			},
		],
	},
];

export const markdownShortcutItems: MarkdownShortcutItem[] = [
	{
		action: "Bold selected text",
		mac: "Cmd+B",
		windows: "Ctrl+B",
		details: "Equivalent to wrapping text in **double asterisks**.",
	},
	{
		action: "Italicize selected text",
		mac: "Cmd+I",
		windows: "Ctrl+I",
		details: "Equivalent to wrapping text in *single asterisks*.",
	},
	{
		action: "Strike selected text",
		mac: "Shift+Cmd+X",
		windows: "Shift+Ctrl+X",
		details: "Equivalent to wrapping text in ~~double tildes~~.",
	},
	{
		action: "Create or save entry",
		mac: "Cmd+Enter",
		windows: "Ctrl+Enter",
		details: "Submits the active Writer composer or editor.",
	},
	{
		action: "Cancel editor",
		mac: "Esc",
		windows: "Esc",
		details:
			"Closes the active composer or editor when there is no blocking confirmation.",
	},
];

function escapeHtml(value: string) {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

function tableTextCell(value: string) {
	return escapeHtml(value).replace(/\n/g, "<br />").replace(/\|/g, "\\|");
}

function tableCodeCell(value: string) {
	return `<code>${tableTextCell(value)}</code>`;
}

function syntaxMarkdown() {
	const lines: string[] = ["### Syntax", ""];

	for (const group of markdownSyntaxGroups) {
		lines.push(`#### ${group.title}`, "");
		lines.push("| Feature | Type this | Result | Notes |");
		lines.push("|---------|-----------|--------|-------|");
		for (const item of group.items) {
			lines.push(
				`| ${tableTextCell(item.name)} | ${tableCodeCell(
					item.input,
				)} | ${tableTextCell(item.result)} | ${tableTextCell(item.details)} |`,
			);
		}
		lines.push("");
	}

	return lines.join("\n");
}

function shortcutsMarkdown() {
	const lines = [
		"### Shortcuts",
		"",
		"| Action | Mac | Windows/Linux | Notes |",
		"|--------|-----|---------------|-------|",
	];

	for (const shortcut of markdownShortcutItems) {
		lines.push(
			`| ${tableTextCell(shortcut.action)} | ${tableCodeCell(
				shortcut.mac,
			)} | ${tableCodeCell(shortcut.windows)} | ${tableTextCell(
				shortcut.details,
			)} |`,
		);
	}

	return lines.join("\n");
}

export function renderMarkdownGuideMarkdown() {
	return [
		"## Markdown",
		"",
		markdownGuideIntro,
		"",
		syntaxMarkdown(),
		shortcutsMarkdown(),
	].join("\n");
}
