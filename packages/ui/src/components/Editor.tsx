import BulletList from "@tiptap/extension-bullet-list";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Document from "@tiptap/extension-document";
import Heading from "@tiptap/extension-heading";
import History from "@tiptap/extension-history";
import Image from "@tiptap/extension-image";
import ListItem from "@tiptap/extension-list-item";
import Paragraph from "@tiptap/extension-paragraph";
import Placeholder from "@tiptap/extension-placeholder";

import Text from "@tiptap/extension-text";
import {
	EditorContent,
	type Editor as TiptapEditor,
	useEditor,
} from "@tiptap/react";
import { all, createLowlight } from "lowlight";
import { useEffect } from "react";
import { Markdown } from "tiptap-markdown";
import { cn } from "../utils/cn";

const lowlight = createLowlight(all);

interface EditorProps {
	initialContent?: string | null;
	onChange?: (editor: TiptapEditor) => void;
	disabled?: boolean;
	className?: string;
	placeholder?: string;
}

export function Editor({
	initialContent: content,
	onChange,
	disabled,
	className,
	placeholder,
}: EditorProps) {
	const editor = useEditor({
		editable: !disabled,
		editorProps: {
			attributes: {
				class: cn(
					"grow flex flex-col p-2 h-full caret-lime overflow-y-auto",
					className,
				),
			},
		},
		extensions: [
			Document,
			Paragraph,
			Text,
			BulletList,
			ListItem,
			History,
			Placeholder.configure({ placeholder }),
			Heading.configure({ levels: [1, 2, 3] }),
			Image.configure({
				inline: true,
				allowBase64: true,
			}),
			Markdown.configure({
				linkify: true,
				transformPastedText: true,
				transformCopiedText: true,
			}),
			CodeBlockLowlight.configure({ lowlight }),
		],
		onUpdate: ({ editor }) => {
			onChange?.(editor);
		},
		content,
	});

	useEffect(() => {
		if (editor) {
			editor.commands.focus();
		}
	}, [editor]);

	return (
		<EditorContent
			disabled={disabled}
			editor={editor}
			className="grow flex flex-col overflow-auto"
		/>
	);
}
