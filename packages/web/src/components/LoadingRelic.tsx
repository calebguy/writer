"use client";

import { useMemo } from "react";
import { cn } from "@/utils/cn";

const LOGO_COUNT = 32;

export function LoadingRelic({
	className,
	size = 24,
}: { className?: string; size?: number }) {
	const src = useMemo(
		() => `/images/human/logo-${Math.floor(Math.random() * LOGO_COUNT) + 1}.png`,
		[],
	);

	return (
		<div
			className={cn("bg-primary rotating", className)}
			style={{
				width: size,
				height: size,
				maskImage: `url(${src})`,
				maskSize: "contain",
				maskRepeat: "no-repeat",
				maskPosition: "center",
			}}
		/>
	);
}
