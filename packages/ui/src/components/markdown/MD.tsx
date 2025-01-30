import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import { cn } from "../../utils/cn";
import solidity from "./language/solidity";

interface MDProps {
	children?: string | null;
	className?: string;
}

const test = () =>
	rehypeHighlight({
		languages: {
			solidity: solidity,
		},
	});

export function MD({ children, className }: MDProps) {
	return (
		<ReactMarkdown
			components={{
				a: (props) => (
					<a {...props} target="_blank" rel="noopener noreferrer" />
				),
			}}
			rehypePlugins={[test]}
			className={cn(
				className,
				"md grow flex flex-col h-full caret-primary overflow-y-auto break-anywhere whitespace-pre-wrap",
			)}
		>
			{children}
		</ReactMarkdown>
	);
}
