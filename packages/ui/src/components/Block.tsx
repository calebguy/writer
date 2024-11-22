import { type MouseEventHandler, useCallback } from "react";
import { cn } from "../utils/cn";

import { Link } from "react-router-dom";

interface BlockProps {
	title: string;
	id: string;
	href?: string;
	onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export default function Block({ title, id, href, onClick }: BlockProps) {
	const className = cn(
		"border-0 hover:cursor-zoom-in border-neutral-700 px-3 py-2 bg-neutral-900 aspect-square flex flex-col justify-between",
	);

	const renderChildren = useCallback(() => {
		return (
			<>
				<div className="text-left text-neutral-200">{title}</div>
				<div className="text-right text-neutral-600">{id}</div>
			</>
		);
	}, [title, id]);
	return href ? (
		<Link onClick={onClick} to={href} key={id} className={className}>
			{renderChildren()}
		</Link>
	) : (
		<div className={className}>{renderChildren()}</div>
	);
}
