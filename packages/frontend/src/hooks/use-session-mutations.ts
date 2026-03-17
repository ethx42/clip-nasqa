"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { toast } from "sonner";

import type { Question, Reply } from "@nasqa/core";

import { downvoteQuestionAction } from "@/actions/moderation";
import { addQuestionAction, addReplyAction, upvoteQuestionAction } from "@/actions/qa";
import type { SessionAction } from "@/hooks/use-session-state";
import { safeAction } from "@/lib/safe-action";

interface UseSessionMutationsParams {
  sessionSlug: string;
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
}

export function useSessionMutations({
  sessionSlug,
  fingerprint,
  authorName,
  dispatch,
  questionsRef,
  votedIds,
  downvotedIds,
  addVote,
  removeVote,
  addDownvote,
  removeDownvote,
  isHostReply = false,
  onSubmitSuccess,
  onReplySuccess,
}: UseSessionMutationsParams): SessionMutations {
  const tErrors = useTranslations("actionErrors");

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

      const result = await safeAction(
        upvoteQuestionAction({ sessionSlug, questionId, fingerprint, remove }),
        tErrors("networkError"),
      );

      if (!result.success) {
        // VOTE_CONFLICT is a dedup signal — handle silently (not a user error)
        if (!("error" in result) || result.error !== "VOTE_CONFLICT") {
          dispatch({
            type: "QUESTION_UPDATED",
            payload: { questionId, upvoteDelta: remove ? 1 : -1 },
          });
          if (remove) {
            addVote(questionId);
          } else {
            removeVote(questionId);
          }
          toast.error(result.error, { duration: 5000 });
        }
      }
    },
    [sessionSlug, fingerprint, dispatch, addVote, removeVote, tErrors],
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

      const result = await safeAction(
        downvoteQuestionAction({ sessionSlug, questionId, fingerprint, remove }),
        tErrors("networkError"),
      );

      if (!result.success) {
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
        toast.error(result.error, { duration: 5000 });
      }
    },
    [
      sessionSlug,
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
      // Optimistic question with temp id
      const tempId = `_opt_${Date.now()}`;
      const optimisticQuestion: Question = {
        id: tempId,
        sessionSlug,
        text,
        fingerprint,
        authorName,
        upvoteCount: 0,
        downvoteCount: 0,
        isHidden: false,
        isFocused: false,
        isBanned: false,
        createdAt: Math.floor(Date.now() / 1000),
        TTL: 0,
      };

      dispatch({ type: "ADD_QUESTION_OPTIMISTIC", payload: optimisticQuestion });

      const result = await safeAction(
        addQuestionAction({ sessionSlug, text, fingerprint, authorName }),
        tErrors("networkError"),
      );

      if (!result.success) {
        dispatch({ type: "REMOVE_OPTIMISTIC", payload: { id: tempId } });
        toast.error(result.error, { duration: 5000 });
      } else {
        onSubmitSuccess?.();
      }
    },
    [sessionSlug, fingerprint, authorName, dispatch, onSubmitSuccess, tErrors],
  );

  const handleReply = useCallback(
    async (questionId: string, text: string) => {
      // Optimistic reply with temp id
      const tempId = `_opt_${Date.now()}`;
      const optimisticReply: Reply = {
        id: tempId,
        questionId,
        sessionSlug,
        text,
        isHostReply,
        fingerprint,
        createdAt: Math.floor(Date.now() / 1000),
        TTL: 0,
      };

      dispatch({ type: "REPLY_ADDED", payload: optimisticReply });

      const result = await safeAction(
        addReplyAction({ sessionSlug, questionId, text, fingerprint, isHostReply, authorName }),
        tErrors("networkError"),
      );

      if (!result.success) {
        dispatch({ type: "REMOVE_OPTIMISTIC", payload: { id: tempId } });
        toast.error(result.error, { duration: 5000 });
      } else {
        onReplySuccess?.();
      }
    },
    [sessionSlug, fingerprint, authorName, isHostReply, dispatch, onReplySuccess, tErrors],
  );

  return { handleUpvote, handleDownvote, handleAddQuestion, handleReply };
}
