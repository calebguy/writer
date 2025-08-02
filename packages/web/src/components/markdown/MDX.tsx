"use client";

import { customLinkDialogPlugin } from "@/plugins/customLinkDialogPlugin";
import { pasteLinkPlugin } from "@/plugins/pasteLinkPlugin";
import { cn } from "@/utils/cn";
import {
	MDXEditor,
	type MDXEditorMethods,
	headingsPlugin,
	linkPlugin,
	listsPlugin,
	markdownShortcutPlugin,
	quotePlugin,
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
				headingsPlugin(),
				listsPlugin(),
				markdownShortcutPlugin(),
				quotePlugin(),
				pasteLinkPlugin(),
				linkPlugin(),
				customLinkDialogPlugin(),
			]}
			onChange={onChange}
			ref={ref}
			markdown={markdown}
			className={cn(
				"border border-neutral-900 aspect-square min-w-24",
				className,
			)}
			contentEditableClassName="prose"
		/>
	);
};

export default MDX;
