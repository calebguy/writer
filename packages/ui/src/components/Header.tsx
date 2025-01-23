import { useLogin, usePrivy } from "@privy-io/react-auth";
import { useContext, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { WriterContext } from "../layouts/App.layout";
import { cn } from "../utils/cn";
import { Button, ButtonVariant } from "./Button";
import { Dropdown, DropdownItem } from "./Dropdown";
import { MD } from "./MD";
import { Modal } from "./Modal";
import { Arrow } from "./icons/Arrow";
import { Blob } from "./icons/Blob";

export function Header() {
	const { login } = useLogin({
		onComplete: () => {
			console.log("login complete, call GET /me");
		},
	});
	const { ready, authenticated, logout } = usePrivy();
	const location = useLocation();
	const { address, id } = useParams();
	const { writer } = useContext(WriterContext);
	const isLoggedIn = ready && authenticated;

	const [open, setOpen] = useState(false);

	const isEntry = useMemo(() => {
		return writer && id;
	}, [writer, id]);

	let title = "Writer";
	if (location.pathname === "/") {
		title = "Writer";
	} else if (writer) {
		if (id) {
			title = `${writer.title}: ${id}`;
		} else {
			title = writer.title;
		}
	}

	let to = "/";
	if (location.pathname.includes("account")) {
		to = "/";
	} else if (address && id) {
		to = `/writer/${address}`;
	} else if (address && location.pathname.includes("create")) {
		to = `/writer/${address}`;
	}

	return (
		<div className="flex mb-10 header">
			<div className="flex justify-between items-center w-full">
				<div className="flex items-end gap-2">
					<Link
						to={to}
						className={cn(
							"text-3xl active:-translate-x-[1px] active:translate-y-[1px]",
							{
								"text-primary": isLoggedIn,
								"text-neutral-500": !isLoggedIn,
							},
						)}
						style={{ overflowWrap: "anywhere" }}
					>
						<div className="flex items-center gap-2">
							{(writer || id) && location.pathname !== "/" && (
								<Arrow className="w-6 h-6 -rotate-[135deg]" />
							)}
							{!id && <MD>{title}</MD>}
						</div>
					</Link>
				</div>
				{!authenticated && (
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
								"text-primary": isLoggedIn,
								"text-neutral-500": !isLoggedIn,
							})}
						/>
					</Button>
				)}

				{authenticated && (
					<Dropdown
						trigger={
							<Blob
								className={cn("h-8", {
									"text-primary": isLoggedIn,
									"text-neutral-500": !isLoggedIn,
								})}
							/>
						}
					>
						<DropdownItem onClick={() => setOpen(true)}>
							<div className="flex items-center justify-between gap-2 w-full">
								<span>Color</span>
								<span className="w-2 h-2 bg-primary" />
							</div>
						</DropdownItem>
						<DropdownItem onClick={() => logout()}>Sign Out</DropdownItem>
					</Dropdown>
				)}
				<Modal open={open} onClose={() => setOpen(false)} />
			</div>
		</div>
	);
}
