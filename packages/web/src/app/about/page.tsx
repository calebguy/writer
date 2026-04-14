import { Lock } from "@/components/icons/Lock";
import Image from "next/image";

export default function AboutPage() {
	return (
		<div className="max-w-2xl mx-auto w-full font-serif flex-1 flex flex-col gap-12 items-center justify-center px-6">
			<div className="flex flex-col gap-6 text-center">
				<h1 className="text-3xl">Writer is a place to write.</h1>
				<div className="flex flex-col gap-4 text-lg text-muted-foreground leading-relaxed">
					<p>
						What you write is stored in the digital equivalent of a rock that
						lasts forever.
					</p>
					<div className="flex items-baseline justify-center gap-1">
						<span>Select</span> <Lock className="h-4 w-4 inline-block" />{" "}
						<span>to keep your writing private.</span>
					</div>
					<p className="italic">Write today, forever.</p>
				</div>
			</div>
			<div className="flex items-center justify-center gap-4">
				<Image
					src="/images/human/logo-1.png"
					alt="Writer"
					width={100}
					height={100}
					className="dark:invert"
					priority
				/>
				<Image
					src="/images/human/logo-2.png"
					alt="Writer"
					width={100}
					height={100}
					className="dark:invert"
					priority
				/>
				<Image
					src="/images/human/logo-3.png"
					alt="Writer"
					width={100}
					height={100}
					className="dark:invert"
					priority
				/>
			</div>
		</div>
	);
}
