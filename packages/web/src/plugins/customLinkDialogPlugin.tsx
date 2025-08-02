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
import { BsTrash3Fill } from "react-icons/bs";
import { FaCheck } from "react-icons/fa6";
import { MdEdit } from "react-icons/md";
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

const LinkEditForm: React.FC<{ initialUrl: string | undefined }> = ({
	initialUrl,
}) => {
	const updateLink = usePublisher(updateLink$);
	const cancelLinkEdit = usePublisher(cancelLinkEdit$);

	const handleSave = (url: string) => {
		updateLink({
			url: url,
			title: undefined,
		});
	};

	const handleCancel = () => {
		cancelLinkEdit();
	};

	return (
		<LinkEdit
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

	const handleRemoveLink = () => {
		removeLink();
		closeLinkDialog();
	};

	return (
		<div className="w-64 max-w-md p-2 shadow-xl bg-neutral-900 relative flex flex-col gap-2">
			<div className="bg-neutral-800 p-2 overflow-x-auto flex items-center gap-1 scrollbar-none">
				<a
					href={url}
					target="_blank"
					rel="noopener noreferrer"
					className="break-keep text-secondary hover:underline whitespace-nowrap text-sm leading-3 flex-1"
				>
					{url}
				</a>
			</div>

			<div className="flex justify-between items-center">
				<div className="flex items-center gap-1">
					<LinkButton
						onClick={closeLinkDialog}
						className="hover:bg-green-900! hover:text-green-300!"
					>
						<FaCheck className="w-3 h-3" />
					</LinkButton>
					<LinkButton onClick={switchFromPreviewToLinkEdit}>
						<MdEdit className="w-3 h-3" />
					</LinkButton>
				</div>
				<LinkButton
					onClick={handleRemoveLink}
					className="hover:bg-red-900! hover:text-red-300!"
				>
					<BsTrash3Fill className="w-3 h-3" />
				</LinkButton>
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
import { LinkButton } from "./LinkButton";

export const customLinkDialogPlugin = realmPlugin({
	init(realm) {
		realm.pubIn({
			[addComposerChild$]: () => <CustomLinkDialogComponent />,
		});
	},
});
