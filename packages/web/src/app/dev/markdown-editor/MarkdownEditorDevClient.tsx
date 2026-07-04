"use client";

import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";

const MDX = dynamic(() => import("@/components/markdown/MDX"), { ssr: false });

const SAMPLE_MARKDOWN = `# header 1

## header 2

### header 3

#### header 4

##### header 5

###### header 6

Paragraph

**bold text**

_italic text_

~~strikethrough text~~

[Link](https://writer.place)

![Image](http://yoha.co.uk/sites/yoha.co.uk/files/Lungs_ZKM.jpg)

- [ ] Task item
- [x] Completed task item

\`inline code\`

\`\`\`ts
const message = "hello writer";
\`\`\`
`;

const IMAGE_SNIPPET =
	"![Lungs](http://yoha.co.uk/sites/yoha.co.uk/files/Lungs_ZKM.jpg)";
const LINK_SNIPPET = "[Writer](https://writer.place)";

function appendBlock(markdown: string, block: string) {
	const trimmed = markdown.trimEnd();
	return trimmed.length > 0 ? `${trimmed}\n\n${block}\n` : `${block}\n`;
}

export function MarkdownEditorDevClient() {
	const editorRef = useRef<MDXEditorMethods>(null);
	const [markdown, setMarkdown] = useState(SAMPLE_MARKDOWN);
	const [copied, setCopied] = useState(false);
	const markdownStats = useMemo(() => {
		const bytes = new TextEncoder().encode(markdown).length;
		const lines = markdown.length === 0 ? 0 : markdown.split("\n").length;
		return { bytes, characters: markdown.length, lines };
	}, [markdown]);

	function replaceMarkdown(nextMarkdown: string) {
		setMarkdown(nextMarkdown);
		editorRef.current?.setMarkdown(nextMarkdown);
	}

	async function copyMarkdown() {
		await navigator.clipboard.writeText(markdown);
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1200);
	}

	return (
		<main className="flex min-h-[calc(100dvh-2rem)] flex-col gap-4 text-black dark:text-white">
			<header className="flex flex-col gap-2 border-b border-neutral-200 pb-4 dark:border-neutral-800 md:flex-row md:items-end md:justify-between">
				<div>
					<p className="font-mono text-xs uppercase tracking-wide text-neutral-500">
						Dev only
					</p>
					<h1 className="text-3xl italic text-primary">Markdown editor lab</h1>
					<p className="max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
						Inspect MDXEditor behavior, raw markdown serialization, image
						embeds, link embeds, and the rendered MarkdownRenderer output.
					</p>
				</div>
				<div className="flex flex-wrap gap-2 font-mono text-xs text-neutral-500">
					<span>{markdownStats.lines} lines</span>
					<span>{markdownStats.characters} chars</span>
					<span>{markdownStats.bytes} bytes</span>
				</div>
			</header>

			<div className="flex flex-wrap gap-2">
				<button
					type="button"
					onClick={() => replaceMarkdown(SAMPLE_MARKDOWN)}
					className="border border-neutral-300 px-3 py-1 text-sm hover:border-primary hover:text-primary dark:border-neutral-700"
				>
					Load sample
				</button>
				<button
					type="button"
					onClick={() => replaceMarkdown(appendBlock(markdown, IMAGE_SNIPPET))}
					className="border border-neutral-300 px-3 py-1 text-sm hover:border-primary hover:text-primary dark:border-neutral-700"
				>
					Append image
				</button>
				<button
					type="button"
					onClick={() => replaceMarkdown(appendBlock(markdown, LINK_SNIPPET))}
					className="border border-neutral-300 px-3 py-1 text-sm hover:border-primary hover:text-primary dark:border-neutral-700"
				>
					Append link
				</button>
				<button
					type="button"
					onClick={() => replaceMarkdown("")}
					className="border border-neutral-300 px-3 py-1 text-sm hover:border-primary hover:text-primary dark:border-neutral-700"
				>
					Clear
				</button>
				<button
					type="button"
					onClick={copyMarkdown}
					className="border border-neutral-300 px-3 py-1 text-sm hover:border-primary hover:text-primary dark:border-neutral-700"
				>
					{copied ? "Copied" : "Copy markdown"}
				</button>
			</div>

			<section className="grid min-h-0 grow gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
				<div className="flex min-h-[32rem] flex-col gap-2">
					<h2 className="font-mono text-sm uppercase tracking-wide text-neutral-500">
						Editor
					</h2>
					<div className="min-h-0 grow overflow-hidden border border-dashed border-primary bg-surface">
						<MDX
							ref={editorRef}
							markdown={markdown}
							onChange={setMarkdown}
							placeholder="Type markdown, paste links, or enter ![alt](https://...)"
							className="h-full min-h-[32rem] bg-surface text-black dark:text-white"
							aspectSquare={false}
							autoFocus
						/>
					</div>
				</div>

				<div className="grid min-h-0 gap-4 lg:grid-cols-2 xl:grid-cols-1">
					<div className="flex min-h-[18rem] flex-col gap-2">
						<h2 className="font-mono text-sm uppercase tracking-wide text-neutral-500">
							Rendered preview
						</h2>
						<div className="min-h-0 grow overflow-auto border border-neutral-300 bg-background p-3 dark:border-neutral-700">
							<MarkdownRenderer markdown={markdown} />
						</div>
					</div>

					<div className="flex min-h-[18rem] flex-col gap-2">
						<h2 className="font-mono text-sm uppercase tracking-wide text-neutral-500">
							Raw markdown
						</h2>
						<textarea
							value={markdown}
							onChange={(event) => replaceMarkdown(event.target.value)}
							spellCheck={false}
							className="min-h-0 grow resize-none border border-neutral-300 bg-background p-3 font-mono text-xs text-black outline-none focus:border-primary dark:border-neutral-700 dark:text-white"
						/>
					</div>
				</div>
			</section>
		</main>
	);
}
