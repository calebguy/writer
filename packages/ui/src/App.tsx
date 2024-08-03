import { Footer } from "./components/Footer";
import { Header } from "./components/Header";

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
	return (
		<div className="h-full flex flex-col">
			<Header />
			<div className="grow flex items-center justify-center border-dashed border border-neutral-500 my-6">
				<div>body</div>
			</div>
			<Footer />
		</div>
	);
}

export default App;
