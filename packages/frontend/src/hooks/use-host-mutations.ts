"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { toast } from "sonner";

import type { Question, Reply, Snippet } from "@nasqa/core";

import {
  banParticipantAction,
  banQuestionAction,
  deleteQuestionAction,
  deleteReplyAction,
  editQuestionAction,
  editReplyAction,
  focusQuestionAction,
  hardDeleteQuestionAction,
  hardDeleteReplyAction,
  hardDeleteSnippetAction,
  restoreQuestionAction,
} from "@/actions/moderation";
import { clearClipboardAction, deleteSnippetAction, editSnippetAction } from "@/actions/snippet";
import type { SessionAction } from "@/hooks/use-session-state";
import { safeAction } from "@/lib/safe-action";

interface UseHostMutationsParams {
  sessionCode: string;
  hostSecretHash: string;
  dispatch: React.Dispatch<SessionAction>;
  /** For reading current questions without stale closures. */
  questionsRef: React.RefObject<Question[]>;
  /** For reading current replies without stale closures (needed for edit/delete reply rollback). */
  repliesRef?: React.RefObject<Reply[]>;
  /** For reading current snippets without stale closures (needed for edit snippet rollback). */
  snippetsRef?: React.RefObject<Snippet[]>;
}

interface HostMutations {
  handleDeleteSnippet: (snippetId: string) => Promise<void>;
  handleClearClipboard: () => Promise<void>;
  handleFocusQuestion: (questionId: string | undefined) => Promise<void>;
  handleBanQuestion: (questionId: string) => Promise<void>;
  handleBanParticipant: (participantFingerprint: string) => Promise<void>;
  handleRestoreQuestion: (questionId: string) => Promise<void>;
  handleHostEditQuestion: (questionId: string, text: string) => Promise<void>;
  handleHostDeleteQuestion: (questionId: string) => Promise<void>;
  handleHostEditReply: (replyId: string, text: string) => Promise<void>;
  handleHostDeleteReply: (replyId: string) => Promise<void>;
  handleEditSnippet: (snippetId: string, content: string, language?: string) => Promise<void>;
  handleHardDeleteQuestion: (questionId: string) => Promise<void>;
  handleHardDeleteReply: (replyId: string) => Promise<void>;
  handleHardDeleteSnippet: (snippetId: string) => Promise<void>;
}

