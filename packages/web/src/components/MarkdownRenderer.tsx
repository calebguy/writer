import { cn } from "@/utils/cn";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "./markdown/MDX.css";

interface MarkdownRendererProps {
	markdown: string;
	className?: string;
}

export function MarkdownRenderer({
	markdown,
	className,
}: MarkdownRendererProps) {
	return (
		<div className="mdx" style={{ position: "relative" }}>
			<div
				className={cn(
					"mdxeditor",
					"border p-2 border-neutral-900 aspect-square min-w-24 relative",
					className,
				)}
			>
				<div className="prose">
					<ReactMarkdown
						rehypePlugins={[rehypeHighlight]}
						components={{
							// Remove custom classes since CSS targets elements directly under .prose
							h1: ({ children }) => <h1>{children}</h1>,
							h2: ({ children }) => <h2>{children}</h2>,
							h3: ({ children }) => <h3>{children}</h3>,
							h4: ({ children }) => <h4>{children}</h4>,
							h5: ({ children }) => <h5>{children}</h5>,
							h6: ({ children }) => <h6>{children}</h6>,
							p: ({ children }) => <p>{children}</p>,
							blockquote: ({ children }) => <blockquote>{children}</blockquote>,
							ul: ({ children }) => <ul>{children}</ul>,
							ol: ({ children }) => <ol>{children}</ol>,
							li: ({ children }) => <li>{children}</li>,
							a: ({ children, href }) => <a href={href}>{children}</a>,
							strong: ({ children }) => <strong>{children}</strong>,
							em: ({ children }) => <em>{children}</em>,
							code: ({ children }) => <code>{children}</code>,
							pre: ({ children }) => <pre>{children}</pre>,
						}}
					>
						{markdown}
					</ReactMarkdown>
				</div>
			</div>
		</div>
	);
}
