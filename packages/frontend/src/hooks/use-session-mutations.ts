"use client";

import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import type { Question, Reply } from "@nasqa/core";

import type { SessionAction } from "@/hooks/use-session-state";
import { graphqlMutation } from "@/lib/appsync-client";
import {
  ADD_QUESTION,
  ADD_REPLY,
  DELETE_QUESTION,
  DELETE_REPLY,
  DOWNVOTE_QUESTION,
  EDIT_QUESTION,
  EDIT_REPLY,
  UPVOTE_QUESTION,
} from "@/lib/graphql/mutations";
import { reportError } from "@/lib/report-error";
import { safeClientMutation } from "@/lib/safe-action";

interface UseSessionMutationsParams {
  sessionCode: string;
  fingerprint: string;
  authorName: string | undefined;
  dispatch: React.Dispatch<SessionAction>;
  /** For reading current questions without stale closures. */
  questionsRef: React.RefObject<Question[]>;
  votedIds: Set<string>;
  downvotedIds: Set<string>;
  addVote: (id: string) => void;
  removeVote: (id: string) => void;
  addDownvote: (id: string) => void;
  removeDownvote: (id: string) => void;
  isHostReply?: boolean;
  /** Called after a question is successfully submitted. */
  onSubmitSuccess?: () => void;
  /** Called after a reply is successfully submitted. */
  onReplySuccess?: () => void;
}

interface SessionMutations {
  handleUpvote: (questionId: string, remove: boolean) => Promise<void>;
  handleDownvote: (questionId: string, remove: boolean) => Promise<void>;
  handleAddQuestion: (text: string) => Promise<void>;
  handleReply: (questionId: string, text: string) => Promise<void>;
  handleEditQuestion: (questionId: string, text: string) => Promise<void>;
  handleDeleteQuestion: (questionId: string) => Promise<void>;
  handleEditReply: (replyId: string, text: string) => Promise<void>;
  handleDeleteReply: (replyId: string) => Promise<void>;
  isPending: boolean;
  restoredText: string;
}

// ── Internal helpers for upvote/downvote with VOTE_CONFLICT silence ────────────

async function callVoteMutation(
  fn: () => Promise<unknown>,
): Promise<{ success: true } | { success: false; error: string | "VOTE_CONFLICT" }> {
  try {
    await fn();
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("VOTE_CONFLICT")) {
      return { success: false, error: "VOTE_CONFLICT" };
    }
    // One silent retry after 1 second
    await new Promise<void>((r) => setTimeout(r, 1000));
    try {
      await fn();
      return { success: true };
    } catch (retryErr) {
      const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
      if (retryMsg.includes("VOTE_CONFLICT")) {
        return { success: false, error: "VOTE_CONFLICT" };
      }
      reportError(retryErr instanceof Error ? retryErr : new Error(retryMsg));
      return { success: false, error: retryMsg };
    }
  }
}

