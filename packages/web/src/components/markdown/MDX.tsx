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

const exampleTheme = {
	paragraph: "mdx--paragraph",
	quote: "mdx--quote",
	heading: {
		h1: "mdx--heading-h1",
		h2: "mdx--heading-h2",
		h3: "mdx--heading-h3",
		h4: "mdx--heading-h4",
		h5: "mdx--heading-h5",
		h6: "mdx--heading-h6",
	},
	list: {
		nested: {
			listitem: "mdx--nested-listitem",
		},
		ol: "mdx--list-ol",
		ul: "mdx--list-ul",
		listitem: "mdx--listItem",
		listitemChecked: "mdx--listItemChecked",
		listitemUnchecked: "mdx--listItemUnchecked",
	},
	hashtag: "mdx--hashtag",
	image: "mdx--image",
	link: "mdx--link",
	text: {
		bold: "mdx--textBold",
		code: "mdx--textCode",
		italic: "mdx--textItalic",
		strikethrough: "mdx--textStrikethrough",
		subscript: "mdx--textSubscript",
		superscript: "mdx--textSuperscript",
		underline: "mdx--textUnderline",
		underlineStrikethrough: "mdx--textUnderlineStrikethrough",
	},
	code: "mdx--code",
	codeHighlight: {
		atrule: "mdx--tokenAttr",
		attr: "mdx--tokenAttr",
		boolean: "mdx--tokenProperty",
		builtin: "mdx--tokenSelector",
		cdata: "mdx--tokenComment",
		char: "mdx--tokenSelector",
		class: "mdx--tokenFunction",
		"class-name": "mdx--tokenFunction",
		comment: "mdx--tokenComment",
		constant: "mdx--tokenProperty",
		deleted: "mdx--tokenProperty",
		doctype: "mdx--tokenComment",
		entity: "mdx--tokenOperator",
		function: "mdx--tokenFunction",
		important: "mdx--tokenVariable",
		inserted: "mdx--tokenSelector",
		keyword: "mdx--tokenAttr",
		namespace: "mdx--tokenVariable",
		number: "mdx--tokenProperty",
		operator: "mdx--tokenOperator",
		prolog: "mdx--tokenComment",
		property: "mdx--tokenProperty",
		punctuation: "mdx--tokenPunctuation",
		regex: "mdx--tokenVariable",
		selector: "mdx--tokenSelector",
		string: "mdx--tokenSelector",
		symbol: "mdx--tokenProperty",
		tag: "mdx--tokenProperty",
		url: "mdx--tokenOperator",
		variable: "mdx--tokenVariable",
	},
};

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
		<div
			className="mdx grow flex flex-col"
			ref={containerRef}
			style={{ position: "relative" }}
		>
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
				lexicalTheme={exampleTheme}
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
