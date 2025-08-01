import { Header } from "../../../components/Header";

export default function AuthedLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className="flex flex-col">
			<div className="mb-4">
				<Header />
			</div>
			<div>{children}</div>
		</div>
	);
}
