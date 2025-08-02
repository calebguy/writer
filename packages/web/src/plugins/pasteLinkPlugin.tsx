import { LinkNode } from "@lexical/link";
import {
	addComposerChild$,
	addExportVisitor$,
	addLexicalNode$,
	realmPlugin,
} from "@mdxeditor/editor";
import { PasteLinkHandler } from "./PasteLinkHandler";

// Simple export visitor for LinkNode
const LexicalLinkExportVisitor = {
	testLexicalNode: (node: any) => node.getType() === "link",
	visitLexicalNode: ({
		lexicalNode,
		actions,
	}: { lexicalNode: any; actions: any }) => {
		const url = lexicalNode.getURL();
		const text = lexicalNode.getTextContent();
		actions.addAndStepInto("link", { url, title: text });
	},
};

/**
 * Custom plugin that automatically converts pasted URLs into links when text is highlighted.
 * This plugin should be used instead of the default linkPlugin to avoid conflicts.
 */
export const pasteLinkPlugin = realmPlugin({
	init(realm) {
		console.log("pasteLinkPlugin initialized!"); // Debug log
		realm.pubIn({
			[addLexicalNode$]: [LinkNode],
			[addExportVisitor$]: LexicalLinkExportVisitor,
			[addComposerChild$]: () => <PasteLinkHandler realm={realm} />,
		});
	},
});
