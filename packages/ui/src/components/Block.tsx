import { type MouseEventHandler, useCallback } from "react";
import { cn } from "../utils/cn";

import { Link } from "react-router-dom";
import { Editor } from "./Editor";

interface BlockProps {
	title: string;
	id?: string;
	href?: string;
	onClick?: MouseEventHandler<HTMLAnchorElement>;
	isLoading?: boolean;
}

export default function Block({
	title,
	id,
	href,
	onClick,
	isLoading,
}: BlockProps) {
	const className = cn(
		"border-0 border-neutral-700 bg-neutral-900 aspect-square flex flex-col justify-between overflow-auto",
		{
			"hover:cursor-wait": isLoading,
			"hover:cursor-zoom-in": !isLoading,
		},
	);

	const renderChildren = useCallback(() => {
		return (
			<>
				<Editor initialContent={title} disabled />
				<div className="text-right text-neutral-600 mt-1 text-sm px-2 py-1">
					{id}
				</div>
			</>
		);
	}, [title, id]);
	return href && !isLoading ? (
		<Link onClick={onClick} to={href} key={id} className={className}>
			{renderChildren()}
		</Link>
	) : (
		<div className={className}>{renderChildren()}</div>
	);
}
