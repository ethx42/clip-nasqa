"use client";

import { useEffect, useRef, useState } from "react";

import type { Question, Reply, Snippet } from "@nasqa/core";

import { AppHeader } from "@/components/app-header";
import { ClipboardPanel } from "@/components/session/clipboard-panel";
import { HostToolbar } from "@/components/session/host-toolbar";
import { LiveIndicator } from "@/components/session/live-indicator";
import { QAPanel } from "@/components/session/qa-panel";
import { SessionShell } from "@/components/session/session-shell";
import { useFingerprint } from "@/hooks/use-fingerprint";
import { useHostMutations } from "@/hooks/use-host-mutations";
import { useHostSnippetPush } from "@/hooks/use-host-snippet-push";
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
  /** URL participants use to join — used to render the share popover in the header. */
  participantUrl: string;
}

export function SessionLiveHostPage({
  session,
  sessionCode,
  rawSecret,
  initialSnippets,
  initialQuestions,
  initialReplies,
  participantUrl,
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

  const {
    state,
    dispatch,
    sortedQuestions,
    bannedFingerprints,
    failedSnippetIds,
    editingSnippetIds,
  } = useSessionState({
    snippets: initialSnippets,
    questions: initialQuestions,
    replies: initialReplies,
  });

  // Keep a ref to the current questions array to avoid stale closures in mutation rollbacks
  const questionsRef = useRef(state.questions);
  useEffect(() => {
    questionsRef.current = state.questions;
  }, [state.questions]);

  // Keep refs to replies and snippets for host edit/delete rollback
  const repliesRef = useRef(state.replies);
  useEffect(() => {
    repliesRef.current = state.replies;
  }, [state.replies]);

  const snippetsRef = useRef(state.snippets);
  useEffect(() => {
    snippetsRef.current = state.snippets;
  }, [state.snippets]);

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
    handleHostEditQuestion,
    handleHostDeleteQuestion,
    handleHostEditReply,
    handleHostDeleteReply,
    handleEditSnippet,
    handleHardDeleteQuestion,
    handleHardDeleteReply,
    handleHardDeleteSnippet,
  } = useHostMutations({
    sessionCode,
    hostSecretHash,
    dispatch,
    questionsRef,
    repliesRef,
    snippetsRef,
  });

  const { handlePush, handleEditStart, handleEditEnd, handleRetry, handleDismissFailed } =
    useHostSnippetPush({
      sessionCode,
      hostSecretHash,
      dispatch,
      snippetsLength: state.snippets.length,
      editingSnippetIds,
    });

  const isUserBanned = fingerprint ? bannedFingerprints.has(fingerprint) : false;

  const sessionContextNode = (
    <>
      <h1 className="truncate text-sm font-bold text-foreground">{session.title}</h1>
      <LiveIndicator connectionStatus={connectionStatus} lastHostActivity={lastHostActivity} />
    </>
  );

  return (
    <>
      <AppHeader
        sessionContext={sessionContextNode}
        shareSlot={<HostToolbar participantUrl={participantUrl} sessionCode={sessionCode} />}
      />
      <SessionShell
        sessionCode={sessionCode}
        isHost
        snippetCount={state.snippets.length}
        questionCount={state.questions.length}
        clipboardSlot={
          <ClipboardPanel
            isHost
            sessionCode={sessionCode}
            hostSecretHash={hostSecretHash}
            snippets={state.snippets}
            connectionStatus={connectionStatus}
            onDeleteSnippet={handleDeleteSnippet}
            onClearClipboard={handleClearClipboard}
            onPush={handlePush}
            onRetryFailed={handleRetry}
            onDismissFailed={handleDismissFailed}
            onEditStart={handleEditStart}
            onEditEnd={handleEditEnd}
            onEditSnippet={handleEditSnippet}
            failedSnippetIds={failedSnippetIds}
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
            onEditQuestion={handleHostEditQuestion}
            onDeleteQuestion={handleHostDeleteQuestion}
            onHardDeleteQuestion={handleHardDeleteQuestion}
            onEditReply={handleHostEditReply}
            onDeleteReply={handleHostDeleteReply}
            onHardDeleteReply={handleHardDeleteReply}
            isMutationPending={isMutationPending}
            restoredInputText={restoredInputText}
          />
        }
      />
    </>
  );
}
