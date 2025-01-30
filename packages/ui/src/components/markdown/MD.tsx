import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import { cn } from "../../utils/cn";
import solidity from "./language/solidity";

import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import css from "highlight.js/lib/languages/css";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import excel from "highlight.js/lib/languages/excel";
import go from "highlight.js/lib/languages/go";
import graphql from "highlight.js/lib/languages/graphql";
import http from "highlight.js/lib/languages/http";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import less from "highlight.js/lib/languages/less";
import makefile from "highlight.js/lib/languages/makefile";
import markdown from "highlight.js/lib/languages/markdown";
import powershell from "highlight.js/lib/languages/powershell";
import python from "highlight.js/lib/languages/python";
import ruby from "highlight.js/lib/languages/ruby";
import rust from "highlight.js/lib/languages/rust";
import scss from "highlight.js/lib/languages/scss";
import sql from "highlight.js/lib/languages/sql";
import stylus from "highlight.js/lib/languages/stylus";
import typescript from "highlight.js/lib/languages/typescript";
import yaml from "highlight.js/lib/languages/yaml";

interface MDProps {
	children?: string | null;
	className?: string;
}

const test = () =>
	rehypeHighlight({
		theme: "github-dark",
		detect: true,
		languages: {
			// @ts-ignore
			solidity: solidity,
			javascript: javascript,
			typescript: typescript,
			python: python,
			json: json,
			rust: rust,
			go: go,
			java: java,
			csharp: csharp,
			cpp: cpp,
			c: c,
			yaml: yaml,
			markdown: markdown,
			css: css,
			bash: bash,
			sql: sql,
			scss: scss,
			less: less,
			stylus: stylus,
			dockerfile: dockerfile,
			ruby: ruby,
			powershell: powershell,
			makefile: makefile,
			http: http,
			graphql: graphql,
			excel: excel,
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
