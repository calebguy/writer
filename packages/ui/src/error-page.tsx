import { useRouteError } from "react-router-dom";

export default function ErrorPage() {
	const error = useRouteError();
	console.error(error);

	return (
		<div className="flex-grow flex items-center justify-center">
			<div className="flex flex-col">
				<div className="text-lg">Not Found</div>
			</div>
		</div>
	);
}
