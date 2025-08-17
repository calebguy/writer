"use client";

import { type Writer, deleteWriter, factoryCreate } from "@/utils/api";
import { useMutation } from "@tanstack/react-query";
import dynamic from "next/dynamic";

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
		<div className="grow flex flex-col">
			<MDX
				onChange={(mkdwn) => {
					console.log(mkdwn);
				}}
				markdown={`
Create a [Place](https://mdxeditor.dev/editor/api/functions/useRemoteMDXEditorRealm "Place")

list item

* hello
* there
* how
* are
* you

1. this is a one
2. this is a two


> block quote right here alrighty

\`\`\`js

const x = 1;

function hello() {
	console.log("hello");
}

\`\`\`

`}
			/>
		</div>
	);

	// return (
	// 	<div
	// 		className="grid gap-2"
	// 		style={{
	// 			gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
	// 		}}
	// 	>
	// 		{authedUserAddress && (
	// 			<BlockForm
	// 				placeholder="Create a Place"
	// 				isLoading={isPending}
	// 				onSubmit={async ({ value }) => {
	// 					await mutateAsync({
	// 						title: value,
	// 						admin: authedUserAddress,
	// 						managers: [authedUserAddress],
	// 					});
	// 				}}
	// 			/>
	// 		)}
	// 		{authedUserAddress && <CreateWriterInput />}
	// 		{writers?.map((writer) => (
	// 			<Block
	// 				key={writer.address}
	// 				href={`/writer/${writer.address}`}
	// 				title={writer.title}
	// 				isLoading={!writer.createdAtHash}
	// 				bottom={
	// 					<div className="text-right text-sm text-neutral-600 leading-3 pt-2">
	// 						<div className="group inline-block">
	// 							<span className="group-hover:hidden block">
	// 								{writer.entries.length.toString()}
	// 							</span>
	// 							<button
	// 								type="button"
	// 								className="group-hover:block hidden ml-auto absolute bottom-1.5 right-2 z-10 hover:text-primary"
	// 								onClick={async (e) => {
	// 									e.preventDefault();
	// 									e.stopPropagation();
	// 									await hideWriter(writer.address);
	// 									// refetch();
	// 								}}
	// 							>
	// 								<ClosedEye className="w-4 h-4" />
	// 							</button>
	// 							<div className="absolute left-0 top-0 w-full h-full bg-neutral-900/90 hidden group-hover:flex items-center justify-center">
	// 								<span className="text-primary italic">Hide?</span>
	// 							</div>
	// 						</div>
	// 					</div>
	// 				}
	// 			/>
	// 		))}
	// 	</div>
	// );
}
