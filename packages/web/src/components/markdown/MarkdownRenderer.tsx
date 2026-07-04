"use client";

import { cn } from "@/utils/cn";
import { Children, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { LinkPreviewAnchor } from "./LinkPreviewAnchor";
import solidity from "./language/solidity";
import "./MDX.css";

interface MarkdownRendererProps {
	markdown: string;
	className?: string;
	links?: boolean;
}

const HTML_IMAGE_TAG_PATTERN = /<img\b[^>]*>/gi;
const HTML_ATTRIBUTE_PATTERN =
	/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>/=`]+))/g;
const PRESERVED_BLANK_LINE = "\u00A0";

function escapeMarkdownImageAlt(value: string) {
	return value.replace(/([\\[\]])/g, "\\$1");
}

function escapeMarkdownImageTitle(value: string) {
	return value.replace(/(["\\])/g, "\\$1");
}

function readHtmlAttributes(tag: string) {
	const attributes: Record<string, string> = {};
	for (const match of tag.matchAll(HTML_ATTRIBUTE_PATTERN)) {
		const [, name, , doubleQuotedValue, singleQuotedValue, unquotedValue] =
			match;
		if (!name) continue;
		attributes[name.toLowerCase()] =
			doubleQuotedValue ?? singleQuotedValue ?? unquotedValue ?? "";
	}
	return attributes;
}

function convertHtmlImagesToMarkdown(input: string) {
	return input.replace(HTML_IMAGE_TAG_PATTERN, (tag) => {
		const attributes = readHtmlAttributes(tag);
		const src = attributes.src;
		if (!src) return tag;

		const alt = escapeMarkdownImageAlt(attributes.alt ?? "");
		const title = attributes.title;
		const destination = `<${src.replace(/[<>]/g, "")}>`;
		if (!title) return `![${alt}](${destination})`;

		return `![${alt}](${destination} "${escapeMarkdownImageTitle(title)}")`;
	});
}

function markdownFenceDelimiter(line: string) {
	const trimmed = line.trimStart();
	if (trimmed.startsWith("```")) return "```";
	if (trimmed.startsWith("~~~")) return "~~~";
	return null;
}

function preserveMarkdownBlankLines(input: string) {
	const output: string[] = [];
	const lines = input.split("\n");
	let pendingBlankLines = 0;
	let activeFence: string | null = null;

	const flushBlankLines = () => {
		if (pendingBlankLines === 0) return;
		output.push("");
		for (let index = 1; index < pendingBlankLines; index += 1) {
			output.push(PRESERVED_BLANK_LINE, "");
		}
		pendingBlankLines = 0;
	};

	for (const line of lines) {
		const fenceDelimiter = markdownFenceDelimiter(line);
		if (!activeFence && line.trim().length === 0) {
			pendingBlankLines += 1;
			continue;
		}

		flushBlankLines();
		output.push(line);

		if (!fenceDelimiter) continue;
		if (!activeFence) {
			activeFence = fenceDelimiter;
			continue;
		}
		if (activeFence === fenceDelimiter) activeFence = null;
	}

	flushBlankLines();
	return output.join("\n");
}

function isPreservedBlankLine(children: ReactNode) {
	const childArray = Children.toArray(children);
	return childArray.length === 1 && childArray[0] === PRESERVED_BLANK_LINE;
}

export function MarkdownRenderer({
	markdown,
	className,
	links = true,
}: MarkdownRendererProps) {
	return (
		<div className="mdx markdown-renderer" style={{ position: "relative" }}>
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
							p: ({ children }) =>
								isPreservedBlankLine(children) ? (
									<p className="preserved-blank-line" aria-hidden="true">
										{children}
									</p>
								) : (
									<p>{children}</p>
								),
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
							img: ({ alt, src, title }) => (
								<img
									src={src}
									alt={alt ?? ""}
									title={title}
									loading="lazy"
									decoding="async"
								/>
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
						{preserveMarkdownBlankLines(convertHtmlImagesToMarkdown(markdown))}
					</ReactMarkdown>
				</div>
			</div>
		</div>
	);
}
