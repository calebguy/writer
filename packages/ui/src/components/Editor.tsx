import BulletList from "@tiptap/extension-bullet-list";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Document from "@tiptap/extension-document";
import Heading from "@tiptap/extension-heading";
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

const lowlight = createLowlight(all);

interface EditorProps {
	initialContent?: string | null;
	onChange?: (editor: TiptapEditor) => void;
	disabled?: boolean;
}

export function Editor({
	initialContent: content,
	onChange,
	disabled,
}: EditorProps) {
	const editor = useEditor({
		editable: !disabled,
		editorProps: {
			attributes: {
				class:
					"grow flex flex-col border-[1px] border-dashed focus:border-lime border-transparent px-2 py-1 hover:bg-neutral-900 h-full caret-lime focuse:outline-none",
			},
		},
		extensions: [
			Document,
			Paragraph,
			Text,
			Markdown,
			BulletList,
			ListItem,
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
			className="grow flex flex-col"
		/>
	);
}