export function useHostMutations({
  sessionCode,
  hostSecretHash,
  dispatch,
  questionsRef,
  repliesRef,
  snippetsRef,
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

  const handleHostEditQuestion = useCallback(
    async (questionId: string, text: string) => {
      const originalQuestion = questionsRef.current.find((q) => q.id === questionId);
      const originalText = originalQuestion?.text ?? "";
      const originalEditedAt = originalQuestion?.editedAt;

      const editedAt = Math.floor(Date.now() / 1000);
      dispatch({ type: "QUESTION_EDITED", payload: { questionId, text, editedAt } });

      const result = await safeAction(
        editQuestionAction({ sessionCode, questionId, text, hostSecretHash }),
        tErrors("networkError"),
      );

      if (!result.success) {
        dispatch({
          type: "QUESTION_EDITED",
          payload: { questionId, text: originalText, editedAt: originalEditedAt ?? 0 },
        });
        toast.error(result.error, { duration: 5000 });
      }
    },
    [sessionCode, hostSecretHash, dispatch, questionsRef, tErrors],
  );

  const handleHostDeleteQuestion = useCallback(
    async (questionId: string) => {
      const originalQuestion = questionsRef.current.find((q) => q.id === questionId);

      dispatch({ type: "QUESTION_DELETED", payload: { questionId } });

      const result = await safeAction(
        deleteQuestionAction({ sessionCode, questionId, hostSecretHash }),
        tErrors("networkError"),
      );

      if (!result.success) {
        if (originalQuestion) {
          dispatch({ type: "QUESTION_ADDED", payload: originalQuestion });
        }
        toast.error(result.error, { duration: 5000 });
      }
    },
    [sessionCode, hostSecretHash, dispatch, questionsRef, tErrors],
  );

  const handleHostEditReply = useCallback(
    async (replyId: string, text: string) => {
      const originalReply = repliesRef?.current.find((r) => r.id === replyId);
      const originalText = originalReply?.text ?? "";
      const originalEditedAt = originalReply?.editedAt;

      const editedAt = Math.floor(Date.now() / 1000);
      dispatch({ type: "REPLY_EDITED", payload: { replyId, text, editedAt } });

      const result = await safeAction(
        editReplyAction({ sessionCode, replyId, text, hostSecretHash }),
        tErrors("networkError"),
      );

      if (!result.success) {
        if (originalReply) {
          dispatch({
            type: "REPLY_EDITED",
            payload: { replyId, text: originalText, editedAt: originalEditedAt ?? 0 },
          });
        }
        toast.error(result.error, { duration: 5000 });
      }
    },
    [sessionCode, hostSecretHash, dispatch, repliesRef, tErrors],
  );

  const handleHostDeleteReply = useCallback(
    async (replyId: string) => {
      dispatch({ type: "REPLY_DELETED", payload: { replyId } });

      const result = await safeAction(
        deleteReplyAction({ sessionCode, replyId, hostSecretHash }),
        tErrors("networkError"),
      );

      if (!result.success) {
        toast.error(result.error, { duration: 5000 });
      }
    },
    [sessionCode, hostSecretHash, dispatch, tErrors],
  );

  const handleEditSnippet = useCallback(
    async (snippetId: string, content: string, language?: string) => {
      const originalSnippet = snippetsRef?.current.find((s) => s.id === snippetId);
      const originalContent = originalSnippet?.content ?? "";
      const originalLanguage = originalSnippet?.language;
      const originalEditedAt = originalSnippet?.editedAt;

      const editedAt = Math.floor(Date.now() / 1000);
      dispatch({ type: "SNIPPET_EDITED", payload: { snippetId, content, language, editedAt } });

      const result = await safeAction(
        editSnippetAction({ sessionCode, snippetId, content, language, hostSecretHash }),
        tErrors("networkError"),
      );

      if (!result.success) {
        if (originalSnippet) {
          dispatch({
            type: "SNIPPET_EDITED",
            payload: {
              snippetId,
              content: originalContent,
              language: originalLanguage,
              editedAt: originalEditedAt ?? 0,
            },
          });
        }
        toast.error(result.error, { duration: 5000 });
      }
    },
    [sessionCode, hostSecretHash, dispatch, snippetsRef, tErrors],
  );

  const handleHardDeleteQuestion = useCallback(
    async (questionId: string) => {
      const originalQuestion = questionsRef.current.find((q) => q.id === questionId);
      const originalReplies = repliesRef?.current.filter((r) => r.questionId === questionId) ?? [];

      dispatch({ type: "QUESTION_DELETED", payload: { questionId } });
      for (const reply of originalReplies) {
        dispatch({ type: "REPLY_DELETED", payload: { replyId: reply.id } });
      }

      const result = await safeAction(
        hardDeleteQuestionAction({ sessionCode, questionId, hostSecretHash }),
        tErrors("networkError"),
      );

      if (!result.success) {
        if (originalQuestion) {
          dispatch({ type: "QUESTION_ADDED", payload: originalQuestion });
        }
        for (const reply of originalReplies) {
          dispatch({ type: "REPLY_ADDED", payload: reply });
        }
        toast.error(result.error, { duration: 5000 });
      }
    },
    [sessionCode, hostSecretHash, dispatch, questionsRef, repliesRef, tErrors],
  );

  const handleHardDeleteReply = useCallback(
    async (replyId: string) => {
      dispatch({ type: "REPLY_DELETED", payload: { replyId } });

      const result = await safeAction(
        hardDeleteReplyAction({ sessionCode, replyId, hostSecretHash }),
        tErrors("networkError"),
      );

      if (!result.success) {
        toast.error(result.error, { duration: 5000 });
      }
    },
    [sessionCode, hostSecretHash, dispatch, tErrors],
  );

  const handleHardDeleteSnippet = useCallback(
    async (snippetId: string) => {
      dispatch({ type: "SNIPPET_DELETED", payload: { snippetId } });

      const result = await safeAction(
        hardDeleteSnippetAction({ sessionCode, snippetId, hostSecretHash }),
        tErrors("networkError"),
      );

      if (!result.success) {
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
    handleHostEditQuestion,
    handleHostDeleteQuestion,
    handleHostEditReply,
    handleHostDeleteReply,
    handleEditSnippet,
    handleHardDeleteQuestion,
    handleHardDeleteReply,
    handleHardDeleteSnippet,
  };
}
