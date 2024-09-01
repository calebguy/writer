import { useWallets } from "@privy-io/react-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { hc } from "hono/client";
import { useMemo } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { type Hex } from "viem";
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

async function createNewWriter(json: {
	admin: string;
	managers: string[];
	title: string;
}) {
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

	const { data, refetch } = useQuery({
		queryFn: () => getWriters(wallet?.address as Hex),
		queryKey: ["get-writers", wallet?.address],
		enabled: !!wallet?.address,
	});
	const { mutate, isPending } = useMutation({
		mutationFn: createNewWriter,
		mutationKey: ["create-from-factory"],
		onSuccess: () => refetch(),
	});

	const hasWriters = useMemo(
		() => (data ? data.writers.length > 0 : false),
		[data],
	);

	type CreateNewBucketInputs = {
		title: string;
	};
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<CreateNewBucketInputs>();
	const onSubmit: SubmitHandler<CreateNewBucketInputs> = (data) => {
		mutate({
			title: data.title,
			admin: wallet.address,
			managers: [wallet.address],
		});
	};

	return (
		<div className="h-full flex flex-col">
			<Header />
			<div className="grow flex items-center justify-center my-6">
				{wallet && (
					<div>
						{hasWriters && (
							<>
								{data?.writers?.map(
									({
										id,
										title,
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
											<div>
												title: {title}
												{/* {stringify(
													decodeAbiParameters(
														[
															{ name: "id", type: "uint256" },
															{ name: "title", type: "string" },
															{ name: "writerAddress", type: "address" },
															{ name: "storeAddress", type: "address" },
															{ name: "admin", type: "address" },
															{ name: "managers", type: "address[]" },
														],
														"0x00000000000000000000000000000000000000000000000000000000000000010000000000000000000000004dcbfc93b5aad23c8f4ade307ccc39fd9fb7253400000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000001000000000000000000000000a175dc22d1a124901edeefe40b59534b3da08e78" as Hex,
													),
												)} */}
											</div>
											<div>address: {address}</div>
											<div>storageAddress; {storageAddress}</div>
											<div>admin: {admin}</div>
											<div>createdAtBlock: {createdAtBlock}</div>
											<div>createdAtHash: {createdAtHash}</div>
											<div>writers: {authors.join(", ")}</div>
										</div>
									),
								)}
							</>
						)}
						<div>
							<form
								onSubmit={handleSubmit(onSubmit)}
								className="flex flex-col space-y-2"
							>
								<div>
									<div
										className={cn("flex items-center", {
											"text-lime uppercase": errors.title,
										})}
									>
										<span className="leading-snug">*</span>
										<span>title</span>
									</div>
									<input
										{...register("title", { required: true })}
										className="outline-none text-white px-1 py-0.5 bg-neutral-700"
									/>
								</div>
								<Button type="submit" disabled={isPending}>
									+ Bucket
								</Button>
							</form>
						</div>
					</div>
				)}
			</div>
			<Footer />
		</div>
	);
}

export default App;
