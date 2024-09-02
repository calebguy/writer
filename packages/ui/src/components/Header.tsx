import { usePrivy } from "@privy-io/react-auth";
import { Link } from "react-router-dom";
import { cn } from "../utils/cn";
import { Button, ButtonVariant } from "./Button";
import { Blob } from "./icons/Blob";

export function Header() {
	const { ready, authenticated, login, logout } = usePrivy();
	const isLoggedIn = ready && authenticated;

	return (
		<div className="flex">
			<div className="flex flex-col justify-center items-center">
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
						className={cn("h-9", {
							"text-lime": isLoggedIn,
							"text-neutral-500": !isLoggedIn,
						})}
					/>
				</Button>
			</div>

			<div className="flex flex-col grow">
				<Link
					to="/"
					className={cn("text-4xl", {
						"text-lime": isLoggedIn,
						"text-neutral-500": !isLoggedIn,
					})}
				>
					Writer
				</Link>
			</div>

			{/* {authenticated && (
				<>
					<Button
						bounce
						onClick={() => setOpen(true)}
						variant={ButtonVariant.Empty}
					>
						<Plus className="w-3 text-lime" />
					</Button>
					<Drawer open={open} setOpen={setOpen}>
						<div>.</div>
					</Drawer>
				</>
			)} */}
		</div>
	);
}
