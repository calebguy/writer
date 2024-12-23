import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";
import { useContext, useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import type { Hex } from "viem";
import { WriterContext } from "../layouts/App.layout";
import { getWriter } from "../utils/api";
import { cn } from "../utils/cn";
import { Button, ButtonVariant } from "./Button";
import { Blob } from "./icons/Blob";

export function Header() {
	const { ready, authenticated, login, logout } = usePrivy();
	const location = useLocation();
	const { address, id } = useParams();
	const { writer } = useContext(WriterContext);
	const isLoggedIn = ready && authenticated;

	// @note the only reason to keep context around is so we can push to it onClicks
	// or else where in the app. relying on useQuery's cache may be a better option
	const { setWriter } = useContext(WriterContext);

	const { data } = useQuery({
		queryFn: () => getWriter(address as Hex),
		queryKey: ["get-writer", address],
		enabled: !!address,
	});

	useEffect(() => {
		if (data) {
			setWriter(data);
		}
	}, [data, setWriter]);

	let title = "Writer";
	if (location.pathname === "/") {
		title = "Writer";
	} else if (writer) {
		if (id) {
			title = `${writer.title} - ${id}`;
		} else {
			title = writer.title;
		}
	}

	let to = "/";
	if (address && id) {
		to = `/writer/${address}`;
	} else if (address && location.pathname.includes("create")) {
		to = `/writer/${address}`;
	}

	return (
		<div className="flex mb-10">
			<div className="flex justify-between items-center w-full">
				<div className="flex items-end gap-2">
					<Link
						to={to}
						className={cn(
							"text-3xl active:-translate-x-[1px] active:translate-y-[1px]",
							{
								"text-lime": isLoggedIn,
								"text-neutral-500": !isLoggedIn,
							},
						)}
					>
						{title}
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
