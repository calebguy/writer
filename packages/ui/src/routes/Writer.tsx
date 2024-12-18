import { useMutation, useQuery } from "@tanstack/react-query";
import { useContext, useEffect } from "react";
import { useParams } from "react-router";
import { TARGET_CHAIN_ID } from "server/src/constants";
import { type Hex, getAddress } from "viem";
import Block from "../components/Block";
import BlockCreateForm from "../components/BlockCreateForm";
import { WriterContext } from "../layouts/App.layout";
import { createWithChunk, getWriter } from "../utils/api";
import { useFirstWallet } from "../utils/hooks";

export function Writer() {
	const { address } = useParams();
	const { setWriter } = useContext(WriterContext);
	const { data, refetch } = useQuery({
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

	const wallet = useFirstWallet();

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

	// return (
	// 	<div className="flex-grow text-left mt-10 py-2 flex flex-col">
	// 		<div className="text-xl mb-2 text-white">{data?.title}</div>
	// 		<form onSubmit={handleSubmit} className="grow flex flex-col">
	// 			<Editor
	// 				onChange={(editor) =>
	// 					setContent(editor.storage.markdown.getMarkdown())
	// 				}
	// 			/>
	// 			<Button
	// 				disabled={isPending || isLoading}
	// 				className="mt-2 bg-neutral-900"
	// 				type="submit"
	// 			>
	// 				{isPending || isLoading ? "Saving..." : "Save"}
	// 			</Button>
	// 		</form>
	// 	</div>
	// );

	return (
		<div
			className="grid gap-2 gap-y-4"
			style={{
				gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
			}}
		>
			<BlockCreateForm
				isLoading={isPending}
				hoverLabel={`Write in ${data?.title}`}
				activeLabel={`Write in ${data?.title}`}
				onSubmit={({ value }) => {
					return handleSubmit(value).then(() => refetch());
				}}
			/>
			{data?.entries.map((entry) => (
				<Block
					key={entry.id}
					href={`/writer/${data.address}/${entry.onChainId}`}
					// We want the preview to overflow if it is long enough but we don't want to render the entire content
					title={entry.content ? `${entry.content.slice(0, 2_000)}` : "n/a"}
					id={entry.onChainId?.toString() ?? "loading..."}
				/>
			))}
		</div>
	);
}
