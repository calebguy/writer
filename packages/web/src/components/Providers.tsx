"use client";

import { UnsavedChangesConfirmModal } from "@/components/UnsavedChangesConfirmModal";
import { useAuthTheme } from "@/hooks/useAuthTheme";
import {
	AuthHintContext,
	NavigationContext,
	UNSAVED_CHANGES_TITLE,
	UnsavedChangesContext,
	type UnsavedChangesPrompt,
	type UnsavedChangesRegistration,
	WriterContext,
	type WriterContextType,
	defaultColor,
} from "@/utils/context";
import {
	applyThemeMode,
	clearStoredCustomBackgroundColor,
	clearStoredPrimaryColor,
	getStoredCustomBackgroundColor,
	getStoredPrimaryColor,
	onThemeChange,
	setStoredCustomBackgroundColor,
	setStoredPrimaryColor,
	setStoredThemeMode,
	subscribeSystemThemeChange,
} from "@/utils/theme";
import {
	RGBToHex,
	bytes32ToHexColor,
	clearInlinePrimaryAndSecondary,
	hexToRGB,
	readCSSRgbVariable,
	setPrimaryAndSecondaryCSSVariables,
} from "@/utils/utils";
import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { optimism } from "viem/chains";

import { env } from "@/utils/env";
import { usePathname, useRouter } from "next/navigation";
const UNSAVED_CHANGES_HISTORY_MARKER = "__writerUnsavedGuard";

function normalizeUnsavedPrompt(
	prompt: UnsavedChangesRegistration = UNSAVED_CHANGES_TITLE,
): UnsavedChangesPrompt {
	if (typeof prompt === "string") return { title: prompt };
	return prompt;
}

function createUnsavedHistoryState(state: unknown) {
	if (state && typeof state === "object") {
		return {
			...(state as Record<string, unknown>),
			[UNSAVED_CHANGES_HISTORY_MARKER]: true,
		};
	}

	return { [UNSAVED_CHANGES_HISTORY_MARKER]: true };
}

function getBaseWriterAddress(pathname: string): string | null {
	const segments = pathname.split("/").filter(Boolean);
	if (segments.length !== 2 || segments[0] !== "writer") {
		return null;
	}
	return segments[1]?.toLowerCase() ?? null;
}

function getEntryWriterAddress(pathname: string): string | null {
	const segments = pathname.split("/").filter(Boolean);
	if (segments.length !== 3 || segments[0] !== "writer") {
		return null;
	}
	return segments[1]?.toLowerCase() ?? null;
}

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 30 * 1000, // 30 seconds before data is considered stale
			gcTime: 10 * 60 * 1000, // 10 minutes cache retention
			refetchOnWindowFocus: false, // Don't refetch on tab focus
		},
	},
});

