import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import type { Hex } from "viem";
import { Button } from "../components/Button";
import { Editor } from "../components/Editor";
import { getWriter } from "../utils/api";

export function Writer() {
	const { address } = useParams();
	const { data } = useQuery({
		queryFn: () => getWriter(address as Hex),
		queryKey: ["get-writer", address],
		enabled: !!address,
	});
	console.log("data", data);
	return (
		<div className="flex-grow text-left mt-10 px-3 py-2">
			<div className="text-xl mb-2 text-white">{data?.title}</div>
			<Editor />
			<Button className="mt-2">Save</Button>
		</div>
	);
}
