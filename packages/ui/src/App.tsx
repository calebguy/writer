import { useWallets } from "@privy-io/react-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import type { Hex } from "viem";
import type { CreateNewBucketInputs, Writer } from "./interfaces";
import { createNewWriter, getWriters } from "./utils/api";
import { cn } from "./utils/cn";

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
		<div
			className="mt-10 flex-grow grid gap-2"
			style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
		>
			{wallet &&
				hasWriters &&
				data?.writers?.map((writer) => (
					<Bucket key={`writer-${writer.id}`} writer={writer} />
				))}
			<CreateBucketForm
				onSuccess={refetch}
				address={wallet?.address as string}
			/>
		</div>
	);
}

interface BucketProps {
	writer: Writer;
}

function Bucket({ writer: { id, title, address } }: BucketProps) {
	return (
		<Link
			to={`/writer/${address}`}
			key={id}
			className={cn(
				"border-0 hover:cursor-zoom-in border-neutral-700 px-3 py-2 bg-neutral-900 aspect-square flex flex-col justify-between",
			)}
		>
			<div className="text-left text-neutral-200">{title}</div>
			<div className="text-right text-neutral-600">{id}</div>
		</Link>
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
		<div
			// onSubmit={handleSubmit(onSubmit)}
			className="aspect-square border border-neutral-900 bg-transparent hover:bg-neutral-900 hover:cursor-pointer group"
		>
			<div className="flex justify-center items-center px-3 py-2 h-full">
				<div className="text-2xl text-black group-hover:text-white">+</div>
				{/* <div
					className={cn("flex items-center", {
						"text-lime uppercase": errors.title,
					})}
				>
					<span className="leading-snug">*</span>
					<span>title</span>
				</div>
				<input
					{...register("title", { required: true })}
					className="outline-none text-white px-1 py-0.5 bg-neutral-700 bg-transparent"
				/> */}
			</div>
			{/* <Button
				type="submit"
				disabled={isPending}
				className="text-xl bg-transparent"
			>
				<span className="text-lime" style={{ lineHeight: "0.25rem" }}>
					+
				</span>
			</Button> */}
		</div>
	);
}

export default App;
