"use server";

import { getTranslations } from "next-intl/server";

import type { ActionResult } from "@/lib/action-result";
import { appsyncMutation } from "@/lib/appsync-server";
import {
  BAN_PARTICIPANT,
  BAN_QUESTION,
  FOCUS_QUESTION,
  RESTORE_QUESTION,
} from "@/lib/graphql/mutations";
import { reportError } from "@/lib/report-error";

function parseRateLimitOrBan(
  err: unknown,
  t: Awaited<ReturnType<typeof getTranslations<"actionErrors">>>,
  fallbackKey: keyof {
    failedBanQuestion: string;
    failedBanParticipant: string;
    failedFocusQuestion: string;
    failedRestore: string;
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

export async function banQuestionAction(args: {
  sessionCode: string;
  hostSecretHash: string;
  questionId: string;
}): Promise<ActionResult> {
  try {
    await appsyncMutation(BAN_QUESTION, args);
    return { success: true };
  } catch (err) {
    const t = await getTranslations("actionErrors");
    reportError(err instanceof Error ? err : new Error(String(err)));
    return parseRateLimitOrBan(err, t, "failedBanQuestion");
  }
}

export async function banParticipantAction(args: {
  sessionCode: string;
  hostSecretHash: string;
  fingerprint: string;
}): Promise<ActionResult> {
  try {
    await appsyncMutation(BAN_PARTICIPANT, args);
    return { success: true };
  } catch (err) {
    const t = await getTranslations("actionErrors");
    reportError(err instanceof Error ? err : new Error(String(err)));
    return parseRateLimitOrBan(err, t, "failedBanParticipant");
  }
}

export async function focusQuestionAction(args: {
  sessionCode: string;
  hostSecretHash: string;
  questionId?: string;
}): Promise<ActionResult> {
  try {
    await appsyncMutation(FOCUS_QUESTION, args);
    return { success: true };
  } catch (err) {
    const t = await getTranslations("actionErrors");
    reportError(err instanceof Error ? err : new Error(String(err)));
    return parseRateLimitOrBan(err, t, "failedFocusQuestion");
  }
}

export async function restoreQuestionAction(args: {
  sessionCode: string;
  hostSecretHash: string;
  questionId: string;
}): Promise<ActionResult> {
  try {
    await appsyncMutation(RESTORE_QUESTION, args);
    return { success: true };
  } catch (err) {
    const t = await getTranslations("actionErrors");
    reportError(err instanceof Error ? err : new Error(String(err)));
    return parseRateLimitOrBan(err, t, "failedRestore");
  }
}
