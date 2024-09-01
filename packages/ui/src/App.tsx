import { useWallets } from "@privy-io/react-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { hc } from "hono/client";
import { useMemo } from "react";
import type { Hex } from "viem";
import type { Api } from "../../server/src";
import { Button } from "./components/Button";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { cn } from "./utils/cn";

const client = hc<Api>("/");

async function getWriters(address: Hex) {
	const res = await client.api.account[":address"].$get({
		param: { address },
	});
	if (!res.ok) {
		throw new Error(res.statusText);
	}
	return res.json();
}

async function createNewWriter(json: { admin: string; managers: string[] }) {
	const res = await client.api.create.$post({
		json,
	});
	if (!res.ok) {
		throw new Error(res.statusText);
	}
	return res.json();
}

function App() {
	const { wallets } = useWallets();
	const wallet = wallets[0];

	const { mutate } = useMutation({
		mutationFn: createNewWriter,
		mutationKey: ["create-from-factory"],
	});
	const { data } = useQuery({
		queryFn: () => getWriters(wallet?.address as Hex),
		queryKey: ["get-writers", wallet?.address],
		enabled: !!wallet?.address,
	});
	const hasWriters = useMemo(
		() => (data ? data.writers.length > 0 : false),
		[data],
	);

	return (
		<div className="h-full flex flex-col">
			<Header />
			<div className="grow flex items-center justify-center my-6">
				{wallet && (
					<div>
						{hasWriters ? (
							<>
								{data?.writers?.map(
									({
										id,
										address,
										storageAddress,
										admin,
										authors,
										createdAtBlock,
										createdAtHash,
									}) => (
										<div
											key={id}
											className={cn(
												"w-full break-words text-wrap whitespace-break-spaces	",
											)}
										>
											<div>id: {id}</div>
											<div>address: {address}</div>
											<div>storageAddress; {storageAddress}</div>
											<div>admin: {admin}</div>
											<div>createdAtBlock: {createdAtBlock}</div>
											<div>createdAtHash: {createdAtHash}</div>
											<div>authors: {authors.join(", ")}</div>
										</div>
									),
								)}
							</>
						) : (
							<Button
								onClick={() =>
									mutate({
										admin: wallet.address,
										managers: [wallet.address],
									})
								}
							>
								Create New
							</Button>
						)}
					</div>
				)}
			</div>
			<Footer />
		</div>
	);
}

export default App;
