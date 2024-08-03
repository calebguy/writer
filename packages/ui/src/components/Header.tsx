import { usePrivy } from "@privy-io/react-auth";
import { cn } from "../utils/cn";
import { Blob } from "./Blob";
import { Button, ButtonVariant } from "./Button";

export function Header() {
	const { ready, authenticated, login, logout } = usePrivy();
	const isLoggedIn = ready && authenticated;

	return (
		<div className="flex">
			<div className="flex flex-col justify-center">
				<Button
					className={cn(
						"active:-translate-x-[1px]",
						"active:translate-y-[1px]",
					)}
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
						className={cn("h-10", {
							"text-lime": isLoggedIn,
							"text-neutral-500": !isLoggedIn,
						})}
					/>
				</Button>
				{/* <div className="text-xxs" style={{ fontSize: 8 }}>
					{isLoggedIn ? "ON" : "OFF"}
				</div> */}
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
		</div>
	);
}
