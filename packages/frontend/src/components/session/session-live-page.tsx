'use client';

import type { Session } from '@/lib/session';
import type { Snippet, Question, Reply } from '@nasqa/core';
import { useSessionState } from '@/hooks/use-session-state';
import { useSessionUpdates } from '@/hooks/use-session-updates';
import { useFingerprint } from '@/hooks/use-fingerprint';
import { SessionShell } from '@/components/session/session-shell';
import { ClipboardPanel } from '@/components/session/clipboard-panel';
import { QAPanel } from '@/components/session/qa-panel';
import {
  addQuestionAction,
  upvoteQuestionAction,
  addReplyAction,
} from '@/actions/qa';

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
  const { fingerprint, votedIds, addVote, removeVote } = useFingerprint(sessionSlug);

  const { state, dispatch, sortedQuestions } = useSessionState({
    snippets: initialSnippets,
    questions: initialQuestions,
    replies: initialReplies,
  });

  useSessionUpdates(sessionSlug, dispatch);

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
      upvoteCount: 0,
      downvoteCount: 0,
      isHidden: false,
      isFocused: false,
      isBanned: false,
      createdAt: Math.floor(Date.now() / 1000),
      TTL: 0,
    };

    dispatch({ type: 'ADD_QUESTION_OPTIMISTIC', payload: optimisticQuestion });

    const result = await addQuestionAction({ sessionSlug, text, fingerprint });

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
    });

    if (!result.ok) {
      // Rollback: remove optimistic reply
      dispatch({ type: 'REMOVE_OPTIMISTIC', payload: { id: tempId } });
    }
  }

  return (
    <SessionShell
      title={session.title}
      sessionSlug={sessionSlug}
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
          onUpvote={handleUpvote}
          onAddQuestion={handleAddQuestion}
          onReply={handleReply}
        />
      }
    />
  );
}
