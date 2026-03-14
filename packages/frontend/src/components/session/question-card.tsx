'use client';

import { useState } from 'react';
import { ChevronUp, MoreVertical, MessageSquare } from 'lucide-react';
import type { Question, Reply } from '@nasqa/core';
import { linkifyText } from '@/lib/linkify';
import { ReplyList } from './reply-list';
import { cn } from '@/lib/utils';

interface QuestionCardProps {
  question: Question;
  replies: Reply[];
  isHost: boolean;
  fingerprint: string;
  sessionSlug: string;
  hostSecretHash?: string;
  votedQuestionIds: Set<string>;
  onUpvote: (questionId: string, remove: boolean) => void;
  onReply: (questionId: string, text: string) => void;
  onFocus?: (questionId: string | undefined) => void;
}

function formatRelativeTime(createdAt: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diffSeconds = now - createdAt;

  if (diffSeconds < 60) return 'just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return `${Math.floor(diffSeconds / 86400)}d ago`;
}

export function QuestionCard({
  question,
  replies,
  isHost,
  fingerprint,
  hostSecretHash,
  votedQuestionIds,
  onUpvote,
  onReply,
  onFocus,
}: QuestionCardProps) {
  const [showReplies, setShowReplies] = useState(question.isFocused);
  const [showHostMenu, setShowHostMenu] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');

  const isVoted = votedQuestionIds.has(question.id);
  const isOwn = question.fingerprint === fingerprint;
  const REPLY_CHAR_LIMIT = 500;
  const REPLY_COUNTER_THRESHOLD = Math.floor(REPLY_CHAR_LIMIT * 0.8);

  function handleUpvoteClick() {
    onUpvote(question.id, isVoted);
  }

  function handleReplySubmit() {
    const trimmed = replyText.trim();
    if (!trimmed || trimmed.length > REPLY_CHAR_LIMIT) return;
    onReply(question.id, trimmed);
    setReplyText('');
    setShowReplyInput(false);
  }

  function handleReplyKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleReplySubmit();
    }
  }

  function handleFocusToggle() {
    setShowHostMenu(false);
    if (question.isFocused) {
      onFocus?.(undefined);
    } else {
      onFocus?.(question.id);
    }
  }

  void hostSecretHash; // used by parent when calling focusQuestionAction

  return (
    <div
      className={cn(
        'relative rounded-xl border border-border bg-card p-4 transition-all',
        question.isFocused &&
          'ring-2 ring-emerald-500/50 animate-pulse border-emerald-500/30'
      )}
    >
      {question.isFocused && (
        <div className="mb-2 flex items-center gap-1.5">
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-emerald-500">
            Focused
          </span>
        </div>
      )}

      <div className="flex gap-3">
        {/* Upvote column */}
        <div className="flex flex-col items-center gap-0.5 pt-0.5">
          <button
            onClick={handleUpvoteClick}
            aria-label={isVoted ? 'Remove upvote' : 'Upvote question'}
            className={cn(
              'rounded p-1 transition-colors hover:bg-accent',
              isVoted ? 'text-emerald-500' : 'text-muted-foreground'
            )}
          >
            <ChevronUp className="h-5 w-5" />
          </button>
          <span
            className={cn(
              'text-xs font-semibold tabular-nums',
              isVoted ? 'text-emerald-500' : 'text-muted-foreground'
            )}
          >
            {question.upvoteCount}
          </span>
        </div>

        {/* Content column */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="break-words text-sm leading-relaxed text-foreground">
              {linkifyText(question.text)}
            </p>

            {/* Host actions menu */}
            {isHost && (
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setShowHostMenu((v) => !v)}
                  aria-label="Question actions"
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>

                {showHostMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowHostMenu(false)}
                    />
                    <div className="absolute right-0 top-full z-20 mt-1 min-w-[120px] rounded-lg border border-border bg-popover py-1 shadow-lg">
                      <button
                        onClick={handleFocusToggle}
                        className="block w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-accent"
                      >
                        {question.isFocused ? 'Unfocus' : 'Focus'}
                      </button>
                      <button
                        onClick={() => setShowHostMenu(false)}
                        className="block w-full px-3 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent"
                        disabled
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Metadata row */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {isOwn && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                You
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(question.createdAt)}
            </span>

            {/* Reply count toggle */}
            {replies.length > 0 && (
              <button
                onClick={() => setShowReplies((v) => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <MessageSquare className="h-3 w-3" />
                {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
              </button>
            )}

            {/* Reply button */}
            <button
              onClick={() => setShowReplyInput((v) => !v)}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Reply
            </button>
          </div>

          {/* Inline reply input */}
          {showReplyInput && (
            <div className="mt-3">
              <div className="relative">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={handleReplyKeyDown}
                  placeholder="Write a reply..."
                  rows={2}
                  maxLength={REPLY_CHAR_LIMIT}
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
                <div className="mt-1 flex items-center justify-between">
                  {replyText.length >= REPLY_COUNTER_THRESHOLD ? (
                    <span
                      className={cn(
                        'text-xs tabular-nums',
                        replyText.length >= 490
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                      )}
                    >
                      {replyText.length}/{REPLY_CHAR_LIMIT}
                    </span>
                  ) : (
                    <span />
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowReplyInput(false);
                        setReplyText('');
                      }}
                      className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReplySubmit}
                      disabled={
                        !replyText.trim() ||
                        replyText.length > REPLY_CHAR_LIMIT
                      }
                      className="rounded bg-emerald-600 px-2 py-1 text-xs text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Expanded reply list */}
          {showReplies && replies.length > 0 && (
            <div className="mt-3">
              <ReplyList replies={replies} isHost={isHost} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
