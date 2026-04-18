"use client";

import { useAuthColor } from "@/hooks/useAuthColor";
import {
	AuthHintContext,
	WriterContext,
	type WriterContextType,
	defaultColor,
} from "@/utils/context";
import {
	applyThemeMode,
	getStoredThemeMode,
	onThemeChange,
	subscribeSystemThemeChange,
} from "@/utils/theme";
import {
	RGBToHex,
	bytes32ToHexColor,
	clearInlinePrimaryAndSecondary,
	hexToRGB,
	readCSSRgbVariable,
	setPrimaryAndSecondaryCSSVariables,
} from "@/utils/utils";
import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { optimism } from "viem/chains";

import { env } from "@/utils/env";

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 30 * 1000, // 30 seconds before data is considered stale
			gcTime: 10 * 60 * 1000, // 10 minutes cache retention
			refetchOnWindowFocus: false, // Don't refetch on tab focus
		},
	},
});

export function Providers({
	children,
	initialColor,
	initialLoggedIn = false,
}: Readonly<{
	children: React.ReactNode;
	initialColor?: string;
	initialLoggedIn?: boolean;
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
	const [hasUserColor, setHasUserColor] = useState<boolean>(!!initialColor);

	// Apply inline CSS variables only when the user has explicitly chosen a color.
	// When no color is chosen, the stylesheet's --color-*-default values drive
	// --color-primary/--color-secondary and track data-theme automatically.
	useEffect(() => {
		if (hasUserColor) {
			setPrimaryAndSecondaryCSSVariables(primaryColor);
		}
	}, [primaryColor, hasUserColor]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const mode = getStoredThemeMode();
		applyThemeMode(mode);
		if (mode !== "system") return;
		return subscribeSystemThemeChange(() => {
			applyThemeMode("system");
		});
	}, []);

	// When the user has no explicit color, keep React state in sync with the
	// themed default so consumers (Privy accentColor, swatches, etc.) react to
	// light/dark toggles.
	useEffect(() => {
		if (hasUserColor) return;
		const sync = () => {
			const rgb = readCSSRgbVariable("--color-primary-default");
			if (rgb) setPrimaryColor(rgb);
		};
		sync();
		return onThemeChange(sync);
	}, [hasUserColor]);

	const handleSetPrimaryColor = useCallback(
		(rgb: WriterContextType["primaryColor"]) => {
			setHasUserColor(true);
			setPrimaryColor(rgb);
			setPrimaryAndSecondaryCSSVariables(rgb);
		},
		[],
	);

	const handleSetPrimaryFromLongHex = useCallback((hex: string) => {
		const rgb = hexToRGB(bytes32ToHexColor(hex));
		setHasUserColor(true);
		setPrimaryColor(rgb);
		setPrimaryAndSecondaryCSSVariables(rgb);
	}, []);

	const handleResetPrimaryColor = useCallback(() => {
		setHasUserColor(false);
		clearInlinePrimaryAndSecondary();
		const rgb = readCSSRgbVariable("--color-primary-default");
		if (rgb) setPrimaryColor(rgb);
	}, []);

	return (
		<QueryClientProvider client={queryClient}>
			<PrivyProvider
				appId={env.NEXT_PUBLIC_PRIVY_APP_ID}
				config={{
					loginMethods: ["sms", "email", "wallet", "passkey"],
					defaultChain: optimism,
					supportedChains: [optimism],
					walletConnectCloudProjectId: env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
					appearance: {
						theme: "dark",
						accentColor: RGBToHex(primaryColor),
						landingHeader: "",
						walletList: [
							"metamask",
							"coinbase_wallet",
							"rainbow",
							"wallet_connect_qr",
						],
						walletChainType: "ethereum-only",
					},
					embeddedWallets: {
						ethereum: {
							createOnLogin: "users-without-wallets",
						},
					},
					externalWallets: {
						walletConnect: { enabled: true },
					},
				}}
			>
				<AuthHintContext value={initialLoggedIn}>
					<WriterContext
						value={{
							writer,
							setWriter,
							defaultColor,
							primaryColor,
							setPrimaryColor: handleSetPrimaryColor,
							setPrimaryFromLongHex: handleSetPrimaryFromLongHex,
							resetPrimaryColor: handleResetPrimaryColor,
						}}
					>
						<AuthColorSync />
						{children}
					</WriterContext>
				</AuthHintContext>
			</PrivyProvider>
		</QueryClientProvider>
	);
}

function AuthColorSync() {
	useAuthColor();
	return null;
}
