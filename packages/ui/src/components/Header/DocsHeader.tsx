import { Github } from "../icons/Github";

import { Link } from "react-router-dom";
import { GITHUB_URL } from "../../constants";

export function DocsHeader() {
	return (
		<div className="flex justify-between items-center">
			<div className="flex items-center gap-1.5 text-3xl">
				<Link to="/">
					<span className="text-secondary hover:text-primary transition-colors italic pr-0.5">
						Writer
					</span>
				</Link>
				<span className="text-primary">Docs</span>
			</div>
			<Link
				to={GITHUB_URL}
				target="_blank"
				rel="noreferrer noopener"
				className="text-neutral-600 hover:text-primary"
			>
				<Github className="w-6 h-6" />
			</Link>
		</div>
	);
}
