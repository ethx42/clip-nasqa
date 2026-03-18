"use client";

import { useEffect, useRef, useState } from "react";

import type { Question, Reply, Snippet } from "@nasqa/core";

import { ClipboardPanel } from "@/components/session/clipboard-panel";
import { JoinModal, shouldShowJoinModal } from "@/components/session/join-modal";
import { LiveIndicator } from "@/components/session/live-indicator";
import { QAPanel } from "@/components/session/qa-panel";
import { SessionShell } from "@/components/session/session-shell";
import { useFingerprint } from "@/hooks/use-fingerprint";
import { useIdentity } from "@/hooks/use-identity";
import { useSessionMutations } from "@/hooks/use-session-mutations";
import { useSessionState } from "@/hooks/use-session-state";
import { useSessionUpdates } from "@/hooks/use-session-updates";
import type { Session } from "@/lib/session";

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
 * - Delegate mutation logic to useSessionMutations
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initializing modal visibility from sessionStorage on mount
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

  // Keep a ref to the current questions array to avoid stale closures in mutation rollbacks
  const questionsRef = useRef(state.questions);
  useEffect(() => {
    questionsRef.current = state.questions;
  }, [state.questions]);

  const { connectionStatus, lastHostActivity } = useSessionUpdates(sessionSlug, dispatch);

  const { handleUpvote, handleDownvote, handleAddQuestion, handleReply } = useSessionMutations({
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
    isHostReply: false,
  });

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
        snippetCount={state.snippets.length}
        questionCount={state.questions.length}
        liveIndicator={
          <LiveIndicator connectionStatus={connectionStatus} lastHostActivity={lastHostActivity} />
        }
        clipboardSlot={
          <ClipboardPanel
            sessionSlug={sessionSlug}
            snippets={state.snippets}
            connectionStatus={connectionStatus}
          />
        }
        qaSlot={
          <QAPanel
            sessionSlug={sessionSlug}
            questions={sortedQuestions}
            replies={state.replies}
            fingerprint={fingerprint}
            authorName={authorName}
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
