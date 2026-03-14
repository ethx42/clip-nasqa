'use client';

import { MessageSquarePlus } from 'lucide-react';
import type { Question, Reply } from '@nasqa/core';
import { QuestionCard } from './question-card';
import { QAInput } from './qa-input';

interface QAPanelProps {
  isHost?: boolean;
  sessionSlug: string;
  hostSecretHash?: string;
  questions: Question[];
  replies: Reply[];
  fingerprint: string;
  votedQuestionIds: Set<string>;
  onUpvote: (questionId: string, remove: boolean) => void;
  onAddQuestion: (text: string) => void;
  onReply: (questionId: string, text: string) => void;
  onFocus?: (questionId: string | undefined) => void;
}

export function QAPanel({
  isHost = false,
  sessionSlug,
  hostSecretHash,
  questions,
  replies,
  fingerprint,
  votedQuestionIds,
  onUpvote,
  onAddQuestion,
  onReply,
  onFocus,
}: QAPanelProps) {
  // Group replies by questionId for efficient lookup
  const repliesByQuestion = new Map<string, Reply[]>();
  for (const reply of replies) {
    const existing = repliesByQuestion.get(reply.questionId) ?? [];
    existing.push(reply);
    repliesByQuestion.set(reply.questionId, existing);
  }

  // Sort: focused question pinned first, then by upvoteCount desc, ties broken by createdAt desc
  const sortedQuestions = [...questions].sort((a, b) => {
    if (a.isFocused && !b.isFocused) return -1;
    if (!a.isFocused && b.isFocused) return 1;
    if (b.upvoteCount !== a.upvoteCount) return b.upvoteCount - a.upvoteCount;
    return b.createdAt - a.createdAt;
  });

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {/* New question notification banner placeholder — wired in Plan 04 */}
      <div id="qa-new-banner" />

      {/* Scrollable question list */}
      <div className="flex-1 overflow-y-auto">
        {sortedQuestions.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-center">
            <MessageSquarePlus className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Be the first to ask a question!
            </p>
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {sortedQuestions.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                replies={repliesByQuestion.get(question.id) ?? []}
                isHost={isHost}
                fingerprint={fingerprint}
                sessionSlug={sessionSlug}
                hostSecretHash={hostSecretHash}
                votedQuestionIds={votedQuestionIds}
                onUpvote={onUpvote}
                onReply={onReply}
                onFocus={onFocus}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sticky Q&A input at bottom */}
      <QAInput onSubmit={onAddQuestion} />
    </div>
  );
}
