// export const metadata: Metadata = {
// 	title: "Writer",
// 	description: "Write for now, forever",
// };

import { Header } from "@/components/Header";

export default function HomeLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className="flex flex-col h-screen">
			<div className="mb-4">
				<Header />
			</div>
			<div>{children}</div>
		</div>
	);
}
