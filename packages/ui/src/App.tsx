import { useWallets } from "@privy-io/react-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { hc } from "hono/client";
import { useMemo } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import type { Hex } from "viem";
import type { Api } from "../../server/src";
import { Button } from "./components/Button";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import type { CreateNewBucketInputs, Writer } from "./interfaces";
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

	const hasWriters = useMemo(
		() => (data ? data.writers.length > 0 : false),
		[data],
	);

	return (
		<div className="h-full flex flex-col">
			<Header />
			<div className="mt-10 flex-grow">
				{wallet &&
					hasWriters &&
					data?.writers?.map((writer) => (
						<Bucket key={`writer-${writer.id}`} writer={writer} />
					))}
				{/* <div>
							<CreateBucketForm onSuccess={refetch} address={wallet.address}/>
						</div> */}
			</div>
			<Footer />
		</div>
	);
}

interface BucketProps {
	writer: Writer;
}

function Bucket({
	writer: {
		id,
		title,
		address,
		storageAddress,
		admin,
		createdAtBlock,
		createdAtHash,
		authors,
	},
}: BucketProps) {
	return (
		<div
			key={id}
			className={cn(
				"border-0 hover:cursor-zoom-in border-neutral-700 px-3 py-2 bg-neutral-900 max-w-[200px] max-h-[200px] w-full h-full overflow-hidden flex flex-col justify-between",
			)}
		>
			<div className="text-left text-neutral-200">{title}</div>
			<div className="text-right text-neutral-600">{id}</div>
		</div>
	);
}

interface CreateBucketFormProps {
	onSuccess: () => void;
	address: string;
}

function CreateBucketForm({ onSuccess, address }: CreateBucketFormProps) {
	const { mutate, isPending } = useMutation({
		mutationFn: createNewWriter,
		mutationKey: ["create-from-factory"],
		onSuccess: () => onSuccess(),
	});
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<CreateNewBucketInputs>();
	const onSubmit: SubmitHandler<CreateNewBucketInputs> = (data) => {
		mutate({
			title: data.title,
			admin: address,
			managers: [address],
		});
	};
	return (
		<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col space-y-2">
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
	);
}

export default App;
