import { useWallets } from "@privy-io/react-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useContext, useEffect, useMemo, useState } from "react";
import type { Hex } from "viem";
import Block from "../components/Block";
import BlockCreateForm from "../components/BlockCreateForm";
import { WriterContext } from "../layouts/App.layout";
import { createFromFactory, getAuthor } from "../utils/api";

const POLLING_INTERVAL = 1_000;

function Home() {
	const { wallets, ready } = useWallets();
	const wallet = wallets[0];
	const address = wallet?.address;
	const [isPolling, setIsPolling] = useState(false);

	const { setWriter } = useContext(WriterContext);

	const { data, refetch } = useQuery({
		queryFn: () => getAuthor(wallet?.address as Hex),
		queryKey: ["get-writers", wallet?.address],
		enabled: !!wallet?.address,
		refetchInterval: isPolling ? POLLING_INTERVAL : false,
	});

	const { mutateAsync, isPending } = useMutation({
		mutationFn: createFromFactory,
		mutationKey: ["create-from-factory"],
		onSuccess: () => {
			refetch();
			setIsPolling(true);
		},
	});

	const hasWriters = useMemo(
		() => (data ? data.writers.length > 0 : false),
		[data],
	);

	useEffect(() => {
		const isAllOnChain = data?.writers.every((writer) => writer.onChainId);
		if (isAllOnChain) {
			setIsPolling(false);
		} else if (!isPolling) {
			setIsPolling(true);
		}
	}, [data, isPolling]);

	return (
		<>
			{address && (
				<div
					className="grid gap-2 gap-y-4"
					style={{
						gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
					}}
				>
					<BlockCreateForm
						isLoading={isPending}
						hoverLabel="Create a Writer"
						activeLabel="Create a Writer"
						onSubmit={(data) =>
							mutateAsync({
								title: data.value,
								admin: address,
								managers: [address],
							})
						}
					/>

					{wallet &&
						hasWriters &&
						data?.writers?.map((writer) => (
							<Block
								onClick={() => {
									setWriter(writer);
								}}
								key={writer.id}
								href={`/writer/${writer.address}`}
								title={writer.title}
								isLoading={!writer.onChainId}
								id={
									writer.onChainId ? writer.onChainId.toString() : "loading..."
								}
							/>
						))}
				</div>
			)}
			{!address && ready && (
				<div className="text-xl text-lime mt-8 grow flex justify-center items-center">
					<div>CLICK THE BLOB</div>
				</div>
			)}
		</>
	);
}

export default Home;
