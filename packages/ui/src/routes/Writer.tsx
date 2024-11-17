import { useQuery } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { useParams } from "react-router";
import { TARGET_CHAIN_ID } from "server/src/constants";
import { type Hex, stringify } from "viem";
import { Button } from "../components/Button";
import { Editor } from "../components/Editor";
import { getWriter } from "../utils/api";
import { useFirstWallet } from "../utils/hooks";

export function Writer() {
	const { address } = useParams();
	const { data } = useQuery({
		queryFn: () => getWriter(address as Hex),
		queryKey: ["get-writer", address],
		enabled: !!address,
	});
	const wallet = useFirstWallet();
	const [content, setContent] = useState<string>("");

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		console.log("data", data);
		if (!wallet) {
			console.error("No wallet found");
			return;
		}

		const provider = await wallet.getEthereumProvider();
		const method = "eth_signTypedData_v4";
		const nonce = 0;
		const chunkCount = 1;
		const chunkContent = content;
		const payload = {
			domain: {
				name: "Writer",
				version: "1",
				chainId: TARGET_CHAIN_ID,
				verifyingContract: address,
			},
			message: {
				nonce,
				chunkCount,
				chunkContent,
			},
			primaryType: "Main",
			types: {
				EIP712Domain: [
					{ name: "name", type: "string" },
					{ name: "version", type: "string" },
					{ name: "chainId", type: "uint256" },
					{ name: "verifyingContract", type: "address" },
				],
				Main: [
					{ name: "nonce", type: "uint256" },
					{ name: "chunkCount", type: "uint256" },
					{ name: "chunkContent", type: "string" },
				],
			},
		};

		const signature = await provider.request({
			method,
			params: [wallet.address, payload],
		});
		console.log({ signature, nonce, chunkCount, chunkContent });
	};

	return (
		<div className="flex-grow text-left mt-10 py-2 flex flex-col">
			<div>Address: {wallet.address}</div>
			<div className="text-xl mb-2 text-white">{data?.title}</div>
			<form onSubmit={handleSubmit} className="grow flex flex-col">
				<Editor onChange={setContent} />
				<Button className="mt-2 bg-neutral-900" type="submit">
					Save
				</Button>
				{stringify(content)}
			</form>
		</div>
	);
}
