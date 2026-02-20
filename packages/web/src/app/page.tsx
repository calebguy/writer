import { IndexButton } from "@/components/IndexButton";
import { requireGuest } from "@/utils/auth";

export default async function Index() {
	await requireGuest();
	return (
		<div className="flex-1 flex justify-center items-center">
			<div className="flex flex-col gap-4 items-center">
				<div className="index-title text-6xl md:text-8xl italic">Writer</div>
				<IndexButton />
			</div>
		</div>
	);
}
