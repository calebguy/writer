"use client";

import { useLogin } from "@privy-io/react-auth";
import Image from "next/image";

interface LoginPromptProps {
	label?: string;
	toWhat?: string;
	logo: number;
}

export function LoginPrompt({ label, toWhat, logo }: LoginPromptProps) {
	const { login } = useLogin();
	const promptLabel = label ?? `Sign in${toWhat ? ` to ${toWhat}` : ""}`;

	return (
		<div className="grow flex flex-col items-center justify-center min-h-[60vh] gap-4">
			<button
				type="button"
				className="font-serif italic text-xl text-primary cursor-pointer transition-opacity duration-200 hover:text-secondary"
				onClick={() => login()}
			>
				{promptLabel}
			</button>
			<Image
				src={`/images/human/logo-${logo}.webp`}
				alt="Light"
				width={100}
				height={100}
				className="min-w-10 min-h-10 dark:invert"
				priority
			/>
		</div>
	);
}
