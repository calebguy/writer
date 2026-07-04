"use client";

import { ImageEdit } from "@/components/ImageEdit";
import { customLinkDialogPlugin } from "@/plugins/customLinkDialogPlugin";
import { pasteLinkPlugin } from "@/plugins/pasteLinkPlugin";
import { cn } from "@/utils/cn";
import {
	HighlightStyle,
	LanguageDescription,
	LanguageSupport,
	StreamLanguage,
	syntaxHighlighting,
} from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { clike } from "@codemirror/legacy-modes/mode/clike";
import { Prec } from "@codemirror/state";
import { LinkNode } from "@lexical/link";
import { STRIKETHROUGH } from "@lexical/markdown";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { tags } from "@lezer/highlight";
import {
	$createImageNode,
	$isImageNode,
	MDXEditor,
	type MDXEditorMethods,
	activeEditor$,
	addComposerChild$,
	addNestedEditorChild$,
	closeImageDialog$,
	codeBlockPlugin,
	codeMirrorPlugin,
	headingsPlugin,
	imageDialogState$,
	imagePlugin,
	linkPlugin,
	listsPlugin,
	markdownShortcutPlugin,
	openEditImageDialog$,
	quotePlugin,
	realmPlugin,
	saveImage$,
	useCellValues,
	usePublisher,
} from "@mdxeditor/editor";
import {
	$getNodeByKey,
	$isTextNode,
	COMMAND_PRIORITY_LOW,
	FORMAT_TEXT_COMMAND,
	KEY_DOWN_COMMAND,
} from "lexical";
import "@mdxeditor/editor/style.css";
import { type FC, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./MDX.css";

interface EditorProps {
	markdown: string;
	ref?: React.MutableRefObject<MDXEditorMethods | null>;
	onChange?: (markdown: string) => void;
	className?: string;
	readOnly?: boolean;
	placeholder?: string;
	renderPlaceholderAsMarkdown?: boolean;
	autoFocus?: boolean;
	aspectSquare?: boolean;
}

function ImageMarkdownShortcut() {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		return editor.registerNodeTransform(LinkNode, (linkNode) => {
			const previousSibling = linkNode.getPreviousSibling();
			if (!$isTextNode(previousSibling)) return;

			const previousText = previousSibling.getTextContent();
			if (!previousText.endsWith("!")) return;

			const imageNode = $createImageNode({
				altText: linkNode.getTextContent(),
				src: linkNode.getURL(),
				title: linkNode.getTitle() ?? undefined,
			});
			if (previousText.length === 1) {
				previousSibling.remove();
			} else {
				previousSibling.setTextContent(previousText.slice(0, -1));
			}
			linkNode.replace(imageNode);
		});
	}, [editor]);

	return null;
}

const imageMarkdownShortcutPlugin = realmPlugin({
	init(realm) {
		realm.pubIn({
			[addComposerChild$]: ImageMarkdownShortcut,
			[addNestedEditorChild$]: ImageMarkdownShortcut,
		});
	},
});

const IMAGE_EDIT_DIALOG_WIDTH = 256;
const IMAGE_EDIT_DIALOG_GUTTER = 16;
const IMAGE_EDIT_DIALOG_OFFSET = 8;

function imageEditDialogPosition() {
	const selectedImage = document.querySelector<HTMLElement>(
		'[data-editor-block-type="image"] img[class*="focusedImage"], [data-editor-block-type="image"] img',
	);
	if (!selectedImage) {
		return {
			left:
				window.scrollX +
				Math.max(
					IMAGE_EDIT_DIALOG_GUTTER,
					(window.innerWidth - IMAGE_EDIT_DIALOG_WIDTH) / 2,
				),
			top: window.scrollY + IMAGE_EDIT_DIALOG_GUTTER,
		};
	}

	const rect = selectedImage.getBoundingClientRect();
	const left = Math.max(
		IMAGE_EDIT_DIALOG_GUTTER,
		Math.min(
			rect.left + IMAGE_EDIT_DIALOG_OFFSET,
			window.innerWidth - IMAGE_EDIT_DIALOG_WIDTH - IMAGE_EDIT_DIALOG_GUTTER,
		),
	);
	const top = Math.max(
		IMAGE_EDIT_DIALOG_GUTTER,
		rect.top + IMAGE_EDIT_DIALOG_OFFSET,
	);
	return {
		left: window.scrollX + left,
		top: window.scrollY + top,
	};
}

