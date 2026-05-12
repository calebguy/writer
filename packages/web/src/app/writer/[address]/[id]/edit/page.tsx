import { MobileEditEntryPage } from "@/components/MobileEditEntryPage";
import { use } from "react";

type EditEntryRouteParams = Promise<{ address: string; id: string }>;

export default function EditEntryPage({
	params,
}: {
	params: EditEntryRouteParams;
}) {
	const { address, id } = use(params);
	return <MobileEditEntryPage address={address} id={id} />;
}
