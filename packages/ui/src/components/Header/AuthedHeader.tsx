import { usePrivy } from "@privy-io/react-auth";
import { useContext, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { WriterContext } from "../../context";
import { cn } from "../../utils/cn";
import { ColorModal } from "../ColorModal";
import { Dropdown, DropdownItem } from "../Dropdown";
import { Arrow } from "../icons/Arrow";
import { Blob } from "../icons/Blob";
import { MD } from "../markdown/MD";

export function AuthedHeader() {
	const { ready, authenticated, logout } = usePrivy();
	const location = useLocation();
	const { address, id } = useParams();
	const [open, setOpen] = useState(false);
	const { writer } = useContext(WriterContext);
	const isLoggedIn = ready && authenticated;

	let title: string | undefined = "Writer";
	let to = "/";
	if (location.pathname === "/") {
		title = "Writer";
	} else if (location.pathname.includes("account")) {
		title = address;
		to = "/";
	} else if (address) {
		if (location.pathname.includes("create")) {
			to = `/writer/${address}`;
			title = writer?.title;
		} else if (id) {
			title = `${writer?.title}: ${id}`;
			to = `/writer/${address}`;
		} else {
			title = writer?.title;
			to = "/";
		}
	}

	return (
		<div className="flex mb-10 header">
			<div className="flex justify-between items-center w-full">
				<div className="flex items-end gap-2">
					<div className="flex items-center gap-2 italic">
						{(writer || id) && location.pathname !== "/" && (
							<Link
								to={to}
								className={cn("text-3xl transition-colors", {
									"text-primary": isLoggedIn,
									"text-secondary": !isLoggedIn,
								})}
								style={{ overflowWrap: "anywhere" }}
							>
								<Arrow className="w-6 h-6 -rotate-[135deg]" />
							</Link>
						)}
						{!id && (
							<MD className="text-3xl transition-colors text-primary pr-0.5">
								{title}
							</MD>
						)}
					</div>
				</div>
				{/* {!authenticated && (
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
							className={cn("h-8 transition-colors", {
								"text-primary": isLoggedIn,
								"text-secondary hover:text-primary": !isLoggedIn,
							})}
						/>
					</Button>
				)} */}

				<Dropdown
					trigger={
						<Blob
							className={cn("h-8 transition-colors", {
								"text-primary": isLoggedIn,
								"text-secondary": !isLoggedIn,
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
				<ColorModal open={open} onClose={() => setOpen(false)} />
			</div>
		</div>
	);
}
