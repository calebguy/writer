"use client";

import { useLogin } from "@privy-io/react-auth";
import Image from "next/image";

interface LoginPromptProps {
	toWhat?: string;
	logo: number;
}

export function LoginPrompt({ toWhat, logo }: LoginPromptProps) {
	const { login } = useLogin();

	return (
		<div className="grow flex flex-col items-center justify-center min-h-[60vh] gap-4">
			<button
				type="button"
				className="font-serif italic text-xl text-primary cursor-pointer transition-opacity duration-200 hover:text-secondary"
				onClick={() => login()}
			>
				Sign in {toWhat ? `to ${toWhat}` : ""}
			</button>
			<Image
				src={`/images/human/logo-${logo}.png`}
				alt="Light"
				width={100}
				height={100}
				className="min-w-10 min-h-10 dark:invert"
				priority
			/>
		</div>
	);
}
