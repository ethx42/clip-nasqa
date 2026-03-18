"use server";

import { appsyncMutation } from "@/lib/appsync-server";
import { REACT } from "@/lib/graphql/mutations";

interface ReactArgs {
  sessionCode: string;
  targetId: string;
  targetType: "QUESTION" | "REPLY";
  emoji: string;
  fingerprint: string;
}

/**
 * Server action to submit a reaction to a question or reply.
 * Returns { success: true } on success, { success: false } on error.
 * Silent failure — no toast. UI reverts optimistically on failure.
 */
export async function reactAction(args: ReactArgs): Promise<{ success: boolean }> {
  try {
    await appsyncMutation(REACT, args as unknown as Record<string, unknown>);
    return { success: true };
  } catch {
    return { success: false };
  }
}
