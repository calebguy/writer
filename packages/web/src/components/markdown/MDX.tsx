"use client";

import { customLinkDialogPlugin } from "@/plugins/customLinkDialogPlugin";
import { pasteLinkPlugin } from "@/plugins/pasteLinkPlugin";
import { cn } from "@/utils/cn";
import {
	ChangeCodeMirrorLanguage,
	ConditionalContents,
	InsertCodeBlock,
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
import "./MDX.css";
import { type FC, useEffect, useRef, useState } from "react";

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
	const containerRef = useRef<HTMLDivElement>(null);
	const [overlayContainer, setOverlayContainer] =
		useState<HTMLDivElement | null>(null);

	useEffect(() => {
		setOverlayContainer(containerRef.current);
	}, []);

	return (
		<div className="mdx" ref={containerRef} style={{ position: "relative" }}>
			<MDXEditor
				plugins={[
					// I don't want a toolbar for now
					// toolbarPlugin({
					// 	toolbarContents: () => (
					// 		<ConditionalContents
					// 			options={[
					// 				{
					// 					when: (editor) => editor?.editorType === "codeblock",
					// 					contents: () => <ChangeCodeMirrorLanguage />,
					// 				},
					// 				{
					// 					fallback: () => (
					// 						<>
					// 							<InsertCodeBlock />
					// 						</>
					// 					),
					// 				},
					// 			]}
					// 		/>
					// 	),
					// }),
					headingsPlugin(),
					listsPlugin(),
					quotePlugin(),
					pasteLinkPlugin(),
					linkPlugin(),
					codeBlockPlugin({ defaultCodeBlockLanguage: "ts" }),
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
							go: "Go",
							rust: "Rust",
							shell: "Shell",
							bash: "Bash",
							yaml: "YAML",
							xml: "XML",
						},
						autoLoadLanguageSupport: true,
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
				overlayContainer={overlayContainer}
			/>
		</div>
	);
};

export default MDX;
