import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { Hex } from "viem";
import Block from "../components/Block";
import BlockForm from "../components/BlockForm";
import { POLLING_INTERVAL } from "../constants";
import { WriterContext } from "../context";
import type { BlockCreateInput } from "../interfaces";
import { createWithChunk, getWriter } from "../utils/api";
import { useFirstWallet } from "../utils/hooks";
import { getDerivedSigningKey, signCreateWithChunk } from "../utils/signer";
import { compress, decompress, decrypt, encrypt } from "../utils/utils";

export function Writer() {
	const { address } = useParams();
	const { setWriter } = useContext(WriterContext);
	const wallet = useFirstWallet();
	const [isPolling, setIsPolling] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
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

	const [processedData, setProcessedData] = useState<Entry[]>([]);

	useEffect(() => {
		if (data) {
			setWriter(data);
		}
	}, [data, setWriter]);

	useEffect(() => {
		const checkDecompression = async () => {
			if (data) {
				const key = await getDerivedSigningKey(wallet);
				const processedEntries = [];
				for (const entry of data.entries) {
					if (entry.content?.startsWith("enc:br:")) {
						const content = entry.content.slice(7);
						const decrypted = await decrypt(key, content);
						const decompressed = await decompress(decrypted);
						processedEntries.push({
							...entry,
							content: decompressed,
						});
					} else {
						processedEntries.push(entry);
					}
				}
				setProcessedData(processedEntries);
			}
		};
		checkDecompression();
	}, [data, wallet]);

	useEffect(() => {
		const isAllOnChain = data?.entries.every((e) => e.onChainId);
		if (isAllOnChain) {
			setIsPolling(false);
		} else if (!isPolling) {
			setIsPolling(true);
		}
	}, [data, isPolling]);

	const encrypted = true;

	const handleSubmit = async ({ value }: BlockCreateInput) => {
		const content = value;
		if (!address) {
			console.debug("Could not get contract address when submitting form");
			return;
		}

		if (!wallet) {
			console.error("No wallet found");
			return;
		}

		const compressedContent = await compress(content);
		let versionedCompressedContent = `br:${compressedContent}`;
		if (encrypted) {
			const key = await getDerivedSigningKey(wallet);
			const encrypted = await encrypt(key, compressedContent);
			const decrypted = await decrypt(key, encrypted);
			const decompressed = await decompress(decrypted);
			console.log("decompressed", decompressed);

			versionedCompressedContent = `enc:br:${encrypted}`;
		}

		const { signature, nonce, chunkCount, chunkContent } =
			await signCreateWithChunk(wallet, {
				content: versionedCompressedContent,
				address,
			});

		await mutateAsync({ address, signature, nonce, chunkCount, chunkContent });
		refetch();
	};

	return (
		<div className="relative grow">
			<div
				className="grid gap-2"
				style={{
					gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
				}}
			>
				<BlockForm
					canExpand
					isLoading={isPending}
					placeholder={`Write in \n\n${data?.title}`}
					onSubmit={handleSubmit}
					onExpand={setIsExpanded}
				/>
				{!isExpanded &&
					processedData.map((entry) => {
						let id: undefined | string = undefined;
						if (entry.createdAtBlockDatetime) {
							id = format(new Date(entry.createdAtBlockDatetime), "MM-dd-yyyy");
						} else {
							id = format(new Date(entry.createdAt), "MM/dd/yyyy");
						}

						// if (entry.content?.startsWith("enc:br")) {
						// 	const key = await getDerivedSigningKey(wallet);
						// 	const decrypted = await decrypt(key, entry.content);
						// 	const decompressed = await decompress(decrypted);
						// 	entry.content = decompressed;
						// }
						// We want the preview to overflow if it is long enough but we don't want to render the entire content

						return (
							<Block
								key={entry.id}
								href={`/writer/${data?.address}/${entry.onChainId}`}
								isLoading={!entry.onChainId}
								title={entry.content}
								id={id}
							/>
						);
					})}
			</div>
		</div>
	);
}
