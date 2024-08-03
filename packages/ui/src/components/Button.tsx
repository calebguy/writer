import { cn } from "../utils/cn";

export enum ButtonVariant {
	Primary = "primary",
	Secondary = "secondary",
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
}

const baseStyles = cn("inline", "px-2", "py-1");

const className = {
	[ButtonVariant.Primary]: cn("bg-neutral-700"),
	[ButtonVariant.Secondary]: cn("bg-black"),
};

export function Button({
	variant = ButtonVariant.Primary,
	...props
}: ButtonProps) {
	return <button {...props} className={cn(baseStyles, className[variant])} />;
}
