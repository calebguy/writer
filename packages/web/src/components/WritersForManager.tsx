"use client";

import {
	type Writer,
	deleteWriter,
	factoryCreate,
	getWritersByManager,
} from "@/utils/api";
import type { UserWithWallet } from "@/utils/auth";
import { POLLING_INTERVAL } from "@/utils/constants";
import { useMutation, useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Hex } from "viem";
import CreateInput from "./CreateInput";
import { MarkdownRenderer } from "./MarkdownRenderer";
const MDX = dynamic(() => import("./markdown/MDX"), { ssr: false });

export function WritersForManager({
	writers,
	user,
}: { writers: Array<Writer>; user?: UserWithWallet }) {
	const [isPolling, setIsPolling] = useState(false);

	const address = user?.wallet.address;
	const { data, refetch } = useQuery({
		queryFn: () => getWritersByManager(address as Hex),
		queryKey: ["get-writers", address],
		enabled: !!address,
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

	useEffect(() => {
		const isAllOnChain = data?.every((writer) => writer.createdAtHash);
		if (isAllOnChain) {
			setIsPolling(false);
		} else if (!isPolling) {
			setIsPolling(true);
		}
	}, [data, isPolling]);

	return (
		<div
			className="grid gap-2"
			style={{
				gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
			}}
		>
			{!!user && <CreateInput placeholder="Create a Place" />}
			{(data ?? writers)?.map((writer) => (
				<Link
					href={`/writer/${writer.address}`}
					key={writer.address}
					className="aspect-square bg-neutral-900 flex flex-col justify-between px-2 pt-2 pb-0.5 hover:cursor-zoom-in"
				>
					<MarkdownRenderer markdown={writer.title} className=" text-white" />
					<div className="text-right text-neutral-600">
						{writer.entries.length}
					</div>
				</Link>
			))}
		</div>
	);
}
