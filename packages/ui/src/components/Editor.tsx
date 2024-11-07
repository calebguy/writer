import BulletList from "@tiptap/extension-bullet-list";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Document from "@tiptap/extension-document";
import Heading from "@tiptap/extension-heading";
import ListItem from "@tiptap/extension-list-item";
import Paragraph from "@tiptap/extension-paragraph";

import Text from "@tiptap/extension-text";
import { EditorContent, useEditor } from "@tiptap/react";
import { all, createLowlight } from "lowlight";
import { Markdown } from "tiptap-markdown";

const content = "";

const lowlight = createLowlight(all);

export function Editor() {
	const editor = useEditor({
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
			console.log(editor.storage.markdown.getMarkdown());
		},
		content,
	});

	return <EditorContent editor={editor} />;
}
