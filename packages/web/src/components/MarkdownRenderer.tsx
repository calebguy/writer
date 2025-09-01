import { cn } from "@/utils/cn";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";

interface MarkdownRendererProps {
	markdown: string;
	className?: string;
}

export function MarkdownRenderer({
	markdown,
	className,
}: MarkdownRendererProps) {
	return (
		<div
			className={cn(
				"mdx mdxeditor prose max-w-none",
				"border p-2 border-neutral-900 aspect-square min-w-24 relative",
				"bg-neutral-900 text-white",
				className,
			)}
		>
			<ReactMarkdown
				rehypePlugins={[rehypeHighlight]}
				components={{
					// Customize components to match your MDX styling
					h1: ({ children }) => <h1 className="mdx--heading-h1">{children}</h1>,
					h2: ({ children }) => <h2 className="mdx--heading-h2">{children}</h2>,
					h3: ({ children }) => <h3 className="mdx--heading-h3">{children}</h3>,
					h4: ({ children }) => <h4 className="mdx--heading-h4">{children}</h4>,
					h5: ({ children }) => <h5 className="mdx--heading-h5">{children}</h5>,
					h6: ({ children }) => <h6 className="mdx--heading-h6">{children}</h6>,
					p: ({ children }) => <p className="mdx--paragraph">{children}</p>,
					blockquote: ({ children }) => (
						<blockquote className="mdx--quote">{children}</blockquote>
					),
					ul: ({ children }) => <ul className="mdx--list-ul">{children}</ul>,
					ol: ({ children }) => <ol className="mdx--list-ol">{children}</ol>,
					li: ({ children }) => <li className="mdx--listItem">{children}</li>,
					a: ({ children, href }) => (
						<a href={href} className="mdx--link">
							{children}
						</a>
					),
					strong: ({ children }) => (
						<strong className="mdx--textBold">{children}</strong>
					),
					em: ({ children }) => <em className="mdx--textItalic">{children}</em>,
					code: ({ children }) => (
						<code className="mdx--textCode">{children}</code>
					),
					pre: ({ children }) => <pre className="mdx--code">{children}</pre>,
				}}
			>
				{markdown}
			</ReactMarkdown>
		</div>
	);
}
