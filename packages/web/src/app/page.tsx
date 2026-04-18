import { LandingPage } from "@/components/LandingPage";
import { getRandomForLines } from "@/utils/forLines";

export default function Index() {
	const forLines = getRandomForLines();
	return <LandingPage forLines={forLines} />;
}
