import { getWriter } from "@/utils/api";
import { type Hex, stringify } from "viem";

export default async function Writer({
	params,
}: {
	params: { address: string };
}) {
	const { address } = params;
	const writer = await getWriter(address as Hex);

	return (
		<div>
			<div>{stringify(writer)}</div>
		</div>
	);
}
