import { LinkButton } from "@/plugins/LinkButton";
import { useEffect, useRef, useState } from "react";
import { BsTrash3Fill } from "react-icons/bs";
import { MdSave } from "react-icons/md";
import { RiArrowGoBackLine } from "react-icons/ri";

interface ReferenceEditProps {
	value: string;
	url: string;
	valuePlaceholder: string;
	urlPlaceholder: string;
	onSave: (url: string, value: string) => void;
	onDelete?: () => void;
}

export function ReferenceEdit({
	value,
	url,
	valuePlaceholder,
	urlPlaceholder,
	onSave,
	onDelete,
}: ReferenceEditProps) {
	const [draftUrl, setDraftUrl] = useState(url);
	const [draftValue, setDraftValue] = useState(value);
	const originalUrl = useRef(url);
	const originalValue = useRef(value);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		setDraftUrl(url);
		originalUrl.current = url;
	}, [url]);

	useEffect(() => {
		setDraftValue(value);
		originalValue.current = value;
	}, [value]);

	const hasChanged =
		draftUrl !== originalUrl.current || draftValue !== originalValue.current;
	const isValidUrl = (() => {
		try {
			const parsedUrl = new URL(draftUrl);
			return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
		} catch {
			return false;
		}
	})();
	const canSave = hasChanged && isValidUrl && draftValue.trim().length > 0;

	const handleSave = () => {
		onSave(draftUrl, draftValue);
	};

	const handleKeyDown = (event: React.KeyboardEvent) => {
		if (event.key === "Enter" && canSave) {
			event.preventDefault();
			handleSave();
		}
	};

	return (
		<div className="w-64 max-w-md p-2 bg-surface-raised border border-neutral-300 dark:border-neutral-800 relative flex flex-col gap-2">
			<div className="bg-neutral-200 dark:bg-neutral-800 py-1.5 px-2 overflow-x-auto flex items-center gap-1 scrollbar-none">
				<input
					type="text"
					value={draftValue}
					onChange={(event) => setDraftValue(event.target.value)}
					onKeyDown={handleKeyDown}
					className="flex-1 bg-transparent text-black dark:text-white text-sm leading-3 border-none outline-none placeholder:text-neutral-500"
					placeholder={valuePlaceholder}
				/>
			</div>
			<div className="bg-neutral-200 dark:bg-neutral-800 py-1.5 px-2 overflow-x-auto flex items-center gap-1 scrollbar-none">
				<input
					ref={inputRef}
					type="url"
					value={draftUrl}
					onChange={(event) => setDraftUrl(event.target.value)}
					onKeyDown={handleKeyDown}
					className="flex-1 bg-transparent text-primary text-sm leading-3 border-none outline-none placeholder:text-neutral-500"
					placeholder={urlPlaceholder}
				/>
			</div>

			<div className="flex justify-between items-center">
				<div className="flex items-center gap-1">
					{hasChanged && (
						<LinkButton
							onClick={() => {
								setDraftUrl(originalUrl.current);
								setDraftValue(originalValue.current);
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
}
