import {
	Action,
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
import * as Popover from "@radix-ui/react-popover";
import { LinkDialog } from "../components/LinkDialog";

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

const LinkEditForm: React.FC<{ initialUrl: string | undefined }> = ({
	initialUrl,
}) => {
	const updateLink = usePublisher(updateLink$);
	const cancelLinkEdit = usePublisher(cancelLinkEdit$);

	const handleSave = (url: string, title: string) => {
		updateLink({
			title: title || "",
			url: url,
		});
	};

	const handleCancel = () => {
		cancelLinkEdit();
	};

	return (
		<LinkDialog
			url={initialUrl || ""}
			title=""
			onSave={handleSave}
			onCancel={handleCancel}
		/>
	);
};

const LinkPreview: React.FC<{ url: string }> = ({ url }) => {
	const switchFromPreviewToLinkEdit = usePublisher(
		switchFromPreviewToLinkEdit$,
	);
	const closeLinkDialog = usePublisher(closeLinkDialog$);
	const removeLink = usePublisher(removeLink$);

	const handleCopyLink = async () => {
		try {
			await navigator.clipboard.writeText(url);
			// You could add a toast notification here if you have a toast system
		} catch (err) {
			console.error("Failed to copy link:", err);
		}
	};

	const handleRemoveLink = () => {
		removeLink();
		closeLinkDialog();
	};

	return (
		<div className="w-64 max-w-md p-2 shadow-xl bg-neutral-900 relative">
			<div className="space-y-4">
				<div className="bg-neutral-800 px-2 py-1 overflow-x-auto">
					<a
						href={url}
						target="_blank"
						rel="noopener noreferrer"
						className="break-keep text-secondary hover:underline whitespace-nowrap"
					>
						{url}
					</a>
				</div>
			</div>

			<div className="mt-6 flex justify-between">
				<div className="flex space-x-2">
					<button
						type="button"
						onClick={handleCopyLink}
						className="rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:border-gray-600 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
					>
						Copy
					</button>
					<button
						type="button"
						onClick={handleRemoveLink}
						className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:border-red-600 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
					>
						Remove
					</button>
				</div>
				<div className="flex space-x-3">
					<button
						type="button"
						onClick={() => closeLinkDialog()}
						className="rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:border-gray-600 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
					>
						Close
					</button>
					<button
						type="button"
						onClick={() => switchFromPreviewToLinkEdit()}
						className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
					>
						Edit
					</button>
				</div>
			</div>
		</div>
	);
};

const CustomLinkDialogComponent: React.FC = () => {
	const [linkDialogState, editorRootElementRef] = useCellValues(
		linkDialogState$,
		editorRootElementRef$,
	);

	if (linkDialogState.type === "inactive") {
		return null;
	}

	return (
		<Popover.Root open={true}>
			<Popover.Portal>
				<Popover.Content
					className="z-[9999]"
					sideOffset={5}
					onOpenAutoFocus={(e) => e.preventDefault()}
					onCloseAutoFocus={(e) => e.preventDefault()}
					style={{
						position: "absolute",
						top: `${
							linkDialogState.rectangle.top +
							linkDialogState.rectangle.height +
							5
						}px`,
						left: `${linkDialogState.rectangle.left}px`,
					}}
				>
					{linkDialogState.type === "edit" && (
						<LinkEditForm initialUrl={linkDialogState.url} />
					)}
					{linkDialogState.type === "preview" && (
						<LinkPreview url={linkDialogState.url} />
					)}
					<Popover.Arrow className="fill-white dark:fill-gray-800" />
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
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
