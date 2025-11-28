"use client";
import { useLogin } from "@privy-io/react-auth";

export function IndexButton() {
	const { login } = useLogin({
		onComplete: () => {
			window.location.href = "/home";
		},
	});
	return (
		<button
			type="button"
			className="bg-neutral-900 text-primary px-4 py-2 cursor-pointer"
			onClick={() => login()}
		>
			Open
		</button>
	);
}
