import { useWallets } from "@privy-io/react-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useContext, useEffect, useMemo, useState } from "react";
import type { Hex } from "viem";
import Block from "../components/Block";
import BlockForm from "../components/BlockForm";
import { POLLING_INTERVAL } from "../constants";
import { WriterContext } from "../layouts/App.layout";
import { createFromFactory, getWritersByManager } from "../utils/api";

function Home() {
	const { wallets } = useWallets();
	const wallet = wallets[0];
	const address = wallet?.address;
	const [isPolling, setIsPolling] = useState(false);
	const { setWriter } = useContext(WriterContext);

	const { data, refetch } = useQuery({
		queryFn: () => getWritersByManager(wallet?.address as Hex),
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

	const hasWriters = useMemo(() => (data ? data.length > 0 : false), [data]);

	useEffect(() => {
		const isAllOnChain = data?.every((writer) => writer.createdAtHash);
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
					<BlockForm
						placeholder="Create a Writer"
						isLoading={isPending}
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
						data?.map((writer) => {
							let id: undefined | string = undefined;
							if (!writer.createdAtHash) {
								id = "loading...";
							} else if (writer.entries.length > 0) {
								id = writer.entries.length.toString();
							}
							return (
								<Block
									onClick={() => {
										setWriter(writer);
									}}
									key={writer.address}
									href={`/writer/${writer.address}`}
									title={writer.title}
									isLoading={!writer.createdAtHash}
									id={id}
								/>
							);
						})}
				</div>
			)}
		</>
	);
}

export default Home;
