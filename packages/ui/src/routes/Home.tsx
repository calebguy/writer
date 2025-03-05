import { useWallets } from "@privy-io/react-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useContext, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import type { Hex } from "viem";
import Block from "../components/Block";
import BlockForm from "../components/BlockForm";
import { Dropdown, DropdownItem } from "../components/Dropdown";
import { ClosedEye } from "../components/icons/ClosedEye";
import { VerticalEllipses } from "../components/icons/VerticalEllipses";
import { POLLING_INTERVAL } from "../constants";
import { WriterContext } from "../context";
import type { BlockCreateInput } from "../interfaces";
import { deleteWriter, factoryCreate, getWritersByManager } from "../utils/api";

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
		mutationFn: factoryCreate,
		mutationKey: ["create-from-factory"],
		onSuccess: () => {
			refetch();
			setIsPolling(true);
		},
	});

	const { mutateAsync: hideWriter } = useMutation({
		mutationFn: deleteWriter,
		mutationKey: ["delete-writer"],
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

	const handleSubmit = async ({ value }: BlockCreateInput) => {
		return mutateAsync({
			title: value,
			admin: address,
			managers: [address],
		});
	};

	return (
		<>
			<Helmet>
				<title>Writer</title>
				<meta property="og:title" content="Writer" />
			</Helmet>
			{address && (
				<div
					className="grid gap-2"
					style={{
						gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
					}}
				>
					<BlockForm
						placeholder="Create a Writer"
						isLoading={isPending}
						onSubmit={handleSubmit}
					/>
					{wallet &&
						hasWriters &&
						data?.map((writer) => (
							<Block
								key={writer.address}
								onClick={() => {
									setWriter(writer);
								}}
								href={`/writer/${writer.address}`}
								title={writer.title}
								isLoading={!writer.createdAtHash}
								id={writer.entries.length.toString()}
								bottomRight={
									<Dropdown
										side="right"
										onSelect={() => {
											hideWriter(writer.address);
										}}
										trigger={
											<VerticalEllipses className="w-5 hover:bg-neutral-800 rounded-full p-0.5" />
										}
									>
										<DropdownItem>
											<ClosedEye className="w-4 text-neutral-600" />
										</DropdownItem>
									</Dropdown>
								}
							/>
						))}
				</div>
			)}
		</>
	);
}

export default Home;