export function useSessionMutations({
  sessionCode,
  fingerprint,
  authorName,
  dispatch,
  questionsRef,
  votedIds,
  downvotedIds: _downvotedIds,
  addVote,
  removeVote,
  addDownvote,
  removeDownvote,
  isHostReply = false,
  onSubmitSuccess,
  onReplySuccess,
}: UseSessionMutationsParams): SessionMutations {
  const tErrors = useTranslations("actionErrors");

  const [isPending, setIsPending] = useState(false);
  const [restoredText, setRestoredText] = useState("");

  const handleUpvote = useCallback(
    async (questionId: string, remove: boolean) => {
      // Optimistic update
      dispatch({
        type: "QUESTION_UPDATED",
        payload: { questionId, upvoteDelta: remove ? -1 : 1 },
      });
      if (remove) {
        removeVote(questionId);
      } else {
        addVote(questionId);
      }

      const result = await callVoteMutation(() =>
        graphqlMutation("upvoteQuestion", UPVOTE_QUESTION, {
          sessionCode,
          questionId,
          fingerprint,
          remove,
        }),
      );

      if (!result.success) {
        // VOTE_CONFLICT is a dedup signal — handle silently (not a user error)
        if (result.error !== "VOTE_CONFLICT") {
          dispatch({
            type: "QUESTION_UPDATED",
            payload: { questionId, upvoteDelta: remove ? 1 : -1 },
          });
          if (remove) {
            addVote(questionId);
          } else {
            removeVote(questionId);
          }
          toast.error(tErrors("clientFailedUpvote"), { duration: 4000 });
        }
      }
    },
    [sessionCode, fingerprint, dispatch, addVote, removeVote, tErrors],
  );

  const handleDownvote = useCallback(
    async (questionId: string, remove: boolean) => {
      // Optimistic update — read live questions via ref to avoid stale closure
      dispatch({
        type: "QUESTION_UPDATED",
        payload: {
          questionId,
          downvoteCount: (() => {
            const q = questionsRef.current.find((q) => q.id === questionId);
            if (!q) return undefined;
            return remove ? Math.max(0, q.downvoteCount - 1) : q.downvoteCount + 1;
          })(),
        },
      });

      if (remove) {
        removeDownvote(questionId);
      } else {
        addDownvote(questionId);
        // Mutually exclusive: remove upvote state client-side if downvoting
        if (votedIds.has(questionId)) {
          removeVote(questionId);
          dispatch({
            type: "QUESTION_UPDATED",
            payload: { questionId, upvoteDelta: -1 },
          });
        }
      }

      const result = await callVoteMutation(() =>
        graphqlMutation("downvoteQuestion", DOWNVOTE_QUESTION, {
          sessionCode,
          questionId,
          fingerprint,
          remove,
        }),
      );

      if (!result.success) {
        if (result.error !== "VOTE_CONFLICT") {
          // Rollback — read live questions via ref to avoid stale closure
          dispatch({
            type: "QUESTION_UPDATED",
            payload: {
              questionId,
              downvoteCount: (() => {
                const q = questionsRef.current.find((q) => q.id === questionId);
                if (!q) return undefined;
                return remove ? q.downvoteCount + 1 : Math.max(0, q.downvoteCount - 1);
              })(),
            },
          });
          if (remove) {
            addDownvote(questionId);
          } else {
            removeDownvote(questionId);
          }
          toast.error(tErrors("clientFailedDownvote"), { duration: 4000 });
        }
      }
    },
    [
      sessionCode,
      fingerprint,
      dispatch,
      questionsRef,
      votedIds,
      addDownvote,
      removeDownvote,
      removeVote,
      tErrors,
    ],
  );

  const handleAddQuestion = useCallback(
    async (text: string) => {
      // Client-side validation
      if (text.trim().length === 0 || text.length > 500) {
        toast.error(
          text.trim().length === 0 ? tErrors("questionEmpty") : tErrors("questionTooLong"),
          { duration: 4000 },
        );
        return;
      }

      setIsPending(true);

      // Optimistic question with temp id
      const tempId = `_opt_${Date.now()}`;
      const optimisticQuestion: Question = {
        id: tempId,
        sessionCode,
        text,
        fingerprint,
        authorName,
        isHostQuestion: isHostReply,
        upvoteCount: 0,
        downvoteCount: 0,
        isHidden: false,
        isFocused: false,
        isBanned: false,
        createdAt: Math.floor(Date.now() / 1000),
        TTL: 0,
      };

      dispatch({ type: "ADD_QUESTION_OPTIMISTIC", payload: optimisticQuestion });

      try {
        const result = await safeClientMutation(
          () =>
            graphqlMutation("addQuestion", ADD_QUESTION, {
              sessionCode,
              text,
              fingerprint,
              authorName,
              isHostQuestion: isHostReply,
            }),
          {
            rateLimitMessage: tErrors("clientRateLimited"),
            bannedMessage: tErrors("clientBanned"),
            networkMessage: tErrors("clientNetworkOffline"),
            serverMessage: tErrors("clientFailedQuestion"),
          },
        );

        if (!result.success) {
          dispatch({ type: "REMOVE_OPTIMISTIC", payload: { id: tempId } });
          setRestoredText(text);
          // Do NOT call onSubmitSuccess — preserve input text for retry
        } else {
          onSubmitSuccess?.();
        }
      } finally {
        setIsPending(false);
      }
    },
    [sessionCode, fingerprint, authorName, isHostReply, dispatch, onSubmitSuccess, tErrors],
  );

  const handleReply = useCallback(
    async (questionId: string, text: string) => {
      // Client-side validation
      if (text.trim().length === 0 || text.length > 500) {
        toast.error(text.trim().length === 0 ? tErrors("replyEmpty") : tErrors("replyTooLong"), {
          duration: 4000,
        });
        return;
      }

      setIsPending(true);

      // Optimistic reply with temp id
      const tempId = `_opt_${Date.now()}`;
      const optimisticReply: Reply = {
        id: tempId,
        questionId,
        sessionCode,
        text,
        isHostReply,
        fingerprint,
        authorName,
        createdAt: Math.floor(Date.now() / 1000),
        TTL: 0,
      };

      dispatch({ type: "REPLY_ADDED", payload: optimisticReply });

      try {
        const result = await safeClientMutation(
          () =>
            graphqlMutation("addReply", ADD_REPLY, {
              sessionCode,
              questionId,
              text,
              fingerprint,
              isHostReply,
              authorName,
            }),
          {
            rateLimitMessage: tErrors("clientRateLimited"),
            bannedMessage: tErrors("clientBanned"),
            networkMessage: tErrors("clientNetworkOffline"),
            serverMessage: tErrors("clientFailedReply"),
          },
        );

        if (!result.success) {
          dispatch({ type: "REMOVE_OPTIMISTIC", payload: { id: tempId } });
          setRestoredText(text);
          // Do NOT call onReplySuccess — preserve input text for retry
        } else {
          onReplySuccess?.();
        }
      } finally {
        setIsPending(false);
      }
    },
    [sessionCode, fingerprint, authorName, isHostReply, dispatch, onReplySuccess, tErrors],
  );

  const handleEditQuestion = useCallback(
    async (questionId: string, text: string) => {
      // Read original text for rollback via ref
      const originalQuestion = questionsRef.current.find((q) => q.id === questionId);
      const originalText = originalQuestion?.text ?? "";
      const originalEditedAt = originalQuestion?.editedAt;

      // Optimistic update
      const editedAt = Math.floor(Date.now() / 1000);
      dispatch({ type: "QUESTION_EDITED", payload: { questionId, text, editedAt } });

      const result = await safeClientMutation(
        () =>
          graphqlMutation("editQuestion", EDIT_QUESTION, {
            sessionCode,
            questionId,
            text,
            fingerprint,
          }),
        {
          rateLimitMessage: tErrors("clientRateLimited"),
          bannedMessage: tErrors("clientBanned"),
          networkMessage: tErrors("clientNetworkOffline"),
          serverMessage: tErrors("clientFailedQuestion"),
        },
      );

      if (!result.success) {
        // Rollback to original text
        dispatch({
          type: "QUESTION_EDITED",
          payload: {
            questionId,
            text: originalText,
            editedAt: originalEditedAt ?? 0,
          },
        });
        toast.error(tErrors("clientFailedQuestion"), { duration: 4000 });
      }
    },
    [sessionCode, fingerprint, dispatch, questionsRef, tErrors],
  );

  const handleDeleteQuestion = useCallback(
    async (questionId: string) => {
      // Save original question for rollback
      const originalQuestion = questionsRef.current.find((q) => q.id === questionId);

      // Optimistic removal
      dispatch({ type: "QUESTION_DELETED", payload: { questionId } });

      const result = await safeClientMutation(
        () =>
          graphqlMutation("deleteQuestion", DELETE_QUESTION, {
            sessionCode,
            questionId,
            fingerprint,
          }),
        {
          rateLimitMessage: tErrors("clientRateLimited"),
          bannedMessage: tErrors("clientBanned"),
          networkMessage: tErrors("clientNetworkOffline"),
          serverMessage: tErrors("clientFailedQuestion"),
        },
      );

      if (!result.success) {
        // Rollback — re-add the question
        if (originalQuestion) {
          dispatch({ type: "QUESTION_ADDED", payload: originalQuestion });
        }
        toast.error(tErrors("clientFailedQuestion"), { duration: 4000 });
      }
    },
    [sessionCode, fingerprint, dispatch, questionsRef, tErrors],
  );

  const handleEditReply = useCallback(
    async (replyId: string, text: string) => {
      // We don't have a repliesRef, so we can only do forward optimistic (no rollback text)
      // The subscription echo will correct if server has different value
      const editedAt = Math.floor(Date.now() / 1000);
      dispatch({ type: "REPLY_EDITED", payload: { replyId, text, editedAt } });

      const result = await safeClientMutation(
        () =>
          graphqlMutation("editReply", EDIT_REPLY, {
            sessionCode,
            replyId,
            text,
            fingerprint,
          }),
        {
          rateLimitMessage: tErrors("clientRateLimited"),
          bannedMessage: tErrors("clientBanned"),
          networkMessage: tErrors("clientNetworkOffline"),
          serverMessage: tErrors("clientFailedReply"),
        },
      );

      if (!result.success) {
        toast.error(tErrors("clientFailedReply"), { duration: 4000 });
      }
    },
    [sessionCode, fingerprint, dispatch, tErrors],
  );

  const handleDeleteReply = useCallback(
    async (replyId: string) => {
      // Optimistic removal
      dispatch({ type: "REPLY_DELETED", payload: { replyId } });

      const result = await safeClientMutation(
        () =>
          graphqlMutation("deleteReply", DELETE_REPLY, {
            sessionCode,
            replyId,
            fingerprint,
          }),
        {
          rateLimitMessage: tErrors("clientRateLimited"),
          bannedMessage: tErrors("clientBanned"),
          networkMessage: tErrors("clientNetworkOffline"),
          serverMessage: tErrors("clientFailedReply"),
        },
      );

      if (!result.success) {
        toast.error(tErrors("clientFailedReply"), { duration: 4000 });
      }
    },
    [sessionCode, fingerprint, dispatch, tErrors],
  );

  return {
    handleUpvote,
    handleDownvote,
    handleAddQuestion,
    handleReply,
    handleEditQuestion,
    handleDeleteQuestion,
    handleEditReply,
    handleDeleteReply,
    isPending,
    restoredText,
  };
}
