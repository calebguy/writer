import { MobileCreateEntryPage } from "@/components/MobileCreateEntryPage";
import { use } from "react";

type NewEntryRouteParams = Promise<{ address: string }>;

export default function NewEntryPage({
	params,
}: {
	params: NewEntryRouteParams;
}) {
	const { address } = use(params);
	return <MobileCreateEntryPage address={address} />;
}
