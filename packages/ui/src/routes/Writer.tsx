import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { type Hex, getAddress } from "viem";
import Block from "../components/Block";
import BlockCreateForm from "../components/BlockCreateForm";
import { POLLING_INTERVAL, TARGET_CHAIN_ID } from "../constants";
import { WriterContext } from "../layouts/App.layout";
import { createWithChunk, getWriter } from "../utils/api";
import { useFirstWallet } from "../utils/hooks";

export function Writer() {
	const navigate = useNavigate();
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
	useEffect(() => {
		if (data) {
			setWriter(data);
		}
	}, [data, setWriter]);
	const { mutateAsync, isPending } = useMutation({
		mutationFn: createWithChunk,
		mutationKey: ["create-with-chunk", address],
	});

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

		const provider = await wallet.getEthereumProvider();
		const method = "eth_signTypedData_v4";
		// To avoid signature collision, a random nonce is used
		const nonce = Math.floor(Math.random() * 1000000000000);
		const chunkCount = 1;
		const chunkContent = content;
		const payload = {
			domain: {
				name: "Writer",
				version: "1",
				chainId: TARGET_CHAIN_ID,
				verifyingContract: getAddress(address),
			},
			message: {
				nonce,
				chunkCount,
				chunkContent,
			},
			primaryType: "CreateWithChunk",
			types: {
				EIP712Domain: [
					{ name: "name", type: "string" },
					{ name: "version", type: "string" },
					{ name: "chainId", type: "uint256" },
					{ name: "verifyingContract", type: "address" },
				],
				CreateWithChunk: [
					{ name: "nonce", type: "uint256" },
					{ name: "chunkCount", type: "uint256" },
					{ name: "chunkContent", type: "string" },
				],
			},
		};

		const signature = await provider.request({
			method,
			params: [wallet.address, JSON.stringify(payload)],
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
			<BlockCreateForm
				expandTo={`/writer/${data?.address}/create`}
				isLoading={isPending}
				hoverLabel={`Write in ${data?.title}`}
				activeLabel={`Write in ${data?.title}`}
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
						href={`/writer/${data.address}/entry/${entry.onChainId}`}
						isLoading={!entry.onChainId}
						title={title}
						id={id}
					/>
				);
			})}
		</div>
	);
}
