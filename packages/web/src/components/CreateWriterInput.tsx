"use client";

import dynamic from "next/dynamic";

const MDX = dynamic(() => import("./markdown/MDX"), { ssr: false });

export default function CreateWriterInput() {
	return (
		<div className="group">
			<div className="group-hover:hidden border border-neutral-900 h-full flex justify-center items-center text-primary text-2xl">
				<span>+</span>
			</div>
			<MDX
				markdown={""}
				autoFocus
				className="hidden group-hover:flex border-dashed border-primary bg-neutral-900 flex-col placeholder:text-green-300"
				placeholder="Create a Place"
			/>
		</div>
	);
}
