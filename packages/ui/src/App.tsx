import { usePrivy } from "@privy-io/react-auth";
import { Button } from "./components/Button";

// const client = hc<Api>("/");

// async function get() {
// 	const res = await client.api.$get();
// 	if (!res.ok) {
// 		throw new Error(res.statusText);
// 	}
// 	return (await res.json()).message;

// const { data } = useQuery({
// 	queryKey: ["get"],
// 	queryFn: get,
// });
// }

function App() {
	const { ready, authenticated, login, logout } = usePrivy();
	const disableLogin = !ready || (ready && authenticated);
	const disableLogout = !ready || (ready && !authenticated);
	return (
		<div>
			<div>
				<h1 className="text-4xl text-lime">Writer</h1>
			</div>
			<div className="mt-10">
				{authenticated ? (
					<Button type="button" disabled={disableLogout} onClick={logout}>
						Log out
					</Button>
				) : (
					<Button type="button" disabled={disableLogin} onClick={login}>
						Log in
					</Button>
				)}
			</div>
		</div>
	);
}

export default App;
