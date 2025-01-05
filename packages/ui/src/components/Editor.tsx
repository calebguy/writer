import BulletList from "@tiptap/extension-bullet-list";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Document from "@tiptap/extension-document";
import Heading from "@tiptap/extension-heading";
import Image from "@tiptap/extension-image";
import ListItem from "@tiptap/extension-list-item";
import Paragraph from "@tiptap/extension-paragraph";

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
}

export function Editor({
	initialContent: content,
	onChange,
	disabled,
	className,
}: EditorProps) {
	const editor = useEditor({
		editable: !disabled,
		editorProps: {
			attributes: {
				class: cn(
					"grow flex flex-col px-2 py-1 h-full caret-lime overflow-y-auto",
					className,
				),
			},
		},
		extensions: [
			Document,
			Paragraph,
			Text,
			Markdown,
			BulletList,
			ListItem,
			Image.configure({
				allowBase64: true,
				inline: true,
			}),
			CodeBlockLowlight.configure({ lowlight }),
			Heading.configure({ levels: [1, 2, 3] }),
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
