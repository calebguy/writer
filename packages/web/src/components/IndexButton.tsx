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
			className="index-enter-btn bg-neutral-900 px-2 py-1.5 cursor-pointer"
			onClick={() => login()}
		>
			Enter
		</button>
	);
}
