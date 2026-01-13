import { WriterHeader } from "@/components/header/WriterHeader";
import { EntryLoadingProvider } from "@/utils/EntryLoadingContext";
import { use } from "react";

export default function Layout({
	children,
	params,
}: Readonly<{
	children: React.ReactNode;
	params: Promise<{ address: string }>;
}>) {
	const { address } = use(params);
	return (
		<EntryLoadingProvider>
			<div className="flex flex-col grow min-h-0">
				<div className="mb-4 shrink-0">
					<WriterHeader address={address} />
				</div>
				<div className="grow flex flex-col relative min-h-0 overflow-auto">
					{children}
				</div>
			</div>
		</EntryLoadingProvider>
	);
}
