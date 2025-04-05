import { useLogin } from "@privy-io/react-auth";

export default function UnauthedHome() {
	const { login } = useLogin();

	return (
		<div className="grow flex justify-center items-center">
			<div className="flex flex-col gap-4 items-center">
				<div className="text-6xl md:text-8xl text-primary italic">Writer</div>
				<button
					type="button"
					className="bg-neutral-900 text-primary px-4 py-2"
					onClick={() => login()}
				>
					Open
				</button>
			</div>
		</div>
	);
}
