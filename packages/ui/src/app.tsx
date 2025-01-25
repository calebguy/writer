import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { optimism } from "viem/chains";
import ErrorPage from "./error-page.tsx";
import { AppLayout } from "./layouts/App.layout.tsx";
import { Author } from "./routes/Author.tsx";
import Entry from "./routes/Entry.tsx";
import Home from "./routes/Home.tsx";
import { Writer } from "./routes/Writer.tsx";
import color from "./utils/color.ts";

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
	getRouteWithErrorBoundry("/account/:address", <Author />),
]);

export function App() {
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
							accentColor: color.primaryHex,
						},
						embeddedWallets: {
							createOnLogin: "users-without-wallets",
						},
					}}
				>
					<RouterProvider router={router} />
				</PrivyProvider>
			</QueryClientProvider>
		</React.StrictMode>
	);
}
