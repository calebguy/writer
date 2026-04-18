import SavedView from "@/components/SavedView";
import { pickLogo } from "@/utils/random";

export default function SavedPage() {
	return <SavedView loginLogo={pickLogo()} />;
}
