import { useWallets } from "@privy-io/react-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useContext, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import type { Hex } from "viem";
import Block from "../../components/Block";
import BlockForm from "../../components/BlockForm";
import { ClosedEye } from "../../components/icons/ClosedEye";
import { POLLING_INTERVAL } from "../../constants";
import { WriterContext } from "../../context";
import type { BlockCreateInput } from "../../interfaces";
import {
	deleteWriter,
	factoryCreate,
	getWritersByManager,
} from "../../utils/api";

function AuthedHome() {
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
						placeholder="Create a Place (for writing)"
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
								bottom={
									<div className="text-right text-sm text-neutral-600 leading-3 pt-2">
										<div className="group inline-block">
											<span className="group-hover:hidden block">
												{writer.entries.length.toString()}
											</span>
											<button
												type="button"
												className="group-hover:block hidden ml-auto absolute bottom-1.5 right-2 z-10 hover:text-primary"
												onClick={async (e) => {
													e.preventDefault();
													e.stopPropagation();
													await hideWriter(writer.address as Hex);
													refetch();
												}}
											>
												<ClosedEye className="w-4 h-4" />
											</button>
											<div className="absolute left-0 top-0 w-full h-full bg-neutral-900/90 hidden group-hover:flex items-center justify-center">
												<span className="text-primary italic">Hide?</span>
											</div>
										</div>
									</div>
								}
							/>
						))}
				</div>
			)}
		</>
	);
}

export default AuthedHome;
