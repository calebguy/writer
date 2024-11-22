import { usePrivy } from "@privy-io/react-auth";
import { useContext } from "react";
import { Link } from "react-router-dom";
import { HeaderContext } from "../layouts/App.layout";
import { cn } from "../utils/cn";
import { Button, ButtonVariant } from "./Button";
import { Blob } from "./icons/Blob";

export function Header() {
	const { ready, authenticated, login, logout } = usePrivy();
	const { headerContent, setHeaderContent } = useContext(HeaderContext);

	const isLoggedIn = ready && authenticated;

	return (
		<div className="flex">
			<div className="flex justify-between items-center w-full">
				<div className="flex items-end gap-2">
					<Link
						onClick={() => setHeaderContent(null)}
						to="/"
						className={cn(
							"text-3xl active:-translate-x-[1px] active:translate-y-[1px]",
							{
								"text-lime": isLoggedIn,
								"text-neutral-500": !isLoggedIn,
							},
						)}
					>
						{headerContent ?? "Writer"}
					</Link>
				</div>
				<Button
					bounce
					variant={ButtonVariant.Empty}
					onClick={() => {
						if (isLoggedIn) {
							logout();
						} else {
							login();
						}
					}}
				>
					<Blob
						className={cn("h-8", {
							"text-lime": isLoggedIn,
							"text-neutral-500": !isLoggedIn,
						})}
					/>
				</Button>
			</div>
		</div>
	);
}
