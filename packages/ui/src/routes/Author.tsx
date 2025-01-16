import { useParams } from "react-router-dom";

export function Author() {
	const { address } = useParams();
	return <div>this is an ACCOUNT {address}</div>;
}
