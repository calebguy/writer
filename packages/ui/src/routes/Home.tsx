import { useWallets } from "@privy-io/react-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useContext, useMemo } from "react";
import type { Hex } from "viem";
import Block from "../components/Block";
import BlockCreateForm from "../components/BlockCreateForm";
import { HeaderContext } from "../layouts/App.layout";
import { createFromFactory, getAuthor } from "../utils/api";

function Home() {
	const { wallets, ready } = useWallets();
	const wallet = wallets[0];
	const address = wallet?.address;

	const { setHeaderContent } = useContext(HeaderContext);

	const { data, refetch } = useQuery({
		queryFn: () => getAuthor(wallet?.address as Hex),
		queryKey: ["get-writers", wallet?.address],
		enabled: !!wallet?.address,
	});

	const { mutateAsync, isPending } = useMutation({
		mutationFn: createFromFactory,
		mutationKey: ["create-from-factory"],
		onSuccess: () => {
			refetch();
		},
	});

	const hasWriters = useMemo(
		() => (data ? data.writers.length > 0 : false),
		[data],
	);

	return (
		<>
			{address && (
				<div
					className="mt-10 grid gap-2 gap-y-4"
					style={{
						gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
					}}
				>
					<BlockCreateForm
						isLoading={isPending}
						hoverLabel="Create a Collection"
						activeLabel="Name your Collection"
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
									setHeaderContent(writer.title);
								}}
								key={writer.id}
								href={`/writer/${writer.address}`}
								title={writer.title}
								id={writer.entries.length.toString()}
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