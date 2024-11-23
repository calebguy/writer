import { useParams } from "react-router";

export default function Entry() {
	const { address, id } = useParams();
	console.log(address, id);
	return (
		<div>
			<div>
				{address}, {id}
			</div>
		</div>
	);
}
