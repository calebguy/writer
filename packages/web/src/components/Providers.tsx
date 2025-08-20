"use client";

import { useAuthColor } from "@/hooks/useAuthColor";
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
import { useEffect, useState } from "react";
import { optimism } from "viem/chains";

const PRIVY_APP_ID = "clzekejfs079912zv96ahfm5a";
export const queryClient = new QueryClient();

export function Providers({
	children,
	initialColor,
}: Readonly<{
	children: React.ReactNode;
	initialColor?: string;
}>) {
	const [writer, setWriter] = useState<WriterContextType["writer"]>(null);

	const getInitialColor = () => {
		if (initialColor) {
			try {
				return hexToRGB(bytes32ToHexColor(initialColor));
			} catch {
				return defaultColor;
			}
		}
		return defaultColor;
	};

	const [primaryColor, setPrimaryColor] = useState<
		WriterContextType["primaryColor"]
	>(getInitialColor());

	useEffect(() => {
		setPrimaryAndSecondaryCSSVariables(primaryColor);
	}, [primaryColor]);

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
					<AuthColorSync />
					{children}
				</WriterContext>
			</PrivyProvider>
		</QueryClientProvider>
	);
}

function AuthColorSync() {
	useAuthColor();
	return null;
}
