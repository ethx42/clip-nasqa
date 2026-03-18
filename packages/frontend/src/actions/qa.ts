"use server";

import { getTranslations } from "next-intl/server";

import type { ActionResult } from "@/lib/action-result";
import { appsyncMutation } from "@/lib/appsync-server";
import { ADD_QUESTION, ADD_REPLY, FOCUS_QUESTION, UPVOTE_QUESTION } from "@/lib/graphql/mutations";
import { reportError } from "@/lib/report-error";

function parseRateLimitOrBan(
  err: unknown,
  t: Awaited<ReturnType<typeof getTranslations<"actionErrors">>>,
  fallbackKey: keyof {
    failedSubmitQuestion: string;
    failedUpvote: string;
    failedSubmitReply: string;
    failedFocusQuestion: string;
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

export async function addQuestionAction(args: {
  sessionCode: string;
  text: string;
  fingerprint: string;
  authorName?: string;
}): Promise<ActionResult> {
  const t = await getTranslations("actionErrors");

  if (args.text.length > 500) {
    return { success: false, error: t("questionTooLong") };
  }
  if (args.text.trim().length === 0) {
    return { success: false, error: t("questionEmpty") };
  }

  try {
    await appsyncMutation(ADD_QUESTION, args);
    return { success: true };
  } catch (err) {
    reportError(err instanceof Error ? err : new Error(String(err)));
    return parseRateLimitOrBan(err, t, "failedSubmitQuestion");
  }
}

export async function upvoteQuestionAction(args: {
  sessionCode: string;
  questionId: string;
  fingerprint: string;
  remove?: boolean;
}): Promise<ActionResult | { success: false; error: "VOTE_CONFLICT" }> {
  const t = await getTranslations("actionErrors");

  try {
    await appsyncMutation(UPVOTE_QUESTION, args);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("VOTE_CONFLICT")) {
      return { success: false, error: "VOTE_CONFLICT" };
    }
    reportError(err instanceof Error ? err : new Error(String(err)));
    return parseRateLimitOrBan(err, t, "failedUpvote");
  }
}

export async function addReplyAction(args: {
  sessionCode: string;
  questionId: string;
  text: string;
  fingerprint: string;
  isHostReply: boolean;
  authorName?: string;
}): Promise<ActionResult> {
  const t = await getTranslations("actionErrors");

  if (args.text.length > 500) {
    return { success: false, error: t("replyTooLong") };
  }
  if (args.text.trim().length === 0) {
    return { success: false, error: t("replyEmpty") };
  }

  try {
    await appsyncMutation(ADD_REPLY, args);
    return { success: true };
  } catch (err) {
    reportError(err instanceof Error ? err : new Error(String(err)));
    return parseRateLimitOrBan(err, t, "failedSubmitReply");
  }
}

export async function focusQuestionAction(args: {
  sessionCode: string;
  hostSecretHash: string;
  questionId?: string;
}): Promise<ActionResult> {
  const t = await getTranslations("actionErrors");

  try {
    await appsyncMutation(FOCUS_QUESTION, args);
    return { success: true };
  } catch (err) {
    reportError(err instanceof Error ? err : new Error(String(err)));
    return parseRateLimitOrBan(err, t, "failedFocusQuestion");
  }
}
