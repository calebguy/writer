import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { EditorContent, useEditor } from "@tiptap/react";

const content = "";

export function Editor() {
	const editor = useEditor({
		extensions: [Document, Paragraph, Text],
		onUpdate: ({ editor }) => {
			console.log(editor.getHTML());
			console.log(editor.getText());
		},
		content,
	});

	return <EditorContent editor={editor} />;
}
