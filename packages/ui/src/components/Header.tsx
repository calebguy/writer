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
			<div className="flex justify-between items-center w-full">
				<Link
					to="/"
					className={cn("text-3xl active:-translate-x-[1px] active:translate-y-[1px]", {
						"text-lime": isLoggedIn,
						"text-neutral-500": !isLoggedIn,
					})}
				>
					Writer
				</Link>
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
