import { $createLinkNode } from "@lexical/link";
import type { Realm } from "@mdxeditor/editor";
import { createRootEditorSubscription$ } from "@mdxeditor/editor";
import {
	$createTextNode,
	$getSelection,
	$isRangeSelection,
	COMMAND_PRIORITY_CRITICAL,
	PASTE_COMMAND,
} from "lexical";
import React from "react";

interface PasteLinkHandlerProps {
	realm: Realm;
}

/**
 * Plugin component that handles paste link functionality using Lexical commands
 */
export const PasteLinkHandler: React.FC<PasteLinkHandlerProps> = ({
	realm,
}) => {
	React.useEffect(() => {
		// Subscribe to the root editor to register our paste command
		realm.pub(createRootEditorSubscription$, (editor) => {
			return editor.registerCommand(
				PASTE_COMMAND,
				(event) => {
					// Get the pasted text from the clipboard
					const clipboardData = (event as ClipboardEvent).clipboardData;
					if (!clipboardData) return false;

					const pastedText = clipboardData.getData("text/plain");
					if (!pastedText) return false;

					// Check if pasted content looks like a URL
					const trimmed = pastedText.trim();
					let parsedUrl: URL | null = null;
					try {
						parsedUrl = new URL(
							trimmed.startsWith("http") ? trimmed : `https://${trimmed}`,
						);
					} catch {
						// not a valid URL
					}
					const isUrl =
						parsedUrl !== null &&
						(parsedUrl.protocol === "http:" ||
							parsedUrl.protocol === "https:") &&
						parsedUrl.hostname.includes(".");

					if (isUrl) {
						// Get the current selection
						const selection = $getSelection();
						if (!$isRangeSelection(selection)) {
							return false;
						}

						const selectedText = selection.getTextContent().trim();
						if (selectedText) {
							// Create a link node with the selected text as content
							const linkNode = $createLinkNode(parsedUrl!.href);
							const textNode = $createTextNode(selectedText);
							linkNode.append(textNode);

							// Remove selected text first, then insert the link
							selection.removeText();
							selection.insertNodes([linkNode]);

							return true; // Prevent default paste behavior
						}
					}

					return false; // Allow default paste behavior
				},
				COMMAND_PRIORITY_CRITICAL,
			);
		});

		return () => {
			// Cleanup is handled by the subscription
		};
	}, [realm]);

	return null;
};
