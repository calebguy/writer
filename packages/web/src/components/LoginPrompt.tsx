"use client";

import { useLogin } from "@privy-io/react-auth";

export function LoginPrompt() {
	const { login } = useLogin();
	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
			<button
				type="button"
				className="font-serif italic text-xl text-secondary cursor-pointer transition-opacity duration-200 hover:opacity-50"
				onClick={() => login()}
			>
				login to begin
			</button>
		</div>
	);
}
