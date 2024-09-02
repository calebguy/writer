import { usePrivy } from "@privy-io/react-auth";
import { useState } from "react";
import { cn } from "../utils/cn";
import { Button, ButtonVariant } from "./Button";
import { Blob } from "./icons/Blob";

export function Header() {
	const { ready, authenticated, login, logout } = usePrivy();
	const isLoggedIn = ready && authenticated;

	const [open, setOpen] = useState(false);

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
				<h1
					className={cn("text-4xl", {
						"text-lime": isLoggedIn,
						"text-neutral-500": !isLoggedIn,
					})}
				>
					Writer
				</h1>
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
