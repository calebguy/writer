import { useLogin, usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";
import { useContext, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { WriterContext } from "../layouts/App.layout";
import { getMe } from "../utils/api";
import { cn } from "../utils/cn";
import color from "../utils/color";
import { Button, ButtonVariant } from "./Button";
import { Dropdown, DropdownItem } from "./Dropdown";
import { MD } from "./MD";
import { Modal } from "./Modal";
import { Arrow } from "./icons/Arrow";
import { Blob } from "./icons/Blob";

export function Header() {
	const { ready, authenticated, logout } = usePrivy();
	const location = useLocation();
	const { address, id } = useParams();
	const { writer } = useContext(WriterContext);
	const isLoggedIn = ready && authenticated;

	const { data } = useQuery({
		queryKey: ["me"],
		queryFn: () => getMe(),
		enabled: isLoggedIn,
	});

	useEffect(() => {
		if (data?.user?.color) {
			color.setColorFromLongHex(data.user.color);
		} else {
			color.setColorFromRGB(color.defaultColor);
		}
	}, [data]);

	const { login } = useLogin({
		onComplete: (user) => {
			console.log("login complete, call GET /me", user);
		},
	});

	const [open, setOpen] = useState(false);

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
						<DropdownItem onClick={() => logout()}>Leave</DropdownItem>
					</Dropdown>
				)}
				<Modal open={open} onClose={() => setOpen(false)} />
			</div>
		</div>
	);
}
