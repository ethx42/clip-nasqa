"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { toast } from "sonner";

import type { Question } from "@nasqa/core";

import {
  banParticipantAction,
  banQuestionAction,
  focusQuestionAction,
  restoreQuestionAction,
} from "@/actions/moderation";
import { clearClipboardAction, deleteSnippetAction } from "@/actions/snippet";
import type { SessionAction } from "@/hooks/use-session-state";
import { safeAction } from "@/lib/safe-action";

interface UseHostMutationsParams {
  sessionCode: string;
  hostSecretHash: string;
  dispatch: React.Dispatch<SessionAction>;
  /** For reading current questions without stale closures. */
  questionsRef: React.RefObject<Question[]>;
}

interface HostMutations {
  handleDeleteSnippet: (snippetId: string) => Promise<void>;
  handleClearClipboard: () => Promise<void>;
  handleFocusQuestion: (questionId: string | undefined) => Promise<void>;
  handleBanQuestion: (questionId: string) => Promise<void>;
  handleBanParticipant: (participantFingerprint: string) => Promise<void>;
  handleRestoreQuestion: (questionId: string) => Promise<void>;
}

export function useHostMutations({
  sessionCode,
  hostSecretHash,
  dispatch,
  questionsRef,
}: UseHostMutationsParams): HostMutations {
  const tErrors = useTranslations("actionErrors");

  const handleDeleteSnippet = useCallback(
    async (snippetId: string) => {
      // Optimistic removal
      dispatch({ type: "SNIPPET_DELETED", payload: { snippetId } });
      const result = await safeAction(
        deleteSnippetAction({ sessionCode, hostSecretHash, snippetId }),
        tErrors("networkError"),
      );
      if (!result.success) {
        toast.error(result.error, { duration: 5000 });
      }
    },
    [sessionCode, hostSecretHash, dispatch, tErrors],
  );

  const handleClearClipboard = useCallback(async () => {
    dispatch({ type: "CLIPBOARD_CLEARED" });
    const result = await safeAction(
      clearClipboardAction({ sessionCode, hostSecretHash }),
      tErrors("networkError"),
    );
    if (!result.success) {
      toast.error(result.error, { duration: 5000 });
    }
  }, [sessionCode, hostSecretHash, dispatch, tErrors]);

  const handleFocusQuestion = useCallback(
    async (questionId: string | undefined) => {
      // Optimistic: update focused state locally
      if (questionId) {
        dispatch({ type: "QUESTION_UPDATED", payload: { questionId, isFocused: true } });
      } else {
        // Unfocus all — read current questions via ref to avoid stale closure
        for (const q of questionsRef.current) {
          if (q.isFocused) {
            dispatch({
              type: "QUESTION_UPDATED",
              payload: { questionId: q.id, isFocused: false },
            });
          }
        }
      }
      const result = await safeAction(
        focusQuestionAction({ sessionCode, hostSecretHash, questionId }),
        tErrors("networkError"),
      );
      if (!result.success) {
        toast.error(result.error, { duration: 5000 });
      }
    },
    [sessionCode, hostSecretHash, dispatch, questionsRef, tErrors],
  );

  const handleBanQuestion = useCallback(
    async (questionId: string) => {
      // Optimistic: mark banned immediately
      dispatch({ type: "QUESTION_UPDATED", payload: { questionId, isBanned: true } });
      const result = await safeAction(
        banQuestionAction({ sessionCode, hostSecretHash, questionId }),
        tErrors("networkError"),
      );
      if (!result.success) {
        // Rollback
        dispatch({ type: "QUESTION_UPDATED", payload: { questionId, isBanned: false } });
        toast.error(result.error, { duration: 5000 });
      }
    },
    [sessionCode, hostSecretHash, dispatch, tErrors],
  );

  const handleBanParticipant = useCallback(
    async (participantFingerprint: string) => {
      const result = await safeAction(
        banParticipantAction({ sessionCode, hostSecretHash, fingerprint: participantFingerprint }),
        tErrors("networkError"),
      );
      if (!result.success) {
        toast.error(result.error, { duration: 5000 });
      }
    },
    [sessionCode, hostSecretHash, tErrors],
  );

  const handleRestoreQuestion = useCallback(
    async (questionId: string) => {
      dispatch({ type: "QUESTION_UPDATED", payload: { questionId, isHidden: false } });
      const result = await safeAction(
        restoreQuestionAction({ sessionCode, hostSecretHash, questionId }),
        tErrors("networkError"),
      );
      if (!result.success) {
        dispatch({ type: "QUESTION_UPDATED", payload: { questionId, isHidden: true } });
        toast.error(result.error, { duration: 5000 });
      }
    },
    [sessionCode, hostSecretHash, dispatch, tErrors],
  );

  return {
    handleDeleteSnippet,
    handleClearClipboard,
    handleFocusQuestion,
    handleBanQuestion,
    handleBanParticipant,
    handleRestoreQuestion,
  };
}
