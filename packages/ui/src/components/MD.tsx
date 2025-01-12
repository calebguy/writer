import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import { cn } from "../utils/cn";

interface MDProps {
	children?: string | null;
	className?: string;
}

export function MD({ children, className }: MDProps) {
	return (
		<ReactMarkdown
			rehypePlugins={[rehypeHighlight]}
			className={cn(
				className,
				"md grow flex flex-col h-full caret-lime overflow-y-auto break-anywhere",
			)}
		>
			{children}
		</ReactMarkdown>
	);
}
