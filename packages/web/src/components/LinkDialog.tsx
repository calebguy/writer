import { useEffect, useState } from "react";

interface LinkDialogProps {
	url: string;
	title: string;
	onSave: (url: string, title: string) => void;
	onCancel: () => void;
}

export const LinkDialog: React.FC<LinkDialogProps> = ({
	url,
	title,
	onSave,
	onCancel,
}) => {
	const [linkUrl, setLinkUrl] = useState(url);
	const [linkTitle, setLinkTitle] = useState(title);

	useEffect(() => {
		setLinkUrl(url);
		setLinkTitle(title);
	}, [url, title]);

	const handleSave = () => {
		onSave(linkUrl, linkTitle);
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
		<div className="w-96 max-w-md rounded-lg border border-neutral-900 bg-white p-6 shadow-xl dark:bg-gray-800">
			{/* Header */}
			<div className="mb-4 flex items-center justify-between">
				<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
					Edit Link
				</h3>
				<button
					type="button"
					onClick={handleCancel}
					className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
					aria-label="Close dialog"
				>
					<svg
						aria-hidden="true"
						className="h-5 w-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			{/* Form */}
			<div className="space-y-4">
				{/* URL Field */}
				<div>
					<label
						htmlFor="url"
						className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
					>
						URL
					</label>
					<input
						id="url"
						type="url"
						value={linkUrl}
						onChange={(e) => setLinkUrl(e.target.value)}
						onKeyDown={handleKeyDown}
						className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
						placeholder="https://example.com"
					/>
				</div>

				{/* Title Field */}
				<div>
					<label
						htmlFor="title"
						className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
					>
						Title (optional)
					</label>
					<input
						id="title"
						type="text"
						value={linkTitle}
						onChange={(e) => setLinkTitle(e.target.value)}
						onKeyDown={handleKeyDown}
						className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
						placeholder="Link tooltip text"
					/>
				</div>

				{/* Preview */}
				{linkUrl && (
					<div className="rounded-md bg-gray-50 p-3 dark:bg-gray-700">
						<p className="mb-1 text-sm text-gray-600 dark:text-gray-400">
							Preview:
						</p>
						<a
							href={linkUrl}
							target="_blank"
							rel="noopener noreferrer"
							title={linkTitle || undefined}
							className="text-blue-600 hover:underline dark:text-blue-400"
						>
							{linkTitle || linkUrl}
						</a>
					</div>
				)}
			</div>

			{/* Actions */}
			<div className="mt-6 flex justify-end space-x-3">
				<button
					type="button"
					onClick={handleCancel}
					className="rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:border-gray-600 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
				>
					Cancel
				</button>
				<button
					type="button"
					onClick={handleSave}
					disabled={!linkUrl.trim()}
					className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
				>
					Save
				</button>
			</div>
		</div>
	);
};