function ImageEditDialog() {
	const [imageDialogState, activeEditor] = useCellValues(
		imageDialogState$,
		activeEditor$,
	);
	const saveImage = usePublisher(saveImage$);
	const closeImageDialog = usePublisher(closeImageDialog$);
	const dialogRef = useRef<HTMLDivElement>(null);
	const [position, setPosition] = useState<{
		left: number;
		top: number;
	} | null>(null);

	useEffect(() => {
		if (imageDialogState.type === "inactive") {
			setPosition(null);
			return;
		}

		const frame = window.requestAnimationFrame(() => {
			setPosition(imageEditDialogPosition());
		});
		return () => window.cancelAnimationFrame(frame);
	}, [imageDialogState]);

	useEffect(() => {
		if (imageDialogState.type === "inactive") return;

		const handlePointerDown = (event: PointerEvent) => {
			const target = event.target;
			if (!(target instanceof Element)) return;
			if (dialogRef.current?.contains(target)) return;
			if (target.closest('[data-editor-block-type="image"]')) return;
			closeImageDialog();
		};
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") closeImageDialog();
		};

		document.addEventListener("pointerdown", handlePointerDown, true);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("pointerdown", handlePointerDown, true);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [closeImageDialog, imageDialogState.type]);

	if (imageDialogState.type === "inactive" || !position) return null;

	const initialValues =
		imageDialogState.type === "editing" ? imageDialogState.initialValues : {};
	const src = initialValues.src ?? "";
	const altText = initialValues.altText ?? "";
	const title = initialValues.title;

	return createPortal(
		<div
			ref={dialogRef}
			className="absolute z-[9999]"
			style={{ left: position.left, top: position.top }}
		>
			<ImageEdit
				src={src}
				altText={altText}
				onSave={(nextSrc, nextAltText) => {
					saveImage({ altText: nextAltText, src: nextSrc, title });
					closeImageDialog();
				}}
				onDelete={
					imageDialogState.type === "editing"
						? () => {
								activeEditor?.update(() => {
									const node = $getNodeByKey(imageDialogState.nodeKey);
									if ($isImageNode(node)) node.remove();
								});
								closeImageDialog();
							}
						: undefined
				}
			/>
		</div>,
		document.body,
	);
}

interface WriterImageToolbarProps {
	nodeKey: string;
	imageSource: string;
	initialImagePath: string | null;
	title: string;
	alt: string;
	width?: number | "inherit";
	height?: number | "inherit";
}

function WriterImageToolbar({
	nodeKey,
	imageSource,
	initialImagePath,
	title,
	alt,
	width,
	height,
}: WriterImageToolbarProps) {
	return (
		<span
			hidden
			data-writer-image-node-key={nodeKey}
			data-writer-image-src={initialImagePath ?? imageSource}
			data-writer-image-title={title}
			data-writer-image-alt={alt}
			data-writer-image-width={width}
			data-writer-image-height={height}
		/>
	);
}

