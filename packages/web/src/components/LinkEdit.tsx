import type { FC } from "react";
import { ReferenceEdit } from "./ReferenceEdit";

interface LinkEditProps {
	url: string;
	text: string;
	title: string;
	onSave: (url: string, text: string) => void;
	onCancel: () => void;
	onDelete?: () => void;
}

export const LinkEdit: FC<LinkEditProps> = ({
	url,
	text,
	onSave,
	onDelete,
}) => (
	<ReferenceEdit
		value={text}
		url={url}
		valuePlaceholder="Link text"
		urlPlaceholder="https://example.com"
		onSave={onSave}
		onDelete={onDelete}
	/>
);
