"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import type { Question, Reply, Snippet } from "@nasqa/core";

import {
  banParticipantAction,
  banQuestionAction,
  downvoteQuestionAction,
  restoreQuestionAction,
} from "@/actions/moderation";
import {
  addQuestionAction,
  addReplyAction,
  focusQuestionAction,
  upvoteQuestionAction,
} from "@/actions/qa";
import { clearClipboardAction, deleteSnippetAction } from "@/actions/snippet";
import { ClipboardPanel } from "@/components/session/clipboard-panel";
import { LiveIndicator } from "@/components/session/live-indicator";
import { QAPanel } from "@/components/session/qa-panel";
import { SessionShell } from "@/components/session/session-shell";
import { useFingerprint } from "@/hooks/use-fingerprint";
import { useIdentity } from "@/hooks/use-identity";
import { useSessionState } from "@/hooks/use-session-state";
import { useSessionUpdates } from "@/hooks/use-session-updates";
import { hashSecret } from "@/lib/hash-secret";
import { loadHostSecret, storeHostSecret } from "@/lib/host-secret";
import type { Session } from "@/lib/session";

interface SessionLiveHostPageProps {
  session: Session;
  sessionSlug: string;
  /** Raw secret passed via query param on first visit after session creation. */
  rawSecret?: string;
  initialSnippets: Snippet[];
  initialQuestions: Question[];
  initialReplies: Reply[];
  /** Rendered in the SessionShell host toolbar slot. */
  hostToolbar?: React.ReactNode;
}

