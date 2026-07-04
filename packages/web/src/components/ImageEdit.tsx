import { LinkEdit } from "./LinkEdit";

interface ImageEditProps {
	src: string;
	altText: string;
	onSave: (src: string, altText: string) => void;
	onDelete?: () => void;
}

export function ImageEdit({ src, altText, onSave, onDelete }: ImageEditProps) {
	return (
		<LinkEdit
			url={src}
			text={altText}
			title=""
			onSave={onSave}
			onCancel={() => undefined}
			onDelete={onDelete}
		/>
	);
}
