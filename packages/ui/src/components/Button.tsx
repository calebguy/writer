import { usePrivy } from "@privy-io/react-auth";
import { cn } from "../utils/cn";

export enum ButtonVariant {
	Primary = "primary",
	Secondary = "secondary",
	Empty = "empty",
	LimeHover = "lime-hover",
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	bounce?: boolean;
}

const baseStyles = cn("inline", "px-2", "py-1", "outline-none", "text-white");

const classes = {
	[ButtonVariant.Primary]: cn(
		baseStyles,
		"bg-neutral-700",
		"hover:bg-neutral-900",
		"disabled:bg-neutral-800",
	),
	[ButtonVariant.Secondary]: cn(baseStyles, "bg-black"),
	[ButtonVariant.Empty]: "outline-none",
	[ButtonVariant.LimeHover]: cn(
		baseStyles,
		"bg-neutral-800",
		"hover:bg-lime",
		"hover:text-black",
		"disabled:bg-neutral-800",
		"disabled:hover:text-white",
	),
};

export function Button({
	variant = ButtonVariant.Primary,
	bounce,
	className,
	...props
}: ButtonProps) {
	return (
		<button
			{...props}
			className={cn(className, classes[variant], {
				"active:-translate-x-[1px] active:translate-y-[1px]": bounce,
			})}
		/>
	);
}

export function AuthButton() {
	const { ready, authenticated, login, logout } = usePrivy();
	const disableLogin = !ready || (ready && authenticated);
	const disableLogout = !ready || (ready && !authenticated);
	return (
		<div className="text-xs">
			{authenticated ? (
				<Button type="button" disabled={disableLogout} onClick={logout}>
					out
				</Button>
			) : (
				<Button type="button" disabled={disableLogin} onClick={login}>
					in
				</Button>
			)}
		</div>
	);
}