export function SessionLiveHostPage({
  session,
  sessionSlug,
  rawSecret,
  initialSnippets,
  initialQuestions,
  initialReplies,
  hostToolbar,
}: SessionLiveHostPageProps) {
  const [hostSecretHash, setHostSecretHash] = useState<string>("");
  const { name: authorName } = useIdentity();

  // Persist raw secret to localStorage (if provided via query param) and hash it
  useEffect(() => {
    const secret = rawSecret || loadHostSecret(sessionSlug);
    if (!secret) return;
    if (rawSecret) storeHostSecret(sessionSlug, rawSecret);
    hashSecret(secret).then((h) => setHostSecretHash(h));
  }, [sessionSlug, rawSecret]);

  const { fingerprint, votedIds, downvotedIds, addVote, removeVote, addDownvote, removeDownvote } =
    useFingerprint(sessionSlug);

  const { state, dispatch, sortedQuestions, bannedFingerprints } = useSessionState({
    snippets: initialSnippets,
    questions: initialQuestions,
    replies: initialReplies,
  });

  const { connectionStatus, lastHostActivity } = useSessionUpdates(sessionSlug, dispatch);

  // ── Host-specific handlers ────────────────────────────────────────────────

  async function handleDeleteSnippet(snippetId: string) {
    // Optimistic removal
    dispatch({ type: "SNIPPET_DELETED", payload: { snippetId } });
    const result = await deleteSnippetAction({ sessionSlug, hostSecretHash, snippetId });
    if (!result.success) {
      toast.error(result.error, { duration: 5000 });
    }
  }

  async function handleClearClipboard() {
    dispatch({ type: "CLIPBOARD_CLEARED" });
    const result = await clearClipboardAction({ sessionSlug, hostSecretHash });
    if (!result.success) {
      toast.error(result.error, { duration: 5000 });
    }
  }

  async function handleFocusQuestion(questionId: string | undefined) {
    // Optimistic: update focused state locally
    if (questionId) {
      dispatch({ type: "QUESTION_UPDATED", payload: { questionId, isFocused: true } });
    } else {
      // Unfocus all — clear isFocused on every question
      for (const q of state.questions) {
        if (q.isFocused) {
          dispatch({ type: "QUESTION_UPDATED", payload: { questionId: q.id, isFocused: false } });
        }
      }
    }
    const result = await focusQuestionAction({ sessionSlug, hostSecretHash, questionId });
    if (!result.success) {
      toast.error(result.error, { duration: 5000 });
    }
  }

  // ── Shared handlers ───────────────────────────────────────────────────────

  async function handleUpvote(questionId: string, remove: boolean) {
    dispatch({
      type: "QUESTION_UPDATED",
      payload: { questionId, upvoteDelta: remove ? -1 : 1 },
    });
    if (remove) {
      removeVote(questionId);
    } else {
      addVote(questionId);
    }

    const result = await upvoteQuestionAction({
      sessionSlug,
      questionId,
      fingerprint,
      remove,
    });

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
  }

  async function handleAddQuestion(text: string) {
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

    const result = await addQuestionAction({ sessionSlug, text, fingerprint, authorName });
    if (!result.success) {
      dispatch({ type: "REMOVE_OPTIMISTIC", payload: { id: tempId } });
      toast.error(result.error, { duration: 5000 });
    }
  }

  async function handleReply(questionId: string, text: string) {
    const tempId = `_opt_${Date.now()}`;
    const optimisticReply: Reply = {
      id: tempId,
      questionId,
      sessionSlug,
      text,
      isHostReply: true,
      fingerprint,
      createdAt: Math.floor(Date.now() / 1000),
      TTL: 0,
    };

    dispatch({ type: "REPLY_ADDED", payload: optimisticReply });

    const result = await addReplyAction({
      sessionSlug,
      questionId,
      text,
      fingerprint,
      isHostReply: true,
      authorName,
    });

    if (!result.success) {
      dispatch({ type: "REMOVE_OPTIMISTIC", payload: { id: tempId } });
      toast.error(result.error, { duration: 5000 });
    }
  }

  async function handleDownvote(questionId: string, remove: boolean) {
    // Optimistic update
    dispatch({
      type: "QUESTION_UPDATED",
      payload: {
        questionId,
        downvoteCount: (() => {
          const q = state.questions.find((q) => q.id === questionId);
          if (!q) return undefined;
          return remove ? Math.max(0, q.downvoteCount - 1) : q.downvoteCount + 1;
        })(),
      },
    });

    if (remove) {
      removeDownvote(questionId);
    } else {
      addDownvote(questionId);
      if (votedIds.has(questionId)) {
        removeVote(questionId);
        dispatch({
          type: "QUESTION_UPDATED",
          payload: { questionId, upvoteDelta: -1 },
        });
      }
    }

    const result = await downvoteQuestionAction({ sessionSlug, questionId, fingerprint, remove });

    if (!result.success) {
      // Rollback optimistic update
      dispatch({
        type: "QUESTION_UPDATED",
        payload: {
          questionId,
          downvoteCount: (() => {
            const q = state.questions.find((q) => q.id === questionId);
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
  }

  async function handleBanQuestion(questionId: string) {
    // Optimistic: mark banned immediately
    dispatch({ type: "QUESTION_UPDATED", payload: { questionId, isBanned: true } });
    const result = await banQuestionAction({ sessionSlug, hostSecretHash, questionId });
    if (!result.success) {
      // Rollback
      dispatch({ type: "QUESTION_UPDATED", payload: { questionId, isBanned: false } });
      toast.error(result.error, { duration: 5000 });
    }
  }

  async function handleBanParticipant(participantFingerprint: string) {
    const result = await banParticipantAction({
      sessionSlug,
      hostSecretHash,
      fingerprint: participantFingerprint,
    });
    if (!result.success) {
      toast.error(result.error, { duration: 5000 });
    }
  }

  async function handleRestoreQuestion(questionId: string) {
    dispatch({ type: "QUESTION_UPDATED", payload: { questionId, isHidden: false } });
    const result = await restoreQuestionAction({ sessionSlug, hostSecretHash, questionId });
    if (!result.success) {
      dispatch({ type: "QUESTION_UPDATED", payload: { questionId, isHidden: true } });
      toast.error(result.error, { duration: 5000 });
    }
  }

  const isUserBanned = fingerprint ? bannedFingerprints.has(fingerprint) : false;

  return (
    <SessionShell
      title={session.title}
      sessionSlug={sessionSlug}
      isHost
      hostToolbar={hostToolbar}
      snippetCount={state.snippets.length}
      questionCount={state.questions.length}
      liveIndicator={
        <LiveIndicator connectionStatus={connectionStatus} lastHostActivity={lastHostActivity} />
      }
      clipboardSlot={
        <ClipboardPanel
          isHost
          sessionSlug={sessionSlug}
          hostSecretHash={hostSecretHash}
          snippets={state.snippets}
          connectionStatus={connectionStatus}
          onDeleteSnippet={handleDeleteSnippet}
          onClearClipboard={handleClearClipboard}
        />
      }
      qaSlot={
        <QAPanel
          isHost
          sessionSlug={sessionSlug}
          hostSecretHash={hostSecretHash}
          questions={sortedQuestions}
          replies={state.replies}
          fingerprint={fingerprint}
          votedQuestionIds={votedIds}
          downvotedQuestionIds={downvotedIds}
          isUserBanned={isUserBanned}
          onUpvote={handleUpvote}
          onDownvote={handleDownvote}
          onAddQuestion={handleAddQuestion}
          onReply={handleReply}
          onFocus={handleFocusQuestion}
          onBanQuestion={handleBanQuestion}
          onBanParticipant={handleBanParticipant}
          onRestore={handleRestoreQuestion}
        />
      }
    />
  );
}
