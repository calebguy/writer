import Bold from "@tiptap/extension-bold";
import BulletList from "@tiptap/extension-bullet-list";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Document from "@tiptap/extension-document";
import HardBreak from "@tiptap/extension-hard-break";
import Heading from "@tiptap/extension-heading";
import History from "@tiptap/extension-history";
import Image from "@tiptap/extension-image";
import Italic from "@tiptap/extension-italic";
import Link from "@tiptap/extension-link";
import ListItem from "@tiptap/extension-list-item";
import OrderedList from "@tiptap/extension-ordered-list";
import Paragraph from "@tiptap/extension-paragraph";
import Placeholder from "@tiptap/extension-placeholder";
import Strikethrough from "@tiptap/extension-strike";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";

import Text from "@tiptap/extension-text";
import {
	EditorContent,
	type Editor as TiptapEditor,
	useEditor,
} from "@tiptap/react";
import { all, createLowlight } from "lowlight";
import { useImperativeHandle } from "react";
import { Markdown } from "tiptap-markdown";
import { cn } from "../utils/cn";

const lowlight = createLowlight(all);

interface EditorProps {
	content?: string | null;
	onChange?: (editor: TiptapEditor) => void;
	disabled?: boolean;
	className?: string;
	placeholder?: string;
	editorRef?: React.Ref<TiptapEditor>;
}

export function Editor({
	content,
	onChange,
	disabled,
	className,
	placeholder,
	editorRef,
}: EditorProps) {
	const editor = useEditor({
		editable: !disabled,
		editorProps: {
			attributes: {
				class: cn(
					"grow flex flex-col h-full caret-primary overflow-y-auto",
					className,
				),
			},
		},
		extensions: [
			Document,
			Paragraph,
			Text,
			BulletList,
			History,
			Bold,
			Italic,
			Strikethrough,
			OrderedList,
			ListItem,
			TaskList,
			TaskItem,
			HardBreak,
			Link.configure({
				autolink: true,
				openOnClick: true,
				linkOnPaste: true,
				defaultProtocol: "https",
				HTMLAttributes: {
					target: "_blank",
					rel: "noopener noreferrer",
					class: "text-primary underline",
				},
			}),
			Placeholder.configure({ placeholder }),
			Heading.configure({ levels: [1, 2, 3] }),
			Image.configure({
				inline: true,
				allowBase64: true,
			}),
			Markdown.configure({
				html: true,
				linkify: true,
				transformPastedText: true,
				transformCopiedText: true,
				// breaks: true,
			}),
			CodeBlockLowlight.configure({ lowlight }),
		],
		onUpdate: ({ editor }) => {
			onChange?.(editor);
		},
		content,
	});
	useImperativeHandle<TiptapEditor | null, TiptapEditor | null>(
		editorRef,
		() => editor,
	);

	return (
		<EditorContent
			placeholder={placeholder}
			disabled={disabled}
			editor={editor}
			className="grow flex flex-col overflow-auto"
		/>
	);
}
