import { useQuery } from "@tanstack/react-query";
import { hc } from "hono/client";
import type { Api } from "../../server/src";

const client = hc<Api>("/");

async function get() {
	const res = await client.api.$get();
	if (!res.ok) {
		throw new Error(res.statusText);
	}
	return (await res.json()).message;
}

function App() {
	const { data } = useQuery({
		queryKey: ["get"],
		queryFn: get,
	});
	return (
		<div>
			<a
				target="_blank"
				rel="noopener noreferrer"
				href="https://github.com/new?template_name=vono&template_owner=calebguy"
				className="bg-[#1d1d1d] text-[#999999] rounded-lg px-3 py-1.5 hover:text-[#C000FF] border-[1px] border-transparent hover:border-[#C000FF]"
			>
				{data}
			</a>
		</div>
	);
}

export default App;
