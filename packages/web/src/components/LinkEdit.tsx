import { LinkButton } from "@/plugins/LinkButton";
import { useEffect, useRef, useState } from "react";
import { MdSave } from "react-icons/md";
import { RiArrowGoBackLine } from "react-icons/ri";

interface LinkEditProps {
	url: string;
	text: string;
	title: string;
	onSave: (url: string, text: string) => void;
	onCancel: () => void;
}

export const LinkEdit: React.FC<LinkEditProps> = ({
	url,
	text,
	onSave,
	onCancel,
}) => {
	const [linkUrl, setLinkUrl] = useState(url);
	const [linkText, setLinkText] = useState(text);
	const [originalUrl, setOriginalUrl] = useState(url);
	const [originalText, setOriginalText] = useState(text);
	const inputRef = useRef<HTMLInputElement>(null);

	// Check if URL has changed and is valid
	const hasChanged = linkUrl !== originalUrl || linkText !== originalText;
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

	useEffect(() => {
		if (inputRef.current) {
			inputRef.current.focus();
			// Move cursor to the beginning
			inputRef.current.setSelectionRange(0, 0);
			// Scroll to the beginning
			inputRef.current.scrollLeft = 0;
		}
	}, []);

	useEffect(() => {
		setLinkUrl(url);
	}, [url]);

	useEffect(() => {
		setLinkText(text);
	}, [text]);

	const handleSave = () => {
		onSave(linkUrl, linkText);
	};

	const handleCancel = () => {
		onCancel();
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleSave();
		} else if (e.key === "Escape") {
			handleCancel();
		}
	};

	return (
		<div className="w-64 max-w-md p-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 relative flex flex-col gap-2">
			<div className="bg-neutral-200 dark:bg-neutral-800 py-1.5 px-2 overflow-x-auto flex items-center gap-1 scrollbar-none">
				<input
					type="text"
					value={linkText}
					onChange={(e) => setLinkText(e.target.value)}
					onKeyDown={handleKeyDown}
					className="flex-1 bg-transparent text-secondary text-sm leading-3 border-none outline-none placeholder:text-neutral-500"
					placeholder="Link text"
				/>
			</div>
			<div className="bg-neutral-200 dark:bg-neutral-800 py-1.5 px-2 overflow-x-auto flex items-center gap-1 scrollbar-none">
				<input
					autoFocus
					ref={inputRef}
					type="url"
					value={linkUrl}
					onChange={(e) => setLinkUrl(e.target.value)}
					onKeyDown={handleKeyDown}
					className="flex-1 bg-transparent text-secondary text-sm leading-3 border-none outline-none placeholder:text-neutral-500"
					placeholder="https://example.com"
				/>
			</div>

			<div className="flex justify-between items-center">
				<div className="flex items-center gap-1">
					<LinkButton
						onClick={handleCancel}
						className="disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-neutral-100! dark:disabled:hover:bg-neutral-900! disabled:hover:text-neutral-400! dark:disabled:hover:text-neutral-300!"
					>
						<RiArrowGoBackLine className="w-3 h-3" />
					</LinkButton>
					<LinkButton
						onClick={handleSave}
						disabled={!canSave}
						className="hover:bg-green-900! hover:text-green-300! disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-neutral-100! dark:disabled:hover:bg-neutral-900! disabled:hover:text-neutral-400! dark:disabled:hover:text-neutral-300!"
					>
						<MdSave className="w-3 h-3" />
					</LinkButton>
				</div>
			</div>
		</div>
	);
};
