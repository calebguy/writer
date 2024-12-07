import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router";
import type { Hex } from "viem";
import { Button } from "../components/Button";
import { Editor } from "../components/Editor";
import { getWriter } from "../utils/api";

export default function Entry() {
	const { address, id } = useParams();
	const [edit, setEdit] = useState(false);
	const { data } = useQuery({
		queryFn: () => getWriter(address as Hex),
		queryKey: ["get-writer", address],
		enabled: !!address,
	});
	const entry = data?.entries.find((e) => e.onChainId === id);
	return (
		<div className="flex-grow flex flex-col">
			{edit ? (
				<>
					<Editor content={entry?.content} />
					<div>
						<Button onClick={() => setEdit(false)}>Cancel</Button>
					</div>
				</>
			) : (
				<>
					<div className="text-xl">{entry?.content}</div>
					<div>
						<Button onClick={() => setEdit(true)} className="max-w-10">
							Edit
						</Button>
					</div>
				</>
			)}
		</div>
	);
}
