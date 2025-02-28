import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useContext, useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { useParams } from "react-router-dom";
import type { Hex } from "viem";
import Block from "../components/Block";
import BlockForm from "../components/BlockForm";
import { Lock } from "../components/icons/Lock";
import { POLLING_INTERVAL } from "../constants";
import { WriterContext } from "../context";
import type { BlockCreateInput } from "../interfaces";
import { type Entry, createWithChunk, getWriter } from "../utils/api";
import { useFirstWallet } from "../utils/hooks";
import { getDerivedSigningKey, signCreateWithChunk } from "../utils/signer";
import { compress, encrypt, processEntry } from "../utils/utils";

export function Writer() {
	const { address } = useParams();
	const { setWriter } = useContext(WriterContext);
	const wallet = useFirstWallet();
	const [isPolling, setIsPolling] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
	const [encrypted, setEncrypted] = useState(false);
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
		const processEntries = async () => {
			if (data) {
				const processedEntries = [];

				if (wallet) {
					const key = await getDerivedSigningKey(wallet);
					for (const entry of data.entries) {
						if (entry.author === wallet.address) {
							const processed = await processEntry(key, entry);
							processedEntries.push(processed);
						} else {
							if (entry.raw?.startsWith("enc:")) {
								// do nothing
							} else {
								processedEntries.push(entry);
							}
						}
					}
				} else {
					const publicEntries = data.entries.filter(
						(e) => !e.raw?.startsWith("enc:"),
					);
					console.log(publicEntries);
					for (const entry of publicEntries) {
						processedEntries.push(entry);
					}
				}

				// for (const entry of data.entries) {
				// 	const processed = await processEntry(key, entry);
				// 	processedEntries.push(processed);
				// }
				setProcessedData(processedEntries);
			}
		};
		processEntries();
	}, [data, wallet]);

	useEffect(() => {
		const isAllOnChain = data?.entries.every((e) => e.onChainId);
		if (isAllOnChain) {
			setIsPolling(false);
		} else if (!isPolling) {
			setIsPolling(true);
		}
	}, [data, isPolling]);

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
		<>
			<Helmet>
				<title>Writer | {address}</title>
				<meta property="og:title" content={`Writer | ${address}`} />
			</Helmet>
			<div
				className="grid gap-2"
				style={{
					gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
				}}
			>
				{wallet && data?.managers.includes(wallet.address) && (
					<BlockForm
						canExpand
						isLoading={isPending}
						placeholder={`Write in \n\n${data?.title}`}
						onSubmit={handleSubmit}
						onExpand={setIsExpanded}
						encrypted={encrypted}
						setEncrypted={setEncrypted}
					/>
				)}
				{!isExpanded &&
					processedData.map((entry) => {
						let id: undefined | string = undefined;
						if (entry.createdAtBlockDatetime) {
							id = format(new Date(entry.createdAtBlockDatetime), "MM-dd-yyyy");
						} else {
							id = format(new Date(entry.createdAt), "MM/dd/yyyy");
						}

						return (
							<Block
								key={entry.id}
								href={`/writer/${data?.address}/${entry.onChainId}`}
								isLoading={!entry.onChainId}
								title={entry.decompressed ? entry.decompressed : entry.raw}
								id={id}
								leftIcon={
									entry.version?.startsWith("enc") ? (
										<Lock className="h-3.5 w-3.5 text-neutral-600" />
									) : null
								}
							/>
						);
					})}
			</div>
		</>
	);
}
