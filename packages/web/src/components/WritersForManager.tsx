"use client";

import { type Writer, deleteWriter, factoryCreate } from "@/utils/api";
import { useMutation } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import { MarkdownRenderer } from "./MarkdownRenderer";
const MDX = dynamic(() => import("./markdown/MDX"), { ssr: false });

export function WritersForManager({
	writers,
	authedUserAddress,
}: { writers: Array<Writer>; authedUserAddress?: string }) {
	const { mutateAsync, isPending } = useMutation({
		mutationFn: factoryCreate,
		mutationKey: ["create-from-factory"],
		onSuccess: () => {
			// refetch();
			// setIsPolling(true);
		},
	});

	const { mutateAsync: hideWriter } = useMutation({
		mutationFn: deleteWriter,
		mutationKey: ["delete-writer"],
	});

	return (
		<div
			className="grid gap-2"
			style={{
				gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
			}}
		>
			{/* {authedUserAddress && (
				<BlockForm
					placeholder="Create a Place"
					isLoading={isPending}
					onSubmit={async ({ value }) => {
						await mutateAsync({
							title: value,
							admin: authedUserAddress,
							managers: [authedUserAddress],
						});
					}}
				/>
			)}
			{authedUserAddress && <CreateWriterInput />} */}
			{writers?.map((writer) => (
				<Link href={`/writer/${writer.address}`} key={writer.address}>
					<MarkdownRenderer
						markdown={writer.title}
						className="bg-neutral-900 text-white"
					/>
				</Link>
			))}
			{writers?.map((writer) => (
				<Link href={`/writer/${writer.address}`} key={writer.address}>
					<MDX markdown={writer.title} className="bg-neutral-900 text-white" />
				</Link>
			))}
		</div>
	);
}
