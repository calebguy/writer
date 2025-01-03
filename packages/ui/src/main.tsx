import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { optimism } from "viem/chains";
import ErrorPage from "./error-page.tsx";
import { AppLayout } from "./layouts/App.layout.tsx";
import { Account } from "./routes/Account.tsx";
import Home from "./routes/Home.tsx";
import { Writer } from "./routes/Writer.tsx";

import "./index.scss";
import Entry from "./routes/Entry.tsx";
import { Create } from "./routes/Create.tsx";

const PRIVY_APP_ID = "clzekejfs079912zv96ahfm5a";
const queryClient = new QueryClient();

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
	getRouteWithErrorBoundry("/account/:address", <Account />),
	getRouteWithErrorBoundry("/writer/:address", <Writer />),
	getRouteWithErrorBoundry("/writer/:address/:id", <Entry />),
	getRouteWithErrorBoundry("/writer/:address/create", <Create />),
]);

// biome-ignore lint/style/noNonNullAssertion: 🫚
ReactDOM.createRoot(document.getElementById("root")!).render(
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
						accentColor: "#d2ff2e",
					},
					embeddedWallets: {
						createOnLogin: "users-without-wallets",
					},
				}}
			>
				<RouterProvider router={router} />
			</PrivyProvider>
		</QueryClientProvider>
	</React.StrictMode>,
);
