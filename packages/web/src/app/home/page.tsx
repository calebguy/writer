import { WriterList } from "@/components/WriterList";
import { pickLogo } from "@/utils/random";

export default function Home() {
	return <WriterList loginLogo={pickLogo()} />;
}
