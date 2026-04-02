"use client";

import { useLogin } from "@privy-io/react-auth";
import Image from "next/image";

interface LoginPromptProps {
	toWhat?: string;
	logos: [number, number];
}

export function LoginPrompt({ toWhat, logos }: LoginPromptProps) {
	const { login } = useLogin();

	return (
		<div className="grow flex flex-col items-center justify-center min-h-[60vh] gap-4">
			<Image
				src={`/images/human/logo-${logos[0]}.png`}
				alt="Light"
				width={100}
				height={100}
				className="min-w-10 min-h-10 dark:invert rotate-180"
				priority
			/>
			<button
				type="button"
				className="font-serif italic text-xl text-primary cursor-pointer transition-opacity duration-200 hover:opacity-50"
				onClick={() => login()}
			>
				login {toWhat ? `to ${toWhat}` : ""}
			</button>
			<Image
				src={`/images/human/logo-${logos[1]}.png`}
				alt="Light"
				width={100}
				height={100}
				className="min-w-10 min-h-10 dark:invert"
				priority
			/>
		</div>
	);
}
