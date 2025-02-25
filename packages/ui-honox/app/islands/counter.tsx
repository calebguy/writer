import { useState } from "react";

export default function Counter() {
	const [count, setCount] = useState(0);
	return (
		<div>
			<p>{count}</p>
			<button
				className="bg-blue-500 text-white p-2 rounded cursor-pointer active:bg-blue-600"
				type="button"
				onClick={() => {
					setCount(count + 1);
					console.log("setCount(count + 1)");
				}}
			>
				Increment
			</button>
		</div>
	);
}
