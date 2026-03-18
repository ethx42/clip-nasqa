"use server";

import { getTranslations } from "next-intl/server";

import type { ActionResult } from "@/lib/action-result";
import { appsyncMutation } from "@/lib/appsync-server";
import { CLEAR_CLIPBOARD, DELETE_SNIPPET, PUSH_SNIPPET } from "@/lib/graphql/mutations";
import { reportError } from "@/lib/report-error";

function parseRateLimitOrBan(
  err: unknown,
  t: Awaited<ReturnType<typeof getTranslations<"actionErrors">>>,
  fallbackKey: keyof {
    failedPushSnippet: string;
    failedDeleteSnippet: string;
    failedClearClipboard: string;
  },
): { success: false; error: string } {
  const message = err instanceof Error ? err.message : String(err);
  const rateLimitMatch = message.match(/RATE_LIMIT_EXCEEDED:(\d+)/);
  if (rateLimitMatch) {
    const seconds = rateLimitMatch[1];
    return { success: false, error: t("rateLimited", { seconds }) };
  }
  if (message.includes("PARTICIPANT_BANNED")) {
    return { success: false, error: t("banned") };
  }
  return { success: false, error: t(fallbackKey) };
}

/**
 * Pushes a new snippet to the session via AppSync mutation.
 */
export async function pushSnippetAction(formData: {
  sessionCode: string;
  hostSecretHash: string;
  content: string;
  type: string;
  language?: string;
}): Promise<ActionResult> {
  try {
    await appsyncMutation(PUSH_SNIPPET, formData);
    return { success: true };
  } catch (err) {
    const t = await getTranslations("actionErrors");
    reportError(err instanceof Error ? err : new Error(String(err)));
    return parseRateLimitOrBan(err, t, "failedPushSnippet");
  }
}

/**
 * Deletes a single snippet from the session.
 */
export async function deleteSnippetAction(args: {
  sessionCode: string;
  hostSecretHash: string;
  snippetId: string;
}): Promise<ActionResult> {
  try {
    await appsyncMutation(DELETE_SNIPPET, args);
    return { success: true };
  } catch (err) {
    const t = await getTranslations("actionErrors");
    reportError(err instanceof Error ? err : new Error(String(err)));
    return parseRateLimitOrBan(err, t, "failedDeleteSnippet");
  }
}

/**
 * Clears all snippets from the session clipboard.
 */
export async function clearClipboardAction(args: {
  sessionCode: string;
  hostSecretHash: string;
}): Promise<ActionResult> {
  try {
    await appsyncMutation(CLEAR_CLIPBOARD, args);
    return { success: true };
  } catch (err) {
    const t = await getTranslations("actionErrors");
    reportError(err instanceof Error ? err : new Error(String(err)));
    return parseRateLimitOrBan(err, t, "failedClearClipboard");
  }
}
