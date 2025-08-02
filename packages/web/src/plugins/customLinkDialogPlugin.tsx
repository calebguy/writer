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
		<div className="w-64 max-w-md p-2 shadow-xl bg-neutral-900 relative flex flex-col gap-2">
			<div className="bg-neutral-800 pr-1 pt-1 pb-1 pl-0.5 overflow-x-auto flex items-center gap-1 relative">
				<a
					href={url}
					target="_blank"
					rel="noopener noreferrer"
					className="break-keep text-secondary hover:underline whitespace-nowrap text-sm leading-3"
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

const LinkButton: React.FC<{
	children: React.ReactNode;
	onClick: () => void;
	className?: string;
}> = ({ children, onClick, className }) => {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"bg-neutral-900 p-1 text-xs font-medium hover:bg-neutral-800 focus:outline-none cursor-pointer leading-[1px]",
				className,
			)}
		>
			{children}
		</button>
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

import { cn } from "@/utils/cn";
import { realmPlugin } from "@mdxeditor/editor";

export const customLinkDialogPlugin = realmPlugin({
	init(realm) {
		realm.pubIn({
			[addComposerChild$]: () => <CustomLinkDialogComponent />,
		});
	},
});
