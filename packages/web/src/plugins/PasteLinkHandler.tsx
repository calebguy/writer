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
					console.log("Paste command detected"); // Debug log

					// Get the pasted text from the clipboard
					const clipboardData = (event as ClipboardEvent).clipboardData;
					if (!clipboardData) return false;

					const pastedText = clipboardData.getData("text/plain");
					console.log("Pasted text:", pastedText); // Debug log

					if (!pastedText) return false;

					// Check if pasted content looks like a URL
					const urlRegex =
						/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
					const isUrl = urlRegex.test(pastedText.trim());
					console.log("Is URL:", isUrl); // Debug log

					if (isUrl) {
						// Get the current selection
						const selection = $getSelection();
						if (!$isRangeSelection(selection)) {
							console.log("No range selection found"); // Debug log
							return false;
						}

						const selectedText = selection.getTextContent().trim();
						console.log("Selected text:", selectedText); // Debug log

						if (selectedText) {
							console.log("Creating link from selection"); // Debug log

							// Create the URL
							const url = pastedText.trim().startsWith("http")
								? pastedText.trim()
								: `https://${pastedText.trim()}`;

							console.log("Creating link node with URL:", url); // Debug log

							// Create a link node with the selected text as content
							const linkNode = $createLinkNode(url);
							const textNode = $createTextNode(selectedText);
							linkNode.append(textNode);

							// Replace the selection with the link node
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
