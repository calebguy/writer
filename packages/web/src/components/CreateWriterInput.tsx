"use client";

import type { MDXEditorMethods } from "@mdxeditor/editor";
import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";

const MDX = dynamic(() => import("./markdown/MDX"), { ssr: false });

export default function CreateWriterInput() {
	const editorRef = useRef<MDXEditorMethods>(null);

	useEffect(() => {
		if (editorRef.current) {
			editorRef.current.focus();
		}
	}, []);

	return (
		<div className="group aspect-square w-full h-full border border-black hover:cursor-text hover:bg-neutral-900 hover:!border-neutral-900 p-2">
			<div className="group-hover:hidden w-full h-full flex justify-center items-center text-2xl">
				+
			</div>
			<div className="hidden group-hover:block w-full h-full text-2xl text-neutral-600">
				Create a Place
			</div>
			<MDX markdown="Create a Place" ref={editorRef} />
		</div>
	);
}
