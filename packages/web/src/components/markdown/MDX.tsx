"use client";

import { customLinkDialogPlugin } from "@/plugins/customLinkDialogPlugin";
import { pasteLinkPlugin } from "@/plugins/pasteLinkPlugin";
import { cn } from "@/utils/cn";
import {
	MDXEditor,
	type MDXEditorMethods,
	codeBlockPlugin,
	codeMirrorPlugin,
	headingsPlugin,
	linkPlugin,
	listsPlugin,
	markdownShortcutPlugin,
	quotePlugin,
	toolbarPlugin,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import type { FC } from "react";

interface EditorProps {
	markdown: string;
	ref?: React.MutableRefObject<MDXEditorMethods | null>;
	onChange?: (markdown: string) => void;
	className?: string;
}

/**
 * Extend this Component further with the necessary plugins or props you need.
 * proxying the ref is necessary. Next.js dynamically imported components don't support refs.
 */
const MDX: FC<EditorProps> = ({ markdown, ref, onChange, className }) => {
	return (
		<MDXEditor
			plugins={[
				// toolbarPlugin({
				// 	toolbarContents: () => {
				// 		return <div className="hidden" />;
				// 	},
				// }),
				headingsPlugin(),
				listsPlugin(),
				quotePlugin(),
				pasteLinkPlugin(),
				linkPlugin(),
				codeBlockPlugin({ defaultCodeBlockLanguage: "js" }),
				codeMirrorPlugin({
					codeBlockLanguages: {
						js: "JavaScript",
						ts: "TypeScript",
						jsx: "JavaScript (React)",
						tsx: "TypeScript (React)",
						css: "CSS",
						html: "HTML",
						json: "JSON",
						md: "Markdown",
						sql: "SQL",
						python: "Python",
						java: "Java",
						cpp: "C++",
						c: "C",
						php: "PHP",
						ruby: "Ruby",
						go: "Go",
						rust: "Rust",
						swift: "Swift",
						kotlin: "Kotlin",
						scala: "Scala",
						shell: "Shell",
						bash: "Bash",
						yaml: "YAML",
						xml: "XML",
					},
				}),
				markdownShortcutPlugin(),
				customLinkDialogPlugin(),
			]}
			onChange={onChange}
			ref={ref}
			markdown={markdown}
			className={cn(
				"border p-2 border-neutral-900 aspect-square min-w-24 relative",
				className,
			)}
			contentEditableClassName="prose"
		/>
	);
};

export default MDX;
