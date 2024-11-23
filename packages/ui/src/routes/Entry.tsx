import { useQuery } from "@tanstack/react-query";
import { useContext, useEffect } from "react";
import { useParams } from "react-router";
import type { Hex } from "viem";
import { WriterContext } from "../layouts/App.layout";
import { getWriter } from "../utils/api";

export default function Entry() {
	const { address, id } = useParams();
	const { setWriter } = useContext(WriterContext);

	const { data } = useQuery({
		queryFn: () => getWriter(address as Hex),
		queryKey: ["get-writer", address],
		enabled: !!address,
	});
	useEffect(() => {
		if (data) {
			setWriter(data);
		}
	}, [data, setWriter]);

	console.log(address, id);
	return (
		<div>
			<div>
				{address}, {id}
			</div>
		</div>
	);
}
