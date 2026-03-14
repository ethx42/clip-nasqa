'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus } from 'lucide-react';
import type { Question, Reply } from '@nasqa/core';
import { QuestionCard } from './question-card';
import { QAInput } from './qa-input';
import { NewContentBanner } from './new-content-banner';

interface QAPanelProps {
  isHost?: boolean;
  sessionSlug: string;
  hostSecretHash?: string;
  questions: Question[];
  replies: Reply[];
  fingerprint: string;
  votedQuestionIds: Set<string>;
  downvotedQuestionIds: Set<string>;
  isUserBanned: boolean;
  onUpvote: (questionId: string, remove: boolean) => void;
  onDownvote: (questionId: string, remove: boolean) => void;
  onAddQuestion: (text: string) => void;
  onReply: (questionId: string, text: string) => void;
  onFocus?: (questionId: string | undefined) => void;
  onBanQuestion?: (questionId: string) => void;
  onBanParticipant?: (fingerprint: string) => void;
  onRestore?: (questionId: string) => void;
}

const SCROLL_THRESHOLD = 80; // px scrolled down before showing banner

export function QAPanel({
  isHost = false,
  sessionSlug,
  hostSecretHash,
  questions,
  replies,
  fingerprint,
  votedQuestionIds,
  downvotedQuestionIds,
  isUserBanned,
  onUpvote,
  onDownvote,
  onAddQuestion,
  onReply,
  onFocus,
  onBanQuestion,
  onBanParticipant,
  onRestore,
}: QAPanelProps) {
  const [showNewBanner, setShowNewBanner] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevQuestionCount = useRef(questions.length);

  // Group replies by questionId for efficient lookup
  const repliesByQuestion = new Map<string, Reply[]>();
  for (const reply of replies) {
    const existing = repliesByQuestion.get(reply.questionId) ?? [];
    existing.push(reply);
    repliesByQuestion.set(reply.questionId, existing);
  }

  // Sort: focused question pinned first, then by upvoteCount desc, ties broken by createdAt desc
  // Debounce re-sorting so cards don't jump on every single vote
  const [debouncedQuestions, setDebouncedQuestions] = useState(questions);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuestions(questions), 1000);
    return () => clearTimeout(timer);
  }, [questions]);

  // Always use latest questions for content, but debounced order for sorting
  const sortedQuestions = useMemo(() => {
    // Build order from debounced snapshot
    const orderMap = new Map<string, { upvoteCount: number; isFocused: boolean }>();
    for (const q of debouncedQuestions) {
      orderMap.set(q.id, { upvoteCount: q.upvoteCount, isFocused: !!q.isFocused });
    }

    return [...questions].sort((a, b) => {
      const aOrder = orderMap.get(a.id) ?? { upvoteCount: a.upvoteCount, isFocused: !!a.isFocused };
      const bOrder = orderMap.get(b.id) ?? { upvoteCount: b.upvoteCount, isFocused: !!b.isFocused };
      if (aOrder.isFocused && !bOrder.isFocused) return -1;
      if (!aOrder.isFocused && bOrder.isFocused) return 1;
      if (bOrder.upvoteCount !== aOrder.upvoteCount) return bOrder.upvoteCount - aOrder.upvoteCount;
      return b.createdAt - a.createdAt;
    });
  }, [questions, debouncedQuestions]);

  // Show new content banner when a question arrives and user is scrolled down
  useEffect(() => {
    const newCount = questions.length;
    const oldCount = prevQuestionCount.current;
    prevQuestionCount.current = newCount;

    if (newCount > oldCount) {
      const container = scrollContainerRef.current;
      if (container && container.scrollTop > SCROLL_THRESHOLD) {
        setShowNewBanner(true);
      }
    }
  }, [questions.length]);

  const scrollToTop = useCallback(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    setShowNewBanner(false);
  }, []);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container && container.scrollTop <= SCROLL_THRESHOLD) {
      setShowNewBanner(false);
    }
  }, []);

  const newQuestionCount = Math.max(0, questions.length - prevQuestionCount.current);
  const bannerMessage =
    newQuestionCount === 1 ? 'New question' : `${newQuestionCount} new questions`;

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {/* Scrollable question list */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {/* New question notification banner */}
        <NewContentBanner
          message={bannerMessage}
          visible={showNewBanner}
          onTap={scrollToTop}
        />

        {sortedQuestions.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-14 text-center">
            <MessageSquarePlus className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-base text-muted-foreground">
              Be the first to ask a question!
            </p>
          </div>
        ) : (
          <div className="space-y-4 p-5">
            <AnimatePresence initial={false}>
              {sortedQuestions.map((question) => (
                <motion.div
                  key={question.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{
                    duration: 0.3,
                    layout: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
                  }}
                >
                  <QuestionCard
                    question={question}
                    replies={repliesByQuestion.get(question.id) ?? []}
                    isHost={isHost}
                    fingerprint={fingerprint}
                    sessionSlug={sessionSlug}
                    hostSecretHash={hostSecretHash}
                    votedQuestionIds={votedQuestionIds}
                    downvotedQuestionIds={downvotedQuestionIds}
                    onUpvote={onUpvote}
                    onDownvote={onDownvote}
                    onReply={onReply}
                    onFocus={onFocus}
                    onBanQuestion={onBanQuestion}
                    onBanParticipant={onBanParticipant}
                    onRestore={onRestore}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Sticky Q&A input at bottom */}
      <QAInput onSubmit={onAddQuestion} isBanned={isUserBanned} />
    </div>
  );
}
