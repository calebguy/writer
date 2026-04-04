import Image from "next/image";

export default function AboutPage() {
	return (
		<div className="max-w-2xl mx-auto w-full font-serif flex-1 flex flex-col gap-8 items-center justify-center">
			<div className="flex flex-col gap-8 text-3xl leading-relaxed bg-secondary text-primary">
				Writer is for writing and reading, for me and for you
			</div>
			<div className="flex items-center justify-center gap-4 dark:invert">
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
