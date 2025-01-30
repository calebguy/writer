import { Link } from "react-router-dom";
import { Github } from "./icons/Github";
export function Footer() {
	return (
		<div className="flex justify-end items-center text-neutral-500 space-x-1.5">
			<Link
				target="_blank"
				rel="noopener noreferrer"
				to="https://github.com/calebguy/writer"
				className="text-neutral-600 hover:text-primary mb-1"
			>
				<Github className="w-5 h-5" />
			</Link>
			<Link to="/docs" className="text-neutral-600 hover:text-primary text-lg">
				Docs
			</Link>
		</div>
	);
}
