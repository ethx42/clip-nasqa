"use client";

import { useEffect, useRef, useState } from "react";

import type { Question, Reply, Snippet } from "@nasqa/core";

import { ClipboardPanel } from "@/components/session/clipboard-panel";
import { LiveIndicator } from "@/components/session/live-indicator";
import { QAPanel } from "@/components/session/qa-panel";
import { SessionShell } from "@/components/session/session-shell";
import { useFingerprint } from "@/hooks/use-fingerprint";
import { useHostMutations } from "@/hooks/use-host-mutations";
import { useIdentity } from "@/hooks/use-identity";
import { useSessionMutations } from "@/hooks/use-session-mutations";
import { useSessionState } from "@/hooks/use-session-state";
import { useSessionUpdates } from "@/hooks/use-session-updates";
import { hashSecret } from "@/lib/hash-secret";
import { loadHostSecret, storeHostSecret } from "@/lib/host-secret";
import type { Session } from "@/lib/session";

interface SessionLiveHostPageProps {
  session: Session;
  sessionCode: string;
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
  sessionCode,
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
    const secret = rawSecret || loadHostSecret(sessionCode);
    if (!secret) return;
    if (rawSecret) storeHostSecret(sessionCode, rawSecret);
    hashSecret(secret).then((h) => setHostSecretHash(h));
  }, [sessionCode, rawSecret]);

  const { fingerprint, votedIds, downvotedIds, addVote, removeVote, addDownvote, removeDownvote } =
    useFingerprint(sessionCode);

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

  const { connectionStatus, lastHostActivity } = useSessionUpdates(sessionCode, dispatch);

  const {
    handleUpvote,
    handleDownvote,
    handleAddQuestion,
    handleReply,
    isPending: isMutationPending,
    restoredText: restoredInputText,
  } = useSessionMutations({
    sessionCode,
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
    isHostReply: true,
  });

  const {
    handleDeleteSnippet,
    handleClearClipboard,
    handleFocusQuestion,
    handleBanQuestion,
    handleBanParticipant,
    handleRestoreQuestion,
  } = useHostMutations({
    sessionCode,
    hostSecretHash,
    dispatch,
    questionsRef,
  });

  const isUserBanned = fingerprint ? bannedFingerprints.has(fingerprint) : false;

  return (
    <SessionShell
      title={session.title}
      sessionCode={sessionCode}
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
          sessionCode={sessionCode}
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
          sessionCode={sessionCode}
          hostSecretHash={hostSecretHash}
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
          onFocus={handleFocusQuestion}
          onBanQuestion={handleBanQuestion}
          onBanParticipant={handleBanParticipant}
          onRestore={handleRestoreQuestion}
          isMutationPending={isMutationPending}
          restoredInputText={restoredInputText}
        />
      }
    />
  );
}
