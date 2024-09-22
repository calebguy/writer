import { useWallets } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Hex } from "viem";
import type { Writer } from "./interfaces";
import { getWriters } from "./utils/api";
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
	// const { mutate, isPending } = useMutation({
	// 	mutationFn: createNewWriter,
	// 	mutationKey: ["create-from-factory"],
	// 	onSuccess: () => onSuccess(),
	// });
	// const {
	// 	register,
	// 	handleSubmit,
	// 	formState: { errors },
	// } = useForm<CreateNewBucketInputs>();
	// const onSubmit: SubmitHandler<CreateNewBucketInputs> = (data) => {
	// 	mutate({
	// 		title: data.title,
	// 		admin: address,
	// 		managers: [address],
	// 	});
	// };

	const [showForm, setShowForm] = useState(false);

	const ref = useRef<HTMLInputElement>(null);
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (ref.current) {
				if (!ref.current.contains(event.target as Node)) {
					setShowForm(false);
				} else {
					setShowForm(true);
				}
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);
	return (
		<div
			ref={ref}
			className={cn("aspect-square border border-neutral-900 group", {
				"bg-neutral-900": showForm,
				"hover:bg-neutral-900 hover:cursor-text bg-transparent": !showForm,
			})}
		>
			<div
				className={cn("flex justify-center items-center h-full", {
					"items-start justify-start": showForm,
					"group-hover:items-start group-hover:justify-start px-3 py-2":
						!showForm,
				})}
			>
				{!showForm && (
					<>
						<div className="text-2xl text-lime group-hover:hidden">+</div>
						<div className="text-base text-neutral-500 hidden group-hover:block text-left">
							Create a collection
						</div>
					</>
				)}
				{showForm && <CreateForm />}
			</div>
		</div>
	);
}

function CreateForm() {
	const ref = useRef<HTMLTextAreaElement>(null);
	useEffect(() => {
		const timeoutId = setTimeout(() => {
			ref.current?.focus();
		}, 0); // 0 ms delay to ensure mounting

		return () => clearTimeout(timeoutId);
	}, []);
	return (
		<form className="w-full h-full">
			<textarea
				ref={ref}
				tabIndex={0}
				className="w-full h-full bg-neutral-900 text-base placeholder:text-neutral-700 px-3 py-2 outline-[1px] outline-dashed outline-lime resize-none"
				placeholder="Name your collection"
			/>
			<div>⌘ + ↵</div>
		</form>
	);
}

export default App;
