import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import type { Hex } from "viem";
import { MD } from "../components/MD";
import { getWriter } from "../utils/api";
import { useFirstWallet } from "../utils/hooks";

export default function Entry() {
	const wallet = useFirstWallet();
	const { address, id } = useParams();
	const { data } = useQuery({
		queryFn: () => getWriter(address as Hex),
		queryKey: ["get-writer", address],
		enabled: !!address,
	});
	const entry = useMemo(() => {
		return data?.entries.find((e) => e.onChainId === id);
	}, [data, id]);
	const isEditable = useMemo(() => {
		return data?.managers.includes(wallet?.address);
	}, [data?.managers, wallet?.address]);

	return (
		<div className="flex-grow flex flex-col">
			<MD>{entry?.content}</MD>
			{isEditable && "can edit"}
			{JSON.stringify(wallet)}
		</div>
	);
}
