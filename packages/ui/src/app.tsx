import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useState } from "react";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { optimism } from "viem/chains";
import {
	WriterContext,
	type WriterContextType,
	defaultColor,
} from "./context.ts";
import ErrorPage from "./error-page.tsx";
import { AppLayout } from "./layouts/App.layout.tsx";
import { BaseLayout } from "./layouts/Base.tsx";
import { DocsLayout } from "./layouts/Docs.layout.tsx";
import { Docs } from "./routes/Docs/Docs.tsx";
import Entry from "./routes/Entry.tsx";
import Home from "./routes/Home/Home.tsx";
import Index from "./routes/Index.tsx";
import { Writer } from "./routes/Writer.tsx";
import {
	RGBToHex,
	bytes32ToHexColor,
	hexToRGB,
	setPrimaryAndSecondaryCSSVariables,
} from "./utils/utils.ts";

const PRIVY_APP_ID = "clzekejfs079912zv96ahfm5a";
export const queryClient = new QueryClient();

function getRouteWithErrorBoundry(path: string, element: React.ReactNode) {
	return {
		path,
		element: <AppLayout>{element}</AppLayout>,
		errorElement: (
			<AppLayout>
				<ErrorPage />
			</AppLayout>
		),
	};
}

const router = createBrowserRouter([
	getRouteWithErrorBoundry("/", <Home />),
	getRouteWithErrorBoundry("/writer/:address", <Writer />),
	getRouteWithErrorBoundry("/writer/:address/:id", <Entry />),
	getRouteWithErrorBoundry("/index", <Index />),
	{
		path: "/docs",
		element: (
			<DocsLayout>
				<Docs />
			</DocsLayout>
		),
		errorElement: (
			<BaseLayout>
				<ErrorPage />
			</BaseLayout>
		),
	},
]);

export function App() {
	const [writer, setWriter] = useState<WriterContextType["writer"]>(null);
	const [primaryColor, setPrimaryColor] =
		useState<WriterContextType["primaryColor"]>(defaultColor);
	return (
		<React.StrictMode>
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
					<WriterContext.Provider
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
						<RouterProvider router={router} />
					</WriterContext.Provider>
				</PrivyProvider>
			</QueryClientProvider>
		</React.StrictMode>
	);
}
