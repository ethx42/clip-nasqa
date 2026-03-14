'use client';

import { useState, useEffect } from 'react';
import type { Session } from '@/lib/session';
import type { Snippet, Question, Reply } from '@nasqa/core';
import { useSessionState } from '@/hooks/use-session-state';
import { useSessionUpdates } from '@/hooks/use-session-updates';
import { useFingerprint } from '@/hooks/use-fingerprint';
import { hashSecret } from '@/lib/hash-secret';
import { SessionShell } from '@/components/session/session-shell';
import { ClipboardPanel } from '@/components/session/clipboard-panel';
import { QAPanel } from '@/components/session/qa-panel';
import { LiveIndicator } from '@/components/session/live-indicator';
import {
  addQuestionAction,
  upvoteQuestionAction,
  addReplyAction,
  focusQuestionAction,
} from '@/actions/qa';
import {
  deleteSnippetAction,
  clearClipboardAction,
} from '@/actions/snippet';

interface SessionLiveHostPageProps {
  session: Session;
  sessionSlug: string;
  initialSnippets: Snippet[];
  initialQuestions: Question[];
  initialReplies: Reply[];
  /** Rendered in the SessionShell host toolbar slot. */
  hostToolbar?: React.ReactNode;
}

/**
 * Client wrapper for the host session view.
 *
 * In addition to participant capabilities, the host page:
 * - Reads the raw secret from window.location.hash (`#secret=...`)
 * - Hashes it client-side via SubtleCrypto and passes to authenticated mutations
 * - Handles pushSnippet, deleteSnippet, clearClipboard, focusQuestion
 */
export function SessionLiveHostPage({
  session,
  sessionSlug,
  initialSnippets,
  initialQuestions,
  initialReplies,
  hostToolbar,
}: SessionLiveHostPageProps) {
  const [hostSecretHash, setHostSecretHash] = useState<string>('');

  // Extract and hash the secret from the URL hash fragment on mount
  useEffect(() => {
    const match = window.location.hash.match(/secret=([^&]+)/);
    if (match?.[1]) {
      hashSecret(decodeURIComponent(match[1])).then((hash) => {
        setHostSecretHash(hash);
      });
    }
  }, []);

  const { fingerprint, votedIds, addVote, removeVote } = useFingerprint(sessionSlug);

  const { state, dispatch, sortedQuestions } = useSessionState({
    snippets: initialSnippets,
    questions: initialQuestions,
    replies: initialReplies,
  });

  const { connectionStatus, lastHostActivity } = useSessionUpdates(sessionSlug, dispatch);

  // ── Host-specific handlers ────────────────────────────────────────────────

  async function handleDeleteSnippet(snippetId: string) {
    // Optimistic removal
    dispatch({ type: 'SNIPPET_DELETED', payload: { snippetId } });
    const result = await deleteSnippetAction({ sessionSlug, hostSecretHash, snippetId });
    if (!result.ok) {
      console.error('deleteSnippetAction failed:', result.error);
    }
  }

  async function handleClearClipboard() {
    dispatch({ type: 'CLIPBOARD_CLEARED' });
    const result = await clearClipboardAction({ sessionSlug, hostSecretHash });
    if (!result.ok) {
      console.error('clearClipboardAction failed:', result.error);
    }
  }

  async function handleFocusQuestion(questionId: string | undefined) {
    // Optimistic: update focused state locally
    if (questionId) {
      dispatch({ type: 'QUESTION_UPDATED', payload: { questionId, isFocused: true } });
    } else {
      // Unfocus all — clear isFocused on every question
      for (const q of state.questions) {
        if (q.isFocused) {
          dispatch({ type: 'QUESTION_UPDATED', payload: { questionId: q.id, isFocused: false } });
        }
      }
    }
    const result = await focusQuestionAction({ sessionSlug, hostSecretHash, questionId });
    if (!result.ok) {
      console.error('focusQuestionAction failed:', result.error);
    }
  }

  // ── Shared handlers ───────────────────────────────────────────────────────

  async function handleUpvote(questionId: string, remove: boolean) {
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

    dispatch({ type: 'REPLY_ADDED', payload: optimisticReply });

    const result = await addReplyAction({
      sessionSlug,
      questionId,
      text,
      fingerprint,
      isHostReply: true,
    });

    if (!result.ok) {
      dispatch({ type: 'REMOVE_OPTIMISTIC', payload: { id: tempId } });
    }
  }

  return (
    <SessionShell
      title={session.title}
      sessionSlug={sessionSlug}
      isHost
      hostToolbar={hostToolbar}
      liveIndicator={
        <LiveIndicator
          connectionStatus={connectionStatus}
          lastHostActivity={lastHostActivity}
        />
      }
      clipboardSlot={
        <ClipboardPanel
          isHost
          sessionSlug={sessionSlug}
          hostSecretHash={hostSecretHash}
          snippets={state.snippets}
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
          onUpvote={handleUpvote}
          onAddQuestion={handleAddQuestion}
          onReply={handleReply}
          onFocus={handleFocusQuestion}
        />
      }
    />
  );
}
