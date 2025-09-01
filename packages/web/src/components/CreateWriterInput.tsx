"use client";

import { cn } from "@/utils/cn";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const MDX = dynamic(() => import("./markdown/MDX"), { ssr: false });

export default function CreateWriterInput() {
	const [hasFocus, setHasFocus] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	// Handle clicks inside or outside the container
	useEffect(() => {
		const handleClick = (event: MouseEvent) => {
			if (containerRef.current) {
				if (!containerRef.current.contains(event.target as Node)) {
					setHasFocus(false);
				} else {
					setHasFocus(true);
				}
			}
		};

		document.addEventListener("mousedown", handleClick);
		return () => {
			document.removeEventListener("mousedown", handleClick);
		};
	}, []);

	// Handle escape key
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setHasFocus(false);
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, []);
	return (
		<div className="group" ref={containerRef}>
			<div
				className={cn(
					"group-hover:hidden border border-neutral-900 h-full flex justify-center items-center text-primary text-2xl",
					{
						"group-hover:hidden": !hasFocus,
						hidden: hasFocus,
					},
				)}
			>
				<span>+</span>
			</div>
			<MDX
				markdown={""}
				autoFocus
				className={cn(
					"group-hover:flex border-dashed bg-neutral-900 flex-col placeholder:text-green-300",
					{
						hidden: !hasFocus,
						"flex border-primary": hasFocus,
					},
				)}
				placeholder="Create a Place"
			/>
		</div>
	);
}
