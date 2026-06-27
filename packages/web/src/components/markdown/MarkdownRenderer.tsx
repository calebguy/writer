"use client";

import { cn } from "@/utils/cn";
import { LinkPreviewAnchor } from "./LinkPreviewAnchor";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import solidity from "./language/solidity";
import remarkGfm from "remark-gfm";
import "./MDX.css";

interface MarkdownRendererProps {
	markdown: string;
	className?: string;
	links?: boolean;
}

export function MarkdownRenderer({
	markdown,
	className,
	links = true,
}: MarkdownRendererProps) {
	return (
		<div className="mdx" style={{ position: "relative" }}>
			<div className={cn("mdxeditor", "grow min-w-24 relative", className)}>
				<div className="prose">
					<ReactMarkdown
						remarkPlugins={[remarkGfm]}
						rehypePlugins={[[rehypeHighlight, { languages: { solidity } }]]}
						components={{
							// Preserve GFM-generated class names (for example task lists)
							// while keeping styling controlled by MDX.css.
							h1: ({ children }) => <h1>{children}</h1>,
							h2: ({ children }) => <h2>{children}</h2>,
							h3: ({ children }) => <h3>{children}</h3>,
							h4: ({ children }) => <h4>{children}</h4>,
							h5: ({ children }) => <h5>{children}</h5>,
							h6: ({ children }) => <h6>{children}</h6>,
							p: ({ children }) => <p>{children}</p>,
							blockquote: ({ children }) => <blockquote>{children}</blockquote>,
							ul: ({ children, className }) => (
								<ul className={className}>{children}</ul>
							),
							ol: ({ children, className }) => (
								<ol className={className}>{children}</ol>
							),
							li: ({ children, className }) => (
								<li className={className}>{children}</li>
							),
							input: ({ type, checked }) =>
								type === "checkbox" ? (
									<input type="checkbox" checked={checked} readOnly />
								) : (
									<input type={type} readOnly />
								),
							a: ({ children, href }) =>
								links ? (
									<LinkPreviewAnchor href={href}>{children}</LinkPreviewAnchor>
								) : (
									<span className="underline text-primary">{children}</span>
								),
							strong: ({ children }) => <strong>{children}</strong>,
							em: ({ children }) => <em>{children}</em>,
							code: ({ children, className }) => (
								<code className={className}>{children}</code>
							),
							pre: ({ children, className }) => (
								<pre className={className}>{children}</pre>
							),
						}}
					>
						{markdown}
					</ReactMarkdown>
				</div>
			</div>
		</div>
	);
}