function ImageClickEdit() {
	const [editor] = useLexicalComposerContext();
	const openEditImageDialog = usePublisher(openEditImageDialog$);

	useEffect(() => {
		const handleClick = (event: MouseEvent) => {
			const target = event.target;
			if (!(target instanceof Element)) return;

			const imageWrapper = target.closest('[data-editor-block-type="image"]');
			const metadata = imageWrapper?.querySelector<HTMLElement>(
				"[data-writer-image-node-key]",
			);
			const nodeKey = metadata?.dataset.writerImageNodeKey;
			if (!nodeKey || !metadata) return;

			openEditImageDialog({
				nodeKey,
				initialValues: {
					src: metadata.dataset.writerImageSrc ?? "",
					title: metadata.dataset.writerImageTitle ?? "",
					altText: metadata.dataset.writerImageAlt ?? "",
					width:
						metadata.dataset.writerImageWidth === "inherit"
							? undefined
							: Number(metadata.dataset.writerImageWidth) || undefined,
					height:
						metadata.dataset.writerImageHeight === "inherit"
							? undefined
							: Number(metadata.dataset.writerImageHeight) || undefined,
				},
			});
		};

		return editor.registerRootListener((rootElement, previousRootElement) => {
			previousRootElement?.removeEventListener("click", handleClick);
			rootElement?.addEventListener("click", handleClick);
		});
	}, [editor, openEditImageDialog]);

	return null;
}

const imageClickEditPlugin = realmPlugin({
	init(realm) {
		realm.pubIn({
			[addComposerChild$]: ImageClickEdit,
			[addNestedEditorChild$]: ImageClickEdit,
		});
	},
});

const strikethroughShortcutPlugin = realmPlugin({
	init(realm) {
		const Shortcut = () => {
			const [editor] = useLexicalComposerContext();

			useEffect(() => {
				return editor.registerCommand(
					KEY_DOWN_COMMAND,
					(event) => {
						if (
							event.key.toLowerCase() === "x" &&
							event.shiftKey &&
							(event.metaKey || event.ctrlKey)
						) {
							event.preventDefault();
							editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough");
							return true;
						}
						return false;
					},
					COMMAND_PRIORITY_LOW,
				);
			}, [editor]);

			return <MarkdownShortcutPlugin transformers={[STRIKETHROUGH]} />;
		};

		realm.pubIn({
			[addComposerChild$]: Shortcut,
			[addNestedEditorChild$]: Shortcut,
		});
	},
});

const codeViewerHighlightStyle = HighlightStyle.define([
	{
		tag: [tags.comment, tags.lineComment, tags.blockComment],
		color: "var(--color-neutral-500)",
		fontStyle: "italic",
	},
	{
		tag: [
			tags.keyword,
			tags.operatorKeyword,
			tags.modifier,
			tags.standard(tags.name),
			tags.definitionKeyword,
			tags.propertyName,
			tags.attributeName,
			tags.tagName,
			tags.bool,
			tags.atom,
		],
		color: "rgb(var(--color-primary))",
	},
	{
		tag: [
			tags.function(tags.variableName),
			tags.function(tags.propertyName),
			tags.definition(tags.function(tags.variableName)),
			tags.className,
			tags.typeName,
			tags.definition(tags.name),
		],
		color: "#2563eb",
	},
	{
		tag: [
			tags.string,
			tags.special(tags.string),
			tags.regexp,
			tags.character,
			tags.escape,
			tags.content,
		],
		color: "#15803d",
	},
	{
		tag: [tags.number, tags.integer, tags.float, tags.literal],
		color: "#b45309",
	},
	{
		tag: [
			tags.variableName,
			tags.operator,
			tags.derefOperator,
			tags.arithmeticOperator,
			tags.logicOperator,
			tags.compareOperator,
			tags.updateOperator,
			tags.definitionOperator,
			tags.punctuation,
			tags.separator,
			tags.brace,
			tags.squareBracket,
			tags.paren,
			tags.angleBracket,
			tags.meta,
			tags.processingInstruction,
		],
		color: "var(--color-neutral-700)",
	},
]);
const codeMirrorViewerSyntaxTheme = Prec.highest(
	syntaxHighlighting(codeViewerHighlightStyle),
);

const mapWords = (words: string) =>
	Object.fromEntries(words.split(" ").map((word) => [word, true]));

