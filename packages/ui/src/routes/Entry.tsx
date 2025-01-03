import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import type { Hex } from "viem";
import { Editor } from "../components/Editor";
import { getWriter } from "../utils/api";

export default function Entry() {
	const { address, id } = useParams();
	const { data } = useQuery({
		queryFn: () => getWriter(address as Hex),
		queryKey: ["get-writer", address],
		enabled: !!address,
	});
	const entry = data?.entries.find((e) => e.onChainId === id);
	return (
		<div className="flex-grow flex flex-col">
			<Editor initialContent={entry?.content} disabled />
		</div>
	);
}
