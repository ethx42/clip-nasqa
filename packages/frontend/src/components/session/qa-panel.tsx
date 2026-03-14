'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  onUpvote: (questionId: string, remove: boolean) => void;
  onAddQuestion: (text: string) => void;
  onReply: (questionId: string, text: string) => void;
  onFocus?: (questionId: string | undefined) => void;
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
  onUpvote,
  onAddQuestion,
  onReply,
  onFocus,
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
  const sortedQuestions = [...questions].sort((a, b) => {
    if (a.isFocused && !b.isFocused) return -1;
    if (!a.isFocused && b.isFocused) return 1;
    if (b.upvoteCount !== a.upvoteCount) return b.upvoteCount - a.upvoteCount;
    return b.createdAt - a.createdAt;
  });

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
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-center">
            <MessageSquarePlus className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Be the first to ask a question!
            </p>
          </div>
        ) : (
          <div className="space-y-3 p-4">
            <AnimatePresence initial={false}>
              {sortedQuestions.map((question) => (
                <motion.div
                  key={question.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <QuestionCard
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
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Sticky Q&A input at bottom */}
      <QAInput onSubmit={onAddQuestion} />
    </div>
  );
}
