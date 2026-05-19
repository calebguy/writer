"use client";

import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import {
	type Writer,
	factoryCreate,
	getWriter,
	getWritersByManager,
	hideWriter as hideWriterApi,
	reorderWriters,
} from "@/utils/api";
import { GRID_SKELETON_COUNT, POLLING_INTERVAL } from "@/utils/constants";
import {
	applyWriterAddressOrder,
	swappedPersistedWriterOrder,
} from "@/utils/writerOrder";
import { usePrivy } from "@privy-io/react-auth";
import {
	useIsMutating,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import Link from "next/link";
import {
	type PointerEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import type { Hex } from "viem";
import CreateInput, { type CreateInputData } from "./CreateInput";
import { LoginPrompt } from "./LoginPrompt";
import { WriterCardSkeleton } from "./WriterCardSkeleton";
import { ClosedEye } from "./icons/ClosedEye";
import { MarkdownRenderer } from "./markdown/MarkdownRenderer";

const SKELETON_KEYS = Array.from(
	{ length: GRID_SKELETON_COUNT },
	(_, i) => `skeleton-${i}`,
);

type DragState = {
	pointerId: number;
	fromAddress: string;
	overAddress: string | null;
	x: number;
	y: number;
	offsetX: number;
	offsetY: number;
	width: number;
	height: number;
	title: string;
};

export function WriterList({ loginLogo }: { loginLogo: number }) {
	const { ready, authenticated, user, getAccessToken } = usePrivy();
	const isLoggedIn = useIsLoggedIn();
	const [isPolling, setIsPolling] = useState(false);
	const queryClient = useQueryClient();
	const [dragState, setDragState] = useState<DragState | null>(null);
	const dragStateRef = useRef<DragState | null>(null);
	const setActiveDrag = useCallback((next: DragState | null) => {
		dragStateRef.current = next;
		setDragState(next);
	}, []);

	const address = user?.wallet?.address;
	const isCreatingWriter =
		useIsMutating({ mutationKey: ["create-from-factory"] }) > 0;

	const { data: writers, isLoading } = useQuery({
		queryFn: ({ signal }) => getWritersByManager(address as Hex, signal),
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
				queryFn: ({ signal }) => getWriter(writerAddress as Hex, signal),
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

	const { mutate: persistWriterOrder } = useMutation({
		mutationFn: async (orderedAddresses: string[]) => {
			if (!address) throw new Error("No wallet address");
			const authToken = await getAccessToken();
			if (!authToken) throw new Error("Not authenticated");
			return reorderWriters({
				userAddress: address,
				addresses: orderedAddresses,
				authToken,
			});
		},
		mutationKey: ["reorder-writers", address],
		onMutate: async (orderedAddresses: string[]) => {
			if (!address) return { previousWriters: undefined as undefined };
			const queryKey = ["get-writers", address] as const;
			await queryClient.cancelQueries({ queryKey });
			const previousWriters = queryClient.getQueryData<Writer[]>(queryKey);

			queryClient.setQueryData<Writer[]>(queryKey, (current) =>
				applyWriterAddressOrder(current, orderedAddresses),
			);

			return { previousWriters, queryKey };
		},
		onError: (_error, _orderedAddresses, context) => {
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

	const reorderableWriterCount =
		writers?.reduce(
			(count, writer) => count + (writer.createdAtHash ? 1 : 0),
			0,
		) ?? 0;
	const canReorderWriters = reorderableWriterCount > 1;

	const getDropAddressAtPoint = useCallback(
		(x: number, y: number, fromAddress: string) => {
			const target = document
				.elementFromPoint(x, y)
				?.closest<HTMLElement>(
					'[data-home-writer-address][data-reorderable="true"]',
				);
			const targetAddress = target?.dataset.homeWriterAddress;
			if (
				!targetAddress ||
				targetAddress.toLowerCase() === fromAddress.toLowerCase()
			) {
				return null;
			}
			return targetAddress;
		},
		[],
	);

	const handleReorderPointerDown = useCallback(
		(event: PointerEvent<HTMLButtonElement>, writer: Writer) => {
			if (!writer.createdAtHash || !canReorderWriters) {
				return;
			}
			const card = event.currentTarget.closest<HTMLElement>(
				"[data-home-writer-address]",
			);
			if (!card) {
				return;
			}

			event.preventDefault();
			event.stopPropagation();
			event.currentTarget.setPointerCapture(event.pointerId);

			const rect = card.getBoundingClientRect();
			setActiveDrag({
				pointerId: event.pointerId,
				fromAddress: writer.address,
				overAddress: null,
				x: event.clientX,
				y: event.clientY,
				offsetX: event.clientX - rect.left,
				offsetY: event.clientY - rect.top,
				width: rect.width,
				height: rect.height,
				title: writer.title,
			});
		},
		[canReorderWriters, setActiveDrag],
	);

	const handleReorderPointerMove = useCallback(
		(event: PointerEvent<HTMLButtonElement>) => {
			const current = dragStateRef.current;
			if (!current || current.pointerId !== event.pointerId) {
				return;
			}
			event.preventDefault();
			event.stopPropagation();

			setActiveDrag({
				...current,
				x: event.clientX,
				y: event.clientY,
				overAddress: getDropAddressAtPoint(
					event.clientX,
					event.clientY,
					current.fromAddress,
				),
			});
		},
		[getDropAddressAtPoint, setActiveDrag],
	);

	const finishReorderDrag = useCallback(
		(event: PointerEvent<HTMLButtonElement>) => {
			const current = dragStateRef.current;
			if (!current || current.pointerId !== event.pointerId) {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			if (event.currentTarget.hasPointerCapture(event.pointerId)) {
				event.currentTarget.releasePointerCapture(event.pointerId);
			}
			setActiveDrag(null);

			if (!current.overAddress) {
				return;
			}
			const orderedAddresses = swappedPersistedWriterOrder(
				writers,
				current.fromAddress,
				current.overAddress,
			);
			if (orderedAddresses) {
				persistWriterOrder(orderedAddresses);
			}
		},
		[persistWriterOrder, setActiveDrag, writers],
	);

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
		const canReorderWriter = !isPendingWriter && canReorderWriters;
		const isDragging =
			dragState?.fromAddress.toLowerCase() === writer.address.toLowerCase();
		const isDropTarget =
			dragState?.overAddress?.toLowerCase() === writer.address.toLowerCase();

		return (
			<Link
				href={isPendingWriter ? "#" : `/writer/${writer.address}`}
				key={writer.address}
				data-home-writer-address={writer.address}
				data-reorderable={canReorderWriter ? "true" : undefined}
				className={`group/card home-writer-card aspect-square bg-surface flex flex-col overflow-hidden px-2 pt-2 pb-1.5 relative w-full rounded-xs transition-[opacity,transform,box-shadow] ${
					isPendingWriter ? "cursor-loading" : "hover:cursor-zoom-in"
				} ${isDragging ? "opacity-30" : ""} ${
					isDropTarget
						? "scale-[0.98] shadow-[0_0_0_2px_rgb(var(--color-primary))]"
						: ""
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
				{canReorderWriter && (
					<button
						type="button"
						aria-label="Drag to rearrange Place"
						title="Drag to rearrange"
						className="absolute bottom-0.5 left-0.5 z-20 flex h-6 w-6 touch-none cursor-grab items-center justify-center rounded-xs text-neutral-400 opacity-0 transition-opacity group-hover/card:opacity-40 hover:text-primary hover:opacity-100 focus-visible:text-primary focus-visible:opacity-100 active:cursor-grabbing"
						draggable={false}
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
						}}
						onPointerDown={(e) => handleReorderPointerDown(e, writer)}
						onPointerMove={handleReorderPointerMove}
						onPointerUp={finishReorderDrag}
						onPointerCancel={finishReorderDrag}
					>
						<span aria-hidden="true" className="grid grid-cols-2 gap-0.5">
							<span className="h-1 w-1 rounded-full bg-current" />
							<span className="h-1 w-1 rounded-full bg-current" />
							<span className="h-1 w-1 rounded-full bg-current" />
							<span className="h-1 w-1 rounded-full bg-current" />
						</span>
					</button>
				)}
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

	const renderDragPreview = () => {
		if (!dragState) {
			return null;
		}

		return (
			<div
				className="pointer-events-none fixed z-50 aspect-square overflow-hidden rounded-xs bg-surface px-2 pt-2 pb-1.5 shadow-[0_8px_32px_rgb(0_0_0/0.18),0_0_0_2px_rgb(var(--color-primary))]"
				style={{
					left: dragState.x - dragState.offsetX,
					top: dragState.y - dragState.offsetY,
					width: dragState.width,
					height: dragState.height,
				}}
			>
				<MarkdownRenderer
					markdown={dragState.title}
					className="text-black dark:text-white writer-title home-writer-content"
				/>
			</div>
		);
	};

	if (!inOnboardingFlow) {
		return (
			<>
				<div className="grid gap-2 grid-cols-1 min-[321px]:grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
					<div className="hidden lg:block">
						<CreateInput placeholder="Create a Place" onSubmit={handleSubmit} />
					</div>
					{writers?.map(renderWriterCard)}
				</div>
				{renderDragPreview()}
			</>
		);
	}

	// Onboarding: empty | creating | created. Same outer container for all
	// three so the central card never shifts position between states.
	return (
		<div className="grow flex flex-col items-center justify-center">
			<div className="hidden lg:block w-[234px] h-[234px]">
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
