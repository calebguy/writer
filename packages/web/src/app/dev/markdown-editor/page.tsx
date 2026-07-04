import { notFound } from "next/navigation";
import { MarkdownEditorDevClient } from "./MarkdownEditorDevClient";

export default function MarkdownEditorDevPage() {
	if (process.env.NODE_ENV === "production") {
		notFound();
	}

	return <MarkdownEditorDevClient />;
}
