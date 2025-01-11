import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { Hex } from "viem";
import Block from "../components/Block";
import BlockForm from "../components/BlockForm";
import { POLLING_INTERVAL } from "../constants";
import { WriterContext } from "../layouts/App.layout";
import { createWithChunk, getWriter } from "../utils/api";
import { useFirstWallet } from "../utils/hooks";
import { signCreateWithChunk } from "../utils/signer";

export function Writer() {
	const { address } = useParams();
	const { setWriter } = useContext(WriterContext);
	const wallet = useFirstWallet();
	const [isPolling, setIsPolling] = useState(false);
	const { data, refetch } = useQuery({
		queryFn: () => getWriter(address as Hex),
		queryKey: ["get-writer", address],
		enabled: !!address,
		refetchInterval: isPolling ? POLLING_INTERVAL : false,
	});
	const { mutateAsync, isPending } = useMutation({
		mutationFn: createWithChunk,
		mutationKey: ["create-with-chunk", address],
	});

	useEffect(() => {
		if (data) {
			setWriter(data);
		}
	}, [data, setWriter]);

	useEffect(() => {
		const isAllOnChain = data?.entries.every((e) => e.onChainId);
		if (isAllOnChain) {
			setIsPolling(false);
		} else if (!isPolling) {
			setIsPolling(true);
		}
	}, [data, isPolling]);

	const handleSubmit = async (content: string) => {
		if (!address) {
			console.debug("Could not get contract address when submitting form");
			return;
		}

		if (!wallet) {
			console.error("No wallet found");
			return;
		}

		const { signature, nonce, chunkCount, chunkContent } =
			await signCreateWithChunk(wallet, {
				content,
				address,
			});

		return mutateAsync({ address, signature, nonce, chunkCount, chunkContent });
	};

	return (
		<div
			className="grid gap-2 gap-y-4"
			style={{
				gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
			}}
		>
			<BlockForm
				expand
				isLoading={isPending}
				placeholder={data?.title}
				onSubmit={({ value }) => handleSubmit(value).then(() => refetch())}
			/>
			{data?.entries.map((entry) => {
				let id: undefined | string = undefined;
				if (!entry.createdAtHash) {
					id = "loading...";
				} else if (entry.createdAtBlockDatetime) {
					id = format(new Date(entry.createdAtBlockDatetime), "MM-dd-yyyy");
				} else {
					id = format(new Date(entry.createdAt), "MM/dd/yyyy");
				}

				// We want the preview to overflow if it is long enough but we don't want to render the entire content
				const title = entry.content
					? `${entry.content.slice(0, 2_000)}`
					: "n/a";
				return (
					<Block
						key={entry.id}
						href={`/writer/${data.address}/${entry.onChainId}`}
						isLoading={!entry.onChainId}
						title={title}
						id={id}
					/>
				);
			})}
		</div>
	);
}
