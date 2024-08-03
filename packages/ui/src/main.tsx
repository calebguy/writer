import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const PRIVY_APP_ID = "clzekejfs079912zv96ahfm5a";

const queryClient = new QueryClient();

// biome-ignore lint/style/noNonNullAssertion: <explanation>
ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<QueryClientProvider client={queryClient}>
			<PrivyProvider
				appId={PRIVY_APP_ID}
				config={{
					loginMethods: ["sms"],
					appearance: {
						theme: "dark",
						accentColor: "#d2ff2e",
					},
					embeddedWallets: {
						createOnLogin: "users-without-wallets",
					},
				}}
			>
				<App />
			</PrivyProvider>
		</QueryClientProvider>
	</React.StrictMode>,
);