export function Providers({
	children,
	initialColor,
	initialLoggedIn = false,
}: Readonly<{
	children: React.ReactNode;
	initialColor?: string;
	initialLoggedIn?: boolean;
}>) {
	const [writer, setWriter] = useState<WriterContextType["writer"]>(null);
	const pathname = usePathname();
	const previousPathnameRef = useRef<string | null>(null);
	const [previousPathname, setPreviousPathname] = useState<string | null>(null);
	const [writerCameFromExplore, setWriterCameFromExplore] = useState<
		Record<string, boolean>
	>({});

	const getInitialColor = () => {
		const storedPrimaryColor = getStoredPrimaryColor();
		if (storedPrimaryColor) return storedPrimaryColor;
		if (initialColor) {
			try {
				return hexToRGB(bytes32ToHexColor(initialColor));
			} catch {
				return defaultColor;
			}
		}
		return defaultColor;
	};

	const [primaryColor, setPrimaryColor] = useState<
		WriterContextType["primaryColor"]
	>(getInitialColor());
	const [customBackgroundColor, setCustomBackgroundColor] = useState<
		WriterContextType["customBackgroundColor"]
	>(() => getStoredCustomBackgroundColor());
	const [hasUserColor, setHasUserColor] = useState<boolean>(
		() => !!initialColor || !!getStoredPrimaryColor(),
	);
	const hasUserColorRef = useRef<boolean>(
		!!initialColor || !!getStoredPrimaryColor(),
	);

	useEffect(() => {
		const previousRoute = previousPathnameRef.current;
		if (previousRoute === pathname) {
			return;
		}
		setPreviousPathname(previousRoute);
		const writerAddress = getBaseWriterAddress(pathname);
		if (writerAddress) {
			const cameFromWriterEntry =
				getEntryWriterAddress(previousRoute ?? "") === writerAddress;

			if (!cameFromWriterEntry) {
				setWriterCameFromExplore((current) => ({
					...current,
					[writerAddress]: previousRoute === "/explore",
				}));
			}
		}

		previousPathnameRef.current = pathname;
	}, [pathname]);

	// Apply inline CSS variables only when the user has explicitly chosen a color.
	// When no color is chosen, the stylesheet's --color-*-default values drive
	// --color-primary/--color-secondary and track data-theme automatically.
	useEffect(() => {
		if (hasUserColor) {
			setPrimaryAndSecondaryCSSVariables(primaryColor);
		}
	}, [primaryColor, hasUserColor]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const mode = getStoredCustomBackgroundColor() ? "custom" : "system";
		setStoredThemeMode(mode);
		applyThemeMode(mode);
		if (mode === "custom") return;
		return subscribeSystemThemeChange(() => {
			applyThemeMode("system");
		});
	}, []);

	// When the user has no explicit color, keep React state in sync with the
	// themed default so consumers (Privy accentColor, swatches, etc.) react to
	// light/dark toggles.
	useEffect(() => {
		hasUserColorRef.current = hasUserColor;
	}, [hasUserColor]);

	useEffect(() => {
		if (hasUserColor) return;
		const sync = () => {
			if (hasUserColorRef.current) return;
			const rgb = readCSSRgbVariable("--color-primary-default");
			if (rgb) setPrimaryColor(rgb);
		};
		sync();
		return onThemeChange(sync);
	}, [hasUserColor]);

	const handleSetPrimaryColor = useCallback(
		(rgb: WriterContextType["primaryColor"]) => {
			hasUserColorRef.current = true;
			setHasUserColor(true);
			setPrimaryColor(rgb);
			setPrimaryAndSecondaryCSSVariables(rgb);
			setStoredPrimaryColor(rgb);
		},
		[],
	);

	const handleSetPrimaryFromLongHex = useCallback((hex: string) => {
		const rgb = hexToRGB(bytes32ToHexColor(hex));
		hasUserColorRef.current = true;
		setHasUserColor(true);
		setPrimaryColor(rgb);
		setPrimaryAndSecondaryCSSVariables(rgb);
		setStoredPrimaryColor(rgb);
	}, []);

	const handleSetCustomBackgroundColor = useCallback(
		(rgb: WriterContextType["customBackgroundColor"]) => {
			setCustomBackgroundColor(rgb);
			if (rgb) {
				setStoredCustomBackgroundColor(rgb);
				setStoredThemeMode("custom");
				applyThemeMode("custom");
				return;
			}
			clearStoredCustomBackgroundColor();
			setStoredThemeMode("system");
			applyThemeMode("system");
		},
		[],
	);

	const handleSetCustomBackgroundFromLongHex = useCallback(
		(hex: string | null) => {
			if (!hex) {
				setCustomBackgroundColor(null);
				clearStoredCustomBackgroundColor();
				setStoredThemeMode("system");
				applyThemeMode("system");
				return;
			}
			const rgb = hexToRGB(bytes32ToHexColor(hex));
			setCustomBackgroundColor(rgb);
			setStoredCustomBackgroundColor(rgb);
			setStoredThemeMode("custom");
			applyThemeMode("custom");
		},
		[],
	);

	const handleResetPrimaryColor = useCallback(() => {
		hasUserColorRef.current = false;
		setHasUserColor(false);
		clearInlinePrimaryAndSecondary();
		clearStoredPrimaryColor();
		setStoredThemeMode("system");
		applyThemeMode("system");
		const rgb = readCSSRgbVariable("--color-primary-default");
		if (rgb) setPrimaryColor(rgb);
	}, []);

	const unsavedChangesRef = useRef<Map<symbol, UnsavedChangesPrompt> | null>(
		null,
	);
	const router = useRouter();
	if (unsavedChangesRef.current === null) {
		unsavedChangesRef.current = new Map();
	}
	const unsavedChanges = unsavedChangesRef.current;
	const [unsavedChangesSnapshot, setUnsavedChangesSnapshot] = useState<{
		count: number;
		prompt: UnsavedChangesPrompt;
	}>({
		count: 0,
		prompt: { title: UNSAVED_CHANGES_TITLE },
	});
	const unsavedChangesSnapshotRef = useRef(unsavedChangesSnapshot);
	const browserBackGuardActiveRef = useRef(false);
	const allowNextPopRef = useRef(false);
	const bypassBeforeUnloadRef = useRef(false);
	const pendingUnsavedConfirmationRef = useRef<
		((confirmed: boolean) => void) | null
	>(null);
	const [unsavedConfirmationPrompt, setUnsavedConfirmationPrompt] =
		useState<UnsavedChangesPrompt | null>(null);

	const syncUnsavedChangesSnapshot = useCallback(() => {
		const prompts = Array.from(unsavedChanges.values());
		setUnsavedChangesSnapshot({
			count: prompts.length,
			prompt: prompts[prompts.length - 1] ?? {
				title: UNSAVED_CHANGES_TITLE,
			},
		});
	}, [unsavedChanges]);

	useEffect(() => {
		unsavedChangesSnapshotRef.current = unsavedChangesSnapshot;
	}, [unsavedChangesSnapshot]);

	const registerUnsavedChanges = useCallback(
		(prompt: UnsavedChangesRegistration = UNSAVED_CHANGES_TITLE) => {
			const source = Symbol("unsaved-change-source");
			unsavedChanges.set(source, normalizeUnsavedPrompt(prompt));
			syncUnsavedChangesSnapshot();

			return () => {
				unsavedChanges.delete(source);
				syncUnsavedChangesSnapshot();
			};
		},
		[syncUnsavedChangesSnapshot, unsavedChanges],
	);

	const resolveUnsavedConfirmation = useCallback(
		async (confirmed: boolean) => {
			const pendingConfirmation = pendingUnsavedConfirmationRef.current;
			const prompt = unsavedConfirmationPrompt;
			pendingUnsavedConfirmationRef.current = null;
			setUnsavedConfirmationPrompt(null);

			if (!pendingConfirmation) return;
			if (!confirmed) {
				pendingConfirmation(false);
				return;
			}

			try {
				await prompt?.onConfirm?.();
				pendingConfirmation(true);
			} catch (error) {
				console.error("Failed to resolve unsaved changes prompt", error);
				pendingConfirmation(false);
			}
		},
		[unsavedConfirmationPrompt],
	);

	const confirmNavigation = useCallback(
		async (promptOverride?: UnsavedChangesRegistration) => {
			const { count, prompt } = unsavedChangesSnapshotRef.current;
			if (count === 0) return true;

			if (pendingUnsavedConfirmationRef.current) {
				pendingUnsavedConfirmationRef.current(false);
			}

			if (!promptOverride && prompt.autoConfirm) {
				try {
					await prompt.onConfirm?.();
					return true;
				} catch (error) {
					console.error("Failed to resolve unsaved changes prompt", error);
					return false;
				}
			}

			setUnsavedConfirmationPrompt(
				promptOverride ? normalizeUnsavedPrompt(promptOverride) : prompt,
			);
			return new Promise<boolean>((resolve) => {
				pendingUnsavedConfirmationRef.current = resolve;
			});
		},
		[],
	);

	const hasUnsavedChanges = unsavedChangesSnapshot.count > 0;

	useEffect(() => {
		if (!hasUnsavedChanges) return;

		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			if (bypassBeforeUnloadRef.current) return;
			event.preventDefault();
			event.returnValue = "";
		};

		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [hasUnsavedChanges]);

	useEffect(() => {
		if (!hasUnsavedChanges) {
			browserBackGuardActiveRef.current = false;
			allowNextPopRef.current = false;
			bypassBeforeUnloadRef.current = false;
			return;
		}

		if (!browserBackGuardActiveRef.current) {
			window.history.pushState(
				createUnsavedHistoryState(window.history.state),
				"",
				window.location.href,
			);
			browserBackGuardActiveRef.current = true;
		}

		const handlePopState = async () => {
			if (allowNextPopRef.current) {
				allowNextPopRef.current = false;
				browserBackGuardActiveRef.current = false;
				return;
			}

			if (await confirmNavigation()) {
				allowNextPopRef.current = true;
				browserBackGuardActiveRef.current = false;
				bypassBeforeUnloadRef.current = true;
				window.history.back();
				return;
			}

			window.history.pushState(
				createUnsavedHistoryState(window.history.state),
				"",
				window.location.href,
			);
			browserBackGuardActiveRef.current = true;
		};

		window.addEventListener("popstate", handlePopState);
		return () => window.removeEventListener("popstate", handlePopState);
	}, [confirmNavigation, hasUnsavedChanges]);

	useEffect(() => {
		if (!hasUnsavedChanges) return;

		const handleDocumentClick = (event: MouseEvent) => {
			if (
				event.defaultPrevented ||
				event.button !== 0 ||
				event.metaKey ||
				event.ctrlKey ||
				event.shiftKey ||
				event.altKey
			) {
				return;
			}

			if (!(event.target instanceof Element)) return;

			const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
			if (!anchor) return;
			if (
				anchor.closest('[contenteditable="true"], [data-lexical-editor="true"]')
			) {
				return;
			}
			if (anchor.target && anchor.target !== "_self") return;

			const href = anchor.getAttribute("href");
			if (!href || href.startsWith("#")) return;
			if (anchor.href === window.location.href) return;

			event.preventDefault();
			event.stopImmediatePropagation();

			void confirmNavigation().then((confirmed) => {
				if (!confirmed) return;

				const url = new URL(anchor.href);
				if (url.origin === window.location.origin) {
					router.push(`${url.pathname}${url.search}${url.hash}`);
					return;
				}

				bypassBeforeUnloadRef.current = true;
				window.location.assign(anchor.href);
			});
		};

		document.addEventListener("click", handleDocumentClick, true);
		return () =>
			document.removeEventListener("click", handleDocumentClick, true);
	}, [confirmNavigation, hasUnsavedChanges, router]);

	const unsavedChangesContextValue = useMemo(
		() => ({
			hasUnsavedChanges,
			confirmNavigation,
			registerUnsavedChanges,
		}),
		[confirmNavigation, hasUnsavedChanges, registerUnsavedChanges],
	);

	return (
		<QueryClientProvider client={queryClient}>
			<PrivyProvider
				appId={env.NEXT_PUBLIC_PRIVY_APP_ID}
				config={{
					loginMethods: ["sms", "email", "wallet", "passkey"],
					defaultChain: optimism,
					supportedChains: [optimism],
					walletConnectCloudProjectId:
						env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
					appearance: {
						theme: "dark",
						accentColor: RGBToHex(primaryColor),
						landingHeader: "",
						walletList: [
							"metamask",
							"coinbase_wallet",
							"rainbow",
							"wallet_connect_qr",
						],
						walletChainType: "ethereum-only",
					},
					embeddedWallets: {
						ethereum: {
							createOnLogin: "users-without-wallets",
						},
					},
					externalWallets: {
						walletConnect: { enabled: true },
					},
				}}
			>
				<AuthHintContext value={initialLoggedIn}>
					<UnsavedChangesContext value={unsavedChangesContextValue}>
						<NavigationContext
							value={{ previousPathname, writerCameFromExplore }}
						>
							<WriterContext
								value={{
									writer,
									setWriter,
									defaultColor,
									primaryColor,
									customBackgroundColor,
									setPrimaryColor: handleSetPrimaryColor,
									setCustomBackgroundColor: handleSetCustomBackgroundColor,
									setPrimaryFromLongHex: handleSetPrimaryFromLongHex,
									setCustomBackgroundFromLongHex:
										handleSetCustomBackgroundFromLongHex,
									resetPrimaryColor: handleResetPrimaryColor,
								}}
							>
								<AuthColorSync />
								{children}
								<UnsavedChangesConfirmModal
									prompt={unsavedConfirmationPrompt}
									onResolve={resolveUnsavedConfirmation}
								/>
							</WriterContext>
						</NavigationContext>
					</UnsavedChangesContext>
				</AuthHintContext>
			</PrivyProvider>
		</QueryClientProvider>
	);
}

function AuthColorSync() {
	useAuthTheme();
	return null;
}
