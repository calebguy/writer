import { useWallets } from "@privy-io/react-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import type { Hex } from "viem";
import { Blob } from "./components/icons/Blob";
import type { CreateNewBucketInputs } from "./interfaces";
import {
	type GetWritersResponse,
	createNewWriter,
	getWriters,
} from "./utils/api";
import { cn } from "./utils/cn";
import { useFirstWallet, useIsMac } from "./utils/hooks";

function App() {
	const { wallets, ready } = useWallets();
	const wallet = wallets[0];
	const address = wallet?.address;

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
		<>
			{address && (
				<div
					className="mt-10 grid gap-2 gap-y-4"
					style={{
						gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
					}}
				>
					<CreateBucketForm
						onSuccess={() => {
							console.log("new bucket created");
							refetch();
						}}
					/>
					{wallet &&
						hasWriters &&
						data?.writers?.map((writer) => (
							<Bucket key={`writer-${writer.id}`} writer={writer} />
						))}
				</div>
			)}
			{!address && ready && (
				<div className="text-xl text-lime mt-8 grow flex justify-center items-center">
					<div>Click the lil guy to begin</div>
				</div>
			)}
		</>
	);
}

interface BucketProps {
	writer: GetWritersResponse["writers"][number];
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
}

function CreateBucketForm({ onSuccess }: CreateBucketFormProps) {
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
						<div className="text-base text-neutral-700 hidden group-hover:block text-left">
							Create a collection
						</div>
					</>
				)}
				{showForm && (
					<CreateForm
						onCancel={() => setShowForm(false)}
						onSuccess={onSuccess}
					/>
				)}
			</div>
		</div>
	);
}

interface CreateFormProps {
	onCancel: () => void;
	onSuccess: () => void;
}

function CreateForm({ onSuccess, onCancel }: CreateFormProps) {
	const isMac = useIsMac();
	const address = useFirstWallet()?.address;
	const inputName = "title";
	const { register, handleSubmit, setFocus, reset, getValues } =
		useForm<CreateNewBucketInputs>();
	const onSubmit: SubmitHandler<CreateNewBucketInputs> = useCallback(
		(data) => {
			mutate({
				title: data[inputName],
				admin: address,
				managers: [address],
			});
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[address],
	);

	const { mutate, isPending } = useMutation({
		mutationFn: createNewWriter,
		mutationKey: ["create-from-factory"],
		onSuccess: () => {
			reset();
			onSuccess();
		},
	});

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				handleSubmit(onSubmit)();
			} else if (event.key === "Escape") {
				onCancel();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [handleSubmit, onSubmit, onCancel]);

	useEffect(() => {
		const timeoutId = setTimeout(() => {
			setFocus(inputName);
		}, 0);
		return () => clearTimeout(timeoutId);
	}, [setFocus]);

	return (
		<form className="w-full h-full relative">
			<textarea
				disabled={!address || isPending}
				className={cn(
					"w-full h-full text-base bg-neutral-900 disabled:opacity-30 placeholder:text-neutral-700 px-3 py-2 outline-none border-[1px] border-dashed border-lime resize-none ants",
				)}
				placeholder="Name your collection"
				{...register(inputName)}
			/>
			{isPending && (
				<div className="absolute inset-0 bg-lime text-black flex flex-col items-center justify-between py-2 px-3">
					<div className="text-[#b5db29]">{getValues(inputName)}</div>
					<div className="text-sm absolute inset-0 flex justify-center items-center">
						<Blob className="w-6 h-6 rotating" />
					</div>
				</div>
			)}
			{!isPending && (
				<div className="text-neutral-700 text-sm leading-[16px] mt-1 absolute bottom-3 left-1/2 -translate-x-1/2">
					<div>{isMac ? "⌘" : "ctrl"} + ↵</div>
					<div>to create</div>
				</div>
			)}
		</form>
	);
}

export default App;
