import ReactMarkdown from "react-markdown";
import { cn } from "../utils/cn";

interface MDProps {
	children: string;
	className?: string;
}

export function MD({ children, className }: MDProps) {
	return (
		<ReactMarkdown
			className={cn(
				className,
				"md grow flex flex-col h-full caret-lime overflow-y-auto break-words",
			)}
		>
			{children}
		</ReactMarkdown>
	);
}
