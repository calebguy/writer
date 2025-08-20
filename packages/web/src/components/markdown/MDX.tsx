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
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { type FC, useEffect, useRef, useState } from "react";
import "./MDX.css";

interface EditorProps {
	markdown: string;
	ref?: React.MutableRefObject<MDXEditorMethods | null>;
	onChange?: (markdown: string) => void;
	className?: string;
	readOnly?: boolean;
	placeholder?: string;
	autoFocus?: boolean;
}

/**
 * Extend this Component further with the necessary plugins or props you need.
 * proxying the ref is necessary. Next.js dynamically imported components don't support refs.
 */
const MDX: FC<EditorProps> = ({
	markdown,
	ref,
	onChange,
	className,
	readOnly,
	placeholder,
	autoFocus = false,
}) => {
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
				overlayContainer={overlayContainer}
				readOnly={readOnly}
				placeholder={placeholder}
				autoFocus={autoFocus}
				onError={(error) => {
					console.error(error);
				}}
				trim={false}
				spellCheck={true}
				contentEditableClassName="prose"
				className={cn(
					"border p-2 border-neutral-900 aspect-square min-w-24 relative",
					className,
				)}
			/>
		</div>
	);
};

export default MDX;