const solidityLanguageSupport = new LanguageSupport(
	StreamLanguage.define(
		clike({
			name: "solidity",
			keywords: mapWords(
				"abstract anonymous as assembly break case catch constant continue contract default delete do else emit enum error event external fallback for function hex if immutable import indexed interface internal is library mapping memory modifier new override payable pragma private public pure receive return returns revert storage struct super switch this throw try type unchecked using view virtual while",
			),
			types: mapWords(
				"address bool byte bytes bytes1 bytes2 bytes3 bytes4 bytes5 bytes6 bytes7 bytes8 bytes9 bytes10 bytes11 bytes12 bytes13 bytes14 bytes15 bytes16 bytes17 bytes18 bytes19 bytes20 bytes21 bytes22 bytes23 bytes24 bytes25 bytes26 bytes27 bytes28 bytes29 bytes30 bytes31 bytes32 fixed int int8 int16 int24 int32 int40 int48 int56 int64 int72 int80 int88 int96 int104 int112 int120 int128 int136 int144 int152 int160 int168 int176 int184 int192 int200 int208 int216 int224 int232 int240 int248 int256 string ufixed uint uint8 uint16 uint24 uint32 uint40 uint48 uint56 uint64 uint72 uint80 uint88 uint96 uint104 uint112 uint120 uint128 uint136 uint144 uint152 uint160 uint168 uint176 uint184 uint192 uint200 uint208 uint216 uint224 uint232 uint240 uint248 uint256",
			),
			builtin: mapWords(
				"abi addmod assert block blockhash call callcode delegatecall ecrecover gasleft keccak256 log0 log1 log2 log3 log4 msg mulmod now require selfdestruct sha256 staticcall suicide super tx type",
			),
			blockKeywords: mapWords(
				"catch contract do else finally for function if interface library struct switch try while",
			),
			atoms: mapWords(
				"false null true wei gwei ether seconds minutes hours days weeks",
			),
			number:
				/^(?:0x[a-f\d_]+|0b[01_]+|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:e[-+]?\d+)?)(?:wei|gwei|ether|seconds|minutes|hours|days|weeks)?/i,
		}),
	),
);

if (
	!languages.some(
		(language) =>
			language.name === "Solidity" || language.alias.includes("solidity"),
	)
) {
	languages.push(
		LanguageDescription.of({
			name: "Solidity",
			alias: ["solidity", "sol"],
			extensions: ["sol"],
			support: solidityLanguageSupport,
		}),
	);
}

const exampleTheme = {
	paragraph: "mdx--paragraph",
	quote: "mdx--quote",
	heading: {
		h1: "mdx--heading-h1",
		h2: "mdx--heading-h2",
		h3: "mdx--heading-h3",
		h4: "mdx--heading-h4",
		h5: "mdx--heading-h5",
		h6: "mdx--heading-h6",
	},
	list: {
		nested: {
			listitem: "mdx--nested-listitem",
		},
		ol: "mdx--list-ol",
		ul: "mdx--list-ul",
		listitem: "mdx--listItem",
		listitemChecked: "mdx--listItemChecked",
		listitemUnchecked: "mdx--listItemUnchecked",
	},
	hashtag: "mdx--hashtag",
	image: "mdx--image",
	link: "mdx--link",
	text: {
		bold: "mdx--textBold",
		code: "mdx--textCode",
		italic: "mdx--textItalic",
		strikethrough: "mdx--textStrikethrough",
		subscript: "mdx--textSubscript",
		superscript: "mdx--textSuperscript",
		underline: "mdx--textUnderline",
		underlineStrikethrough: "mdx--textUnderlineStrikethrough",
	},
	code: "mdx--code",
	codeHighlight: {
		atrule: "mdx--tokenAttr",
		attr: "mdx--tokenAttr",
		boolean: "mdx--tokenProperty",
		builtin: "mdx--tokenSelector",
		cdata: "mdx--tokenComment",
		char: "mdx--tokenSelector",
		class: "mdx--tokenFunction",
		"class-name": "mdx--tokenFunction",
		comment: "mdx--tokenComment",
		constant: "mdx--tokenProperty",
		deleted: "mdx--tokenProperty",
		doctype: "mdx--tokenComment",
		entity: "mdx--tokenOperator",
		function: "mdx--tokenFunction",
		important: "mdx--tokenVariable",
		inserted: "mdx--tokenSelector",
		keyword: "mdx--tokenAttr",
		namespace: "mdx--tokenVariable",
		number: "mdx--tokenProperty",
		operator: "mdx--tokenOperator",
		prolog: "mdx--tokenComment",
		property: "mdx--tokenProperty",
		punctuation: "mdx--tokenPunctuation",
		regex: "mdx--tokenVariable",
		selector: "mdx--tokenSelector",
		string: "mdx--tokenSelector",
		symbol: "mdx--tokenProperty",
		tag: "mdx--tokenProperty",
		url: "mdx--tokenOperator",
		variable: "mdx--tokenVariable",
	},
};

