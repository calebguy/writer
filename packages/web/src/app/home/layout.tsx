import { Header } from "../../components/Header";

export default function AuthedLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className="flex flex-col grow">
			<div className="mb-4">
				<Header />
			</div>
			<div className="grow flex flex-col">{children}</div>
		</div>
	);
}
