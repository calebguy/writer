import {
	Action,
	activeEditor$,
	addComposerChild$,
	cancelLinkEdit$,
	editorRootElementRef$,
	linkDialogState$,
	removeLink$,
	switchFromPreviewToLinkEdit$,
	updateLink$,
	useCellValues,
	usePublisher,
	withLatestFrom,
} from "@mdxeditor/editor";
import { $getNodeByKey } from "lexical";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LinkEdit } from "../components/LinkEdit";

const closeLinkDialog$ = Action((r) => {
	r.sub(
		r.pipe(closeLinkDialog$, withLatestFrom(linkDialogState$)),
		([, state]) => {
			if (state.type !== "inactive") {
				r.pub(linkDialogState$, {
					type: "inactive",
				});
			}
		},
	);
});

const CombinedLinkDialog: React.FC<{
	url: string | undefined;
	text: string | undefined;
	linkNodeKey: string | undefined;
	type: "edit" | "preview";
}> = ({ url, text: textProp, linkNodeKey, type }) => {
	const updateLink = usePublisher(updateLink$);
	const cancelLinkEdit = usePublisher(cancelLinkEdit$);
	const closeLinkDialog = usePublisher(closeLinkDialog$);
	const removeLink = usePublisher(removeLink$);
	const switchFromPreviewToLinkEdit = usePublisher(
		switchFromPreviewToLinkEdit$,
	);
	const [activeEditor] = useCellValues(activeEditor$);
	const [resolvedText, setResolvedText] = useState<string | null>(
		textProp || null,
	);

	// Read text from editor node and keep it in sync
	useEffect(() => {
		if (textProp) {
			setResolvedText(textProp);
			return;
		}
		if (!activeEditor || !linkNodeKey) return;

		const readText = () => {
			activeEditor.getEditorState().read(() => {
				const node = $getNodeByKey(linkNodeKey);
				if (node) {
					setResolvedText(node.getTextContent());
				}
			});
		};

		readText();
		return activeEditor.registerUpdateListener(() => readText());
	}, [activeEditor, linkNodeKey, textProp]);

	const handleSave = (newUrl: string, newText: string) => {
		updateLink({
			url: newUrl,
			title: undefined,
			text: newText,
		});
	};

	const handleCancel = () => {
		if (type === "edit") {
			cancelLinkEdit();
		} else {
			closeLinkDialog();
		}
	};

	const handleDelete = () => {
		removeLink();
		closeLinkDialog();
	};

	// For preview mode, switch to edit so changes can be saved
	const handleSaveFromPreview = (newUrl: string, newText: string) => {
		switchFromPreviewToLinkEdit();
		setTimeout(() => {
			updateLink({
				url: newUrl,
				title: undefined,
				text: newText,
			});
		}, 0);
	};

	if (resolvedText === null) {
		return null;
	}

	return (
		<LinkEdit
			url={url || ""}
			text={resolvedText}
			title=""
			onSave={type === "edit" ? handleSave : handleSaveFromPreview}
			onCancel={handleCancel}
			onDelete={handleDelete}
		/>
	);
};

const CustomLinkDialogComponent: React.FC = () => {
	const [linkDialogState, editorRootElementRef] = useCellValues(
		linkDialogState$,
		editorRootElementRef$,
	);
	const [visible, setVisible] = useState(false);
	const prevStateType = useRef(linkDialogState.type);
	const delayTimer = useRef<number | null>(null);

	useEffect(() => {
		const wasInactive = prevStateType.current === "inactive";
		prevStateType.current = linkDialogState.type;

		if (linkDialogState.type === "inactive") {
			setVisible(false);
			if (delayTimer.current !== null) window.clearTimeout(delayTimer.current);
			return;
		}

		if (wasInactive) {
			// Dialog just appeared — delay to distinguish click from paste
			// On paste, mdxeditor will quickly cycle through states
			// On click, the state persists
			setVisible(false);
			if (delayTimer.current !== null) window.clearTimeout(delayTimer.current);
			delayTimer.current = window.setTimeout(() => {
				setVisible(true);
			}, 100);
		}

		return () => {
			if (delayTimer.current !== null) window.clearTimeout(delayTimer.current);
		};
	}, [linkDialogState]);

	if (linkDialogState.type === "inactive" || !visible) {
		return null;
	}

	return createPortal(
		<div
			className="absolute z-[9999]"
			style={{
				top: `${
					window.scrollY +
					linkDialogState.rectangle.top +
					linkDialogState.rectangle.height +
					5
				}px`,
				left: `${window.scrollX + linkDialogState.rectangle.left}px`,
			}}
		>
			<CombinedLinkDialog
				url={linkDialogState.url}
				text={
					linkDialogState.type === "edit" ? linkDialogState.text : undefined
				}
				linkNodeKey={linkDialogState.linkNodeKey}
				type={linkDialogState.type}
			/>
		</div>,
		document.body,
	);
};

import { realmPlugin } from "@mdxeditor/editor";

export const customLinkDialogPlugin = realmPlugin({
	init(realm) {
		realm.pubIn({
			[addComposerChild$]: () => <CustomLinkDialogComponent />,
		});
	},
});
