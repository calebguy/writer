"use client";

import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import {
	type Writer,
	factoryCreate,
	getWriter,
	getWritersByManager,
	hideWriter as hideWriterApi,
} from "@/utils/api";
import { POLLING_INTERVAL } from "@/utils/constants";
import { usePrivy } from "@privy-io/react-auth";
import {
	useIsMutating,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import type { Hex } from "viem";
import CreateInput, { type CreateInputData } from "./CreateInput";
import { LoginPrompt } from "./LoginPrompt";
import { WriterCardSkeleton } from "./WriterCardSkeleton";
import { ClosedEye } from "./icons/ClosedEye";
import { MarkdownRenderer } from "./markdown/MarkdownRenderer";
const MDX = dynamic(() => import("./markdown/MDX"), { ssr: false });

const SKELETON_COUNT = 15;
const SKELETON_KEYS = Array.from(
	{ length: SKELETON_COUNT },
	(_, i) => `skeleton-${i}`,
);

export function WriterList({ loginLogo }: { loginLogo: number }) {
	const { ready, authenticated, user, getAccessToken } = usePrivy();
	const isLoggedIn = useIsLoggedIn();
	const [isPolling, setIsPolling] = useState(false);
	const queryClient = useQueryClient();

	const address = user?.wallet?.address;
	const isCreatingWriter =
		useIsMutating({ mutationKey: ["create-from-factory"] }) > 0;

	const { data: writers, isLoading } = useQuery({
		queryFn: () => getWritersByManager(address as Hex),
		queryKey: ["get-writers", address],
		enabled: !!address && authenticated,
		refetchInterval: isPolling && !isCreatingWriter ? POLLING_INTERVAL : false,
	});

	// Client-only onboarding flow for first-time (or back-to-zero) users.
	// Turns on whenever writers.length === 0, holds the centered hero layout
	// across empty → creating → created (so the CreateInput never visibly
	// relocates), and only turns off when the user clicks "Create More" or
	// navigates / reloads. Deleting every writer re-triggers onboarding.
	const [inOnboardingFlow, setInOnboardingFlow] = useState(false);
	const inOnboardingRef = useRef(false);
	useEffect(() => {
		inOnboardingRef.current = inOnboardingFlow;
	}, [inOnboardingFlow]);
	useEffect(() => {
		if (!ready || isLoading) return;
		// `writers` is undefined both while the query is disabled (Privy not
		// fully hydrated yet) and while it's loading. Only trigger onboarding
		// once the query has actually resolved to an empty array — otherwise
		// users with existing writers get flashed into the centered layout
		// during the Privy-hydrating gap and the flag goes sticky there.
		if (!writers) return;
		if (writers.length === 0 && !inOnboardingFlow) {
			setInOnboardingFlow(true);
		}
	}, [ready, isLoading, writers, inOnboardingFlow]);

	// During onboarding we intentionally wait for the on-chain confirmation
	// (createdAtHash) before switching to "created" — the CreateInput stays
	// in its loading state for the whole wait.
	const confirmedFirstWriter = useMemo(
		() => writers?.find((w) => !!w.createdAtHash) ?? null,
		[writers],
	);

	// Sticky "creating" flag to avoid a flash of the empty state in the gap
	// between `/create` returning 201 and the writers query refetching the
	// new pending row. Set on submit (in onboarding), cleared on mutation
	// error or when the user exits onboarding. `confirmedFirstWriter` moves
	// us to "created" regardless, so we don't need to clear on success.
	const [hasSubmittedInOnboarding, setHasSubmittedInOnboarding] =
		useState(false);

	type OnboardingMode = "empty" | "creating" | "created";
	const hasServerPendingFirstWriter =
		(writers?.length ?? 0) > 0 && !confirmedFirstWriter;
	const onboardingMode: OnboardingMode = confirmedFirstWriter
		? "created"
		: isCreatingWriter ||
				hasServerPendingFirstWriter ||
				hasSubmittedInOnboarding
			? "creating"
			: "empty";

	const handleCreateMore = useCallback(() => {
		setInOnboardingFlow(false);
		inOnboardingRef.current = false;
		setHasSubmittedInOnboarding(false);
	}, []);

	// Prefetch writer data on hover for instant navigation
	const prefetchWriter = useCallback(
		(writerAddress: string) => {
			queryClient.prefetchQuery({
				queryKey: ["writer", writerAddress],
				queryFn: () => getWriter(writerAddress as Hex),
				staleTime: 30 * 1000,
			});
		},
		[queryClient],
	);

	const { mutateAsync: hideWriter } = useMutation({
		mutationFn: async (writerAddress: Hex | string) => {
			const authToken = await getAccessToken();
			if (!authToken) throw new Error("Not authenticated");
			return hideWriterApi({ address: writerAddress, authToken });
		},
		mutationKey: ["hide-writer"],
		onMutate: async (writerAddress: Hex | string) => {
			if (!address) return { previousWriters: undefined as undefined };
			const queryKey = ["get-writers", address] as const;
			await queryClient.cancelQueries({ queryKey });
			const previousWriters = queryClient.getQueryData<Writer[]>(queryKey);

			queryClient.setQueryData<Writer[]>(queryKey, (current) =>
				(current ?? []).filter(
					(writer) =>
						writer.address.toLowerCase() !== writerAddress.toLowerCase(),
				),
			);

			return { previousWriters, queryKey };
		},
		onError: (_error, _writerAddress, context) => {
			if (!context?.queryKey) return;
			queryClient.setQueryData(context.queryKey, context.previousWriters);
		},
		onSettled: () => {
			if (!address) return;
			queryClient.invalidateQueries({ queryKey: ["get-writers", address] });
		},
	});
	const { mutateAsync: createWriter } = useMutation({
		mutationFn: factoryCreate,
		mutationKey: ["create-from-factory"],
		onMutate: async (vars) => {
			const queryKey = ["get-writers", address] as const;
			await queryClient.cancelQueries({ queryKey });
			// During onboarding we skip the optimistic insert: the CreateInput
			// stays in its loading state until the server confirms the writer
			// on-chain, at which point the centered card transitions to the
			// "created" mode. The normal hasWriters flow keeps its optimistic
			// insert for fast feedback.
			if (inOnboardingRef.current) {
				return { previous: undefined, queryKey: undefined };
			}
			const tempAddress = `pending-${Date.now()}`;
			const now = new Date();
			const optimistic = {
				address: tempAddress,
				storageAddress: tempAddress,
				storageId: tempAddress,
				publicWritable: false,
				legacyDomain: false,
				title: vars.title,
				admin: String(vars.admin),
				managers: (vars.managers as string[]).map(String),
				createdAtHash: null,
				createdAtBlock: undefined,
				createdAtBlockDatetime: null,
				createdAt: now,
				updatedAt: now,
				deletedAt: null,
				transactionId: null,
				entries: [],
			} as unknown as Writer;
			const previous = queryClient.getQueryData<Writer[]>(queryKey);
			queryClient.setQueryData<Writer[]>(queryKey, (current) =>
				current ? [optimistic, ...current] : [optimistic],
			);
			return { previous, queryKey };
		},
		onError: (_err, _vars, ctx) => {
			if (ctx?.queryKey) {
				queryClient.setQueryData(ctx.queryKey, ctx.previous);
			}
			setHasSubmittedInOnboarding(false);
		},
		onSettled: () => {
			if (!address) return;
			queryClient.invalidateQueries({ queryKey: ["get-writers", address] });
		},
	});

	const handleSubmit = async ({ markdown }: CreateInputData) => {
		if (!address) {
			return;
		}
		const authToken = await getAccessToken();
		if (!authToken) {
			console.error("No auth token found");
			return;
		}
		if (inOnboardingRef.current) {
			setHasSubmittedInOnboarding(true);
		}
		await createWriter({
			title: markdown,
			admin: address as Hex,
			managers: [address as Hex],
			authToken,
		});
	};

	const hasPendingWriters =
		writers?.some((writer) => !writer.createdAtHash) ?? false;

	useEffect(() => {
		if (isPolling || !writers || writers.length === 0) {
			return;
		}

		if (hasPendingWriters) {
			setIsPolling(true);
		}
	}, [isPolling, writers, hasPendingWriters]);

	useEffect(() => {
		if (!isPolling || !writers || writers.length === 0) {
			return;
		}

		if (!hasPendingWriters) {
			setIsPolling(false);
		}
	}, [isPolling, writers, hasPendingWriters]);

	if (!isLoggedIn) {
		return <LoginPrompt toWhat="write" logo={loginLogo} />;
	}

	if (!ready || isLoading) {
		return (
			<div className="grid gap-2 grid-cols-1 min-[321px]:grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
				{SKELETON_KEYS.map((key) => (
					<WriterCardSkeleton key={key} />
				))}
			</div>
		);
	}

	const renderWriterCard = (writer: Writer) => {
		const isPendingWriter = !writer.createdAtHash;
		return (
			<Link
				href={isPendingWriter ? "#" : `/writer/${writer.address}`}
				key={writer.address}
				className={`home-writer-card aspect-square bg-surface flex flex-col overflow-hidden px-2 pt-2 pb-1.5 relative w-full ${
					isPendingWriter ? "cursor-loading" : "hover:cursor-zoom-in"
				}`}
				onClick={isPendingWriter ? (e) => e.preventDefault() : undefined}
				onMouseEnter={
					isPendingWriter ? undefined : () => prefetchWriter(writer.address)
				}
			>
				<div className="grow min-h-0 min-w-0 overflow-y-auto">
					<MarkdownRenderer
						markdown={writer.title}
						className="text-black dark:text-white writer-title home-writer-content"
					/>
				</div>
				<div className="writer-card-meta shrink-0 text-right text-sm text-neutral-400 dark:text-neutral-600 leading-3 pt-2">
					<div
						className={
							isPendingWriter
								? "inline-block"
								: "group home-hide-group inline-block"
						}
					>
						{isPendingWriter ? (
							<span className="pending-entry-spinner inline-flex ml-auto">
								<span className="pending-entry-spinner-track" />
								<AiOutlineLoading3Quarters className="pending-entry-spinner-icon w-3 h-3 rotating" />
							</span>
						) : (
							<>
								<span className="group-hover:hidden block">
									{writer.entries.length.toString()}
								</span>
								<button
									type="button"
									className="group-hover:block hidden ml-auto absolute bottom-1.5 right-2 z-10 text-primary hover:text-primary cursor-pointer"
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										hideWriter(writer.address as Hex);
									}}
								>
									<ClosedEye className="w-4 h-4" />
								</button>
								<div className="absolute left-0 top-0 w-full h-full bg-surface-overlay/90 hidden group-hover:flex items-center justify-center pointer-events-none">
									<span className="text-primary italic">Hide?</span>
								</div>
							</>
						)}
					</div>
				</div>
			</Link>
		);
	};

	if (!inOnboardingFlow) {
		return (
			<div className="grid gap-2 grid-cols-1 min-[321px]:grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
				<div className="hidden md:block">
					<CreateInput placeholder="Create a Place" onSubmit={handleSubmit} />
				</div>
				{writers?.map(renderWriterCard)}
			</div>
		);
	}

	// Onboarding: empty | creating | created. Same outer container for all
	// three so the central card never shifts position between states.
	return (
		<div className="grow flex flex-col items-center justify-center">
			<div className="hidden md:block w-[234px] h-[234px]">
				{onboardingMode === "created" && confirmedFirstWriter ? (
					renderWriterCard(confirmedFirstWriter)
				) : (
					<CreateInput
						placeholder="Create a Place"
						onSubmit={handleSubmit}
						isLoading={onboardingMode === "creating"}
					/>
				)}
			</div>
			<div className="mt-4 flex flex-col items-center gap-1 font-serif italic text-base">
				{onboardingMode === "empty" && (
					<span className="text-neutral-500 dark:text-neutral-400">
						Create your first Place
					</span>
				)}
				{onboardingMode === "creating" && (
					<span className="text-neutral-500 dark:text-neutral-400">
						Creating your first Place
					</span>
				)}
				{onboardingMode === "created" && confirmedFirstWriter && (
					<>
						<Link
							href={`/writer/${confirmedFirstWriter.address}`}
							className="hover:text-primary transition-opacity text-neutral-500"
						>
							View your Place
						</Link>
						<button
							type="button"
							onClick={handleCreateMore}
							className="hover:text-primary transition-opacity cursor-pointer text-neutral-500"
						>
							Create More
						</button>
					</>
				)}
			</div>
		</div>
	);
}
