'use client';

import { useState, useEffect } from 'react';
import type { Session } from '@/lib/session';
import type { Snippet, Question, Reply } from '@nasqa/core';
import { useSessionState } from '@/hooks/use-session-state';
import { useSessionUpdates } from '@/hooks/use-session-updates';
import { useFingerprint } from '@/hooks/use-fingerprint';
import { useIdentity } from '@/hooks/use-identity';
import { SessionShell } from '@/components/session/session-shell';
import { ClipboardPanel } from '@/components/session/clipboard-panel';
import { QAPanel } from '@/components/session/qa-panel';
import { LiveIndicator } from '@/components/session/live-indicator';
import { JoinModal, shouldShowJoinModal } from '@/components/session/join-modal';
import {
  addQuestionAction,
  upvoteQuestionAction,
  addReplyAction,
} from '@/actions/qa';
import { downvoteQuestionAction } from '@/actions/moderation';

interface SessionLivePageProps {
  session: Session;
  sessionSlug: string;
  initialSnippets: Snippet[];
  initialQuestions: Question[];
  initialReplies: Reply[];
}

/**
 * Client wrapper for the participant session view.
 *
 * Responsibilities:
 * - Mount useSessionState with SSR-loaded initial data
 * - Connect AppSync subscription via useSessionUpdates
 * - Provide fingerprint and vote tracking via useFingerprint
 * - Handle optimistic mutations with rollback on error
 * - Pass live state down to ClipboardPanel and QAPanel
 */
export function SessionLivePage({
  session,
  sessionSlug,
  initialSnippets,
  initialQuestions,
  initialReplies,
}: SessionLivePageProps) {
  const { name: authorName } = useIdentity();
  const [joinModalOpen, setJoinModalOpen] = useState(false);

  // Show JoinModal once per session (sessionStorage flag)
  useEffect(() => {
    if (shouldShowJoinModal(sessionSlug)) {
      setJoinModalOpen(true);
    }
  }, [sessionSlug]);

  const { fingerprint, votedIds, downvotedIds, addVote, removeVote, addDownvote, removeDownvote } =
    useFingerprint(sessionSlug);

  const { state, dispatch, sortedQuestions, bannedFingerprints } = useSessionState({
    snippets: initialSnippets,
    questions: initialQuestions,
    replies: initialReplies,
  });

  const { connectionStatus, lastHostActivity } = useSessionUpdates(sessionSlug, dispatch);

  async function handleUpvote(questionId: string, remove: boolean) {
    // Optimistic update
    dispatch({
      type: 'QUESTION_UPDATED',
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

    if (!result.ok) {
      // Rollback optimistic update
      dispatch({
        type: 'QUESTION_UPDATED',
        payload: { questionId, upvoteDelta: remove ? 1 : -1 },
      });
      if (remove) {
        addVote(questionId);
      } else {
        removeVote(questionId);
      }
    }
  }

  async function handleAddQuestion(text: string) {
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

    dispatch({ type: 'ADD_QUESTION_OPTIMISTIC', payload: optimisticQuestion });

    const result = await addQuestionAction({ sessionSlug, text, fingerprint, authorName });

    if (!result.ok) {
      dispatch({ type: 'REMOVE_OPTIMISTIC', payload: { id: tempId } });
    }
    // On success: subscription event will arrive and replace the optimistic item
  }

  async function handleReply(questionId: string, text: string) {
    // Optimistic reply with temp id
    const tempId = `_opt_${Date.now()}`;
    const optimisticReply: Reply = {
      id: tempId,
      questionId,
      sessionSlug,
      text,
      isHostReply: false,
      fingerprint,
      createdAt: Math.floor(Date.now() / 1000),
      TTL: 0,
    };

    dispatch({ type: 'REPLY_ADDED', payload: optimisticReply });

    const result = await addReplyAction({
      sessionSlug,
      questionId,
      text,
      fingerprint,
      isHostReply: false,
      authorName,
    });

    if (!result.ok) {
      // Rollback: remove optimistic reply
      dispatch({ type: 'REMOVE_OPTIMISTIC', payload: { id: tempId } });
    }
  }

  async function handleDownvote(questionId: string, remove: boolean) {
    // Optimistic update
    dispatch({
      type: 'QUESTION_UPDATED',
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
      // Mutually exclusive: remove upvote state client-side if downvoting
      if (votedIds.has(questionId)) {
        removeVote(questionId);
        dispatch({
          type: 'QUESTION_UPDATED',
          payload: { questionId, upvoteDelta: -1 },
        });
      }
    }

    const result = await downvoteQuestionAction({ sessionSlug, questionId, fingerprint, remove });

    if (!result.ok) {
      // Rollback optimistic update
      dispatch({
        type: 'QUESTION_UPDATED',
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
    }
  }

  const isUserBanned = fingerprint ? bannedFingerprints.has(fingerprint) : false;

  return (
    <>
      <JoinModal
        sessionSlug={sessionSlug}
        open={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
      />
      <SessionShell
        title={session.title}
        sessionSlug={sessionSlug}
        liveIndicator={
          <LiveIndicator
            connectionStatus={connectionStatus}
            lastHostActivity={lastHostActivity}
          />
        }
        clipboardSlot={
          <ClipboardPanel
            sessionSlug={sessionSlug}
            snippets={state.snippets}
          />
        }
        qaSlot={
          <QAPanel
            sessionSlug={sessionSlug}
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
          />
        }
      />
    </>
  );
}
