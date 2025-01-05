import { useQuery } from "@tanstack/react-query";

import { getWriter } from "../utils/api";

import { useMutation } from "@tanstack/react-query";
import { useContext, useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import type { Hex } from "viem";
import { Editor } from "../components/Editor";
import { WriterContext } from "../layouts/App.layout";
import { createWithChunk } from "../utils/api";

export function Create() {
	const location = useLocation();
	console.log(location);
	const { address } = useParams();
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
	const { mutateAsync, isPending } = useMutation({
		mutationFn: createWithChunk,
		mutationKey: ["create-with-chunk", address],
	});

	return (
		<div className="flex-grow flex flex-col">
			<Editor
				initialContent={location.state?.value}
				className="hover:bg-neutral-900 focus:outline-none"
			/>
		</div>
	);
}
