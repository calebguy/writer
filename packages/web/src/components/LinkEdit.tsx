import { LinkButton } from "@/plugins/LinkButton";
import { useEffect, useRef, useState } from "react";
import { BsTrash3Fill } from "react-icons/bs";
import { MdSave } from "react-icons/md";
import { RiArrowGoBackLine } from "react-icons/ri";

interface LinkEditProps {
	url: string;
	text: string;
	title: string;
	onSave: (url: string, text: string) => void;
	onCancel: () => void;
	onDelete?: () => void;
}

export const LinkEdit: React.FC<LinkEditProps> = ({
	url,
	text,
	onSave,
	onCancel,
	onDelete,
}) => {
	const [linkUrl, setLinkUrl] = useState(url);
	const [linkText, setLinkText] = useState(text);
	const originalUrl = useRef(url);
	const originalText = useRef(text);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		setLinkUrl(url);
		originalUrl.current = url;
	}, [url]);

	useEffect(() => {
		setLinkText(text);
		originalText.current = text;
	}, [text]);

	const hasChanged =
		linkUrl !== originalUrl.current || linkText !== originalText.current;
	const isValidUrl = (() => {
		if (!linkUrl.trim()) return false;
		try {
			new URL(linkUrl);
			return true;
		} catch {
			return false;
		}
	})();
	const canSave = hasChanged && isValidUrl && linkText.trim().length > 0;


	const handleSave = () => {
		onSave(linkUrl, linkText);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleSave();
		} else if (e.key === "Escape") {
			onCancel();
		}
	};

	return (
		<div className="w-64 max-w-md p-2 bg-surface-raised border border-neutral-300 dark:border-neutral-800 relative flex flex-col gap-2">
			<div className="bg-neutral-200 dark:bg-neutral-800 py-1.5 px-2 overflow-x-auto flex items-center gap-1 scrollbar-none">
				<input
					type="text"
					value={linkText}
					onChange={(e) => setLinkText(e.target.value)}
					onKeyDown={handleKeyDown}
					className="flex-1 bg-transparent text-black dark:text-white text-sm leading-3 border-none outline-none placeholder:text-neutral-500"
					placeholder="Link text"
				/>
			</div>
			<div className="bg-neutral-200 dark:bg-neutral-800 py-1.5 px-2 overflow-x-auto flex items-center gap-1 scrollbar-none">
				<input
					ref={inputRef}
					type="url"
					value={linkUrl}
					onChange={(e) => setLinkUrl(e.target.value)}
					onKeyDown={handleKeyDown}
					className="flex-1 bg-transparent text-primary text-sm leading-3 border-none outline-none placeholder:text-neutral-500"
					placeholder="https://example.com"
				/>
			</div>

			<div className="flex justify-between items-center">
				<div className="flex items-center gap-1">
					{hasChanged && (
						<LinkButton
							onClick={() => {
								setLinkUrl(originalUrl.current);
								setLinkText(originalText.current);
							}}
						>
							<RiArrowGoBackLine className="w-3 h-3" />
						</LinkButton>
					)}
					{canSave && (
						<LinkButton
							onClick={handleSave}
							className="hover:bg-green-900! hover:text-green-300!"
						>
							<MdSave className="w-3 h-3" />
						</LinkButton>
					)}
				</div>
				{onDelete && (
					<LinkButton
						onClick={onDelete}
						className="hover:bg-red-900! hover:text-red-300!"
					>
						<BsTrash3Fill className="w-3 h-3" />
					</LinkButton>
				)}
			</div>
		</div>
	);
};
