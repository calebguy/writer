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
import { Markdown } from "tiptap-markdown";

const lowlight = createLowlight(all);

interface EditorProps {
	content?: string;
	onChange?: (editor: TiptapEditor) => void;
}

export function Editor({ content, onChange }: EditorProps) {
	const editor = useEditor({
		editorProps: {
			attributes: {
				class: "grow flex flex-col",
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

	return <EditorContent editor={editor} className="grow flex flex-col" />;
}
