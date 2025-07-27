"use client";

import {
	WriterContext,
	type WriterContextType,
	defaultColor,
} from "@/utils/context";
import {
	RGBToHex,
	bytes32ToHexColor,
	hexToRGB,
	setPrimaryAndSecondaryCSSVariables,
} from "@/utils/utils";
import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { optimism } from "viem/chains";

const PRIVY_APP_ID = "clzekejfs079912zv96ahfm5a";
export const queryClient = new QueryClient();

export function Providers({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const [writer, setWriter] = useState<WriterContextType["writer"]>(null);
	const [primaryColor, setPrimaryColor] =
		useState<WriterContextType["primaryColor"]>(defaultColor);
	return (
		<QueryClientProvider client={queryClient}>
			<PrivyProvider
				appId={PRIVY_APP_ID}
				config={{
					loginMethods: ["sms", "email"],
					defaultChain: optimism,
					supportedChains: [optimism],
					appearance: {
						theme: "dark",
						accentColor: RGBToHex(primaryColor),
					},
					embeddedWallets: {
						createOnLogin: "users-without-wallets",
					},
				}}
			>
				<WriterContext
					value={{
						writer,
						setWriter,
						defaultColor,
						primaryColor,
						setPrimaryColor: (rgb) => {
							setPrimaryColor(rgb);
							setPrimaryAndSecondaryCSSVariables(rgb);
						},
						setPrimaryFromLongHex: (hex) => {
							const rgb = hexToRGB(bytes32ToHexColor(hex));
							setPrimaryColor(rgb);
							setPrimaryAndSecondaryCSSVariables(rgb);
						},
					}}
				>
					{children}
				</WriterContext>
			</PrivyProvider>
		</QueryClientProvider>
	);
}
