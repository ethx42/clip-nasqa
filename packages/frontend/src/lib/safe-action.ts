import { toast } from "sonner";

import { reportError } from "@/lib/report-error";

/**
 * Wraps a server action call to catch network-level fetch failures
 * (e.g., ERR_INTERNET_DISCONNECTED) and convert them to an ActionResult-shaped error.
 */
export async function safeAction<R extends { success: boolean }>(
  action: Promise<R>,
  networkErrorMessage: string,
): Promise<R | { success: false; error: string }> {
  try {
    return await action;
  } catch {
    return { success: false, error: networkErrorMessage };
  }
}

// ── Client-side mutation wrapper ───────────────────────────────────────────────

export type MutationErrorType = "rate-limit" | "banned" | "network" | "server";

function parseErrorType(err: unknown): MutationErrorType {
  // Network failure: fetch threw a TypeError or browser is offline
  if (err instanceof TypeError || !navigator.onLine) {
    return "network";
  }
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("RATE_LIMIT_EXCEEDED")) return "rate-limit";
  if (message.includes("PARTICIPANT_BANNED")) return "banned";
  return "server";
}

export interface SafeClientMutationOptions {
  rateLimitMessage: string;
  bannedMessage: string;
  networkMessage: string;
  serverMessage: string;
  /** Sonner toast id for rate-limit toasts — prevents stacking. Defaults to 'rate-limit'. */
  rateLimitToastId?: string;
}

/**
 * Wraps a graphqlMutation call with one silent retry, error classification, and localized toast.
 *
 * Retry logic: first attempt → on failure, wait 1s → retry once → on second failure show toast.
 * Rate-limit toasts are deduplicated via Sonner toast id to prevent stacking.
 */
export async function safeClientMutation<T>(
  fn: () => Promise<T>,
  options: SafeClientMutationOptions,
): Promise<{ success: true; data: T } | { success: false; error: MutationErrorType }> {
  let lastError: unknown;

  // First attempt
  try {
    const data = await fn();
    return { success: true, data };
  } catch (err) {
    lastError = err;
  }

  // One silent retry after 1 second
  await new Promise<void>((r) => setTimeout(r, 1000));

  try {
    const data = await fn();
    return { success: true, data };
  } catch (err) {
    lastError = err;
  }

  // Both attempts failed — classify, log, and show toast
  const errorType = parseErrorType(lastError);
  reportError(lastError instanceof Error ? lastError : new Error(String(lastError)));

  const toastId = options.rateLimitToastId ?? "rate-limit";

  switch (errorType) {
    case "rate-limit":
      toast.error(options.rateLimitMessage, { id: toastId, duration: 4000 });
      break;
    case "banned":
      toast.error(options.bannedMessage, { duration: 4000 });
      break;
    case "network":
      toast.error(options.networkMessage, { duration: 4000 });
      break;
    default:
      toast.error(options.serverMessage, { duration: 4000 });
  }

  return { success: false, error: errorType };
}