/**
 * Extend this Component further with the necessary plugins or props you need.
 * proxying the ref is necessary. Next.js dynamically imported components don't support refs.
 */
const MDX: FC<EditorProps> = ({
	markdown,
	ref,
	onChange,
	className,
	readOnly,
	placeholder,
	renderPlaceholderAsMarkdown = false,
	autoFocus = false,
	aspectSquare = true,
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const [overlayContainer, setOverlayContainer] =
		useState<HTMLDivElement | null>(null);
	const showMarkdownPlaceholder =
		renderPlaceholderAsMarkdown && !!placeholder && markdown.trim() === "";

	useEffect(() => {
		setOverlayContainer(containerRef.current);
	}, []);

	const handleChange = useCallback(
		(nextMarkdown: string) => {
			onChange?.(nextMarkdown);
		},
		[onChange],
	);
	return (
		<div
			className="mdx grow flex flex-col"
			ref={containerRef}
			style={{ position: "relative" }}
		>
			<MDXEditor
				plugins={[
					headingsPlugin(),
					imagePlugin({
						disableImageResize: true,
						ImageDialog: ImageEditDialog,
						EditImageToolbar: WriterImageToolbar as FC,
					}),
					imageMarkdownShortcutPlugin(),
					imageClickEditPlugin(),
					listsPlugin(),
					quotePlugin(),
					pasteLinkPlugin(),
					linkPlugin(),
					codeBlockPlugin({ defaultCodeBlockLanguage: "ts" }),
					codeMirrorPlugin({
						codeBlockLanguages: {
							js: "JavaScript",
							ts: "TypeScript",
							jsx: "JavaScript (React)",
							tsx: "TypeScript (React)",
							css: "CSS",
							html: "HTML",
							json: "JSON",
							md: "Markdown",
							sql: "SQL",
							solidity: "Solidity",
							python: "Python",
							go: "Go",
							rust: "Rust",
							shell: "Shell",
							bash: "Bash",
							yaml: "YAML",
							xml: "XML",
						},
						codeMirrorExtensions: [codeMirrorViewerSyntaxTheme],
						autoLoadLanguageSupport: true,
					}),
					markdownShortcutPlugin(),
					strikethroughShortcutPlugin(),
					customLinkDialogPlugin(),
				]}
				onChange={handleChange}
				ref={ref}
				markdown={markdown}
				overlayContainer={overlayContainer}
				readOnly={readOnly}
				placeholder={renderPlaceholderAsMarkdown ? undefined : placeholder}
				autoFocus={autoFocus}
				onError={(error) => {
					console.error(error);
				}}
				trim={false}
				spellCheck={true}
				lexicalTheme={exampleTheme}
				contentEditableClassName="prose"
				className={cn(
					"p-2 min-w-24 relative",
					aspectSquare && "aspect-square",
					className,
				)}
			/>
			{showMarkdownPlaceholder && (
				<div className="mdx-markdown-placeholder prose" aria-hidden="true">
					<ReactMarkdown remarkPlugins={[remarkGfm]}>
						{placeholder}
					</ReactMarkdown>
				</div>
			)}
		</div>
	);
};

export default MDX;
