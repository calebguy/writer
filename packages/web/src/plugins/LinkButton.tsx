import { cn } from "@/utils/cn";

export const LinkButton: React.FC<{
	children: React.ReactNode;
	onClick: () => void;
	className?: string;
	disabled?: boolean;
}> = ({ children, onClick, className, disabled }) => {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={cn(
				"bg-neutral-900 p-1 text-xs font-medium hover:bg-neutral-800 focus:outline-none cursor-pointer",
				className,
			)}
		>
			{children}
		</button>
	);
};
