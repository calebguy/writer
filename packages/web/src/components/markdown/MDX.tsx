"use client";

import {
	MDXEditor,
	type MDXEditorMethods,
	headingsPlugin,
	listsPlugin,
	markdownShortcutPlugin,
} from "@mdxeditor/editor";
// import "@mdxeditor/editor/style.css";
import type { FC } from "react";

interface EditorProps {
	markdown: string;
	editorRef?: React.MutableRefObject<MDXEditorMethods | null>;
	onChange?: (markdown: string) => void;
	className?: string;
}

/**
 * Extend this Component further with the necessary plugins or props you need.
 * proxying the ref is necessary. Next.js dynamically imported components don't support refs.
 */
const MDX: FC<EditorProps> = ({ markdown, editorRef, onChange, className }) => {
	console.log("markdown", markdown);
	return (
		<MDXEditor
			plugins={[headingsPlugin(), listsPlugin(), markdownShortcutPlugin()]}
			onChange={onChange}
			ref={editorRef}
			markdown={markdown}
			className={className}
			contentEditableClassName="prose"
		/>
	);
};

export default MDX;
