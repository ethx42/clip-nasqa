"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MessageSquarePlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Question, Reply } from "@nasqa/core";

import { sortQuestions } from "@/lib/sort-questions";

import { NewContentBanner } from "./new-content-banner";
import { QAInput } from "./qa-input";
import { QuestionCard } from "./question-card";

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
  const t = useTranslations("session");
  const [showNewBanner, setShowNewBanner] = useState(false);
  const [newQuestionCount, setNewQuestionCount] = useState(0);
  const [announcement, setAnnouncement] = useState("");
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

  // Always use latest questions for content, but debounced order for sorting.
  // Build synthetic questions that carry debounced upvoteCount/isFocused values
  // so cards don't jump on every single vote, then delegate ordering to sortQuestions.
  const sortedQuestions = useMemo(() => {
    const orderMap = new Map<string, { upvoteCount: number; isFocused: boolean }>();
    for (const q of debouncedQuestions) {
      orderMap.set(q.id, { upvoteCount: q.upvoteCount, isFocused: !!q.isFocused });
    }

    const questionsWithDebouncedOrder = questions.map((q) => {
      const debounced = orderMap.get(q.id);
      if (!debounced) return q;
      return { ...q, upvoteCount: debounced.upvoteCount, isFocused: debounced.isFocused };
    });

    return sortQuestions(questionsWithDebouncedOrder);
  }, [questions, debouncedQuestions]);

  // Show new content banner when a question arrives and user is scrolled down
  useEffect(() => {
    const newCount = questions.length;
    const oldCount = prevQuestionCount.current;
    prevQuestionCount.current = newCount;

    if (newCount > oldCount) {
      const diff = newCount - oldCount;
      // Always announce to screen readers, regardless of scroll position

      setAnnouncement(`${diff} new question${diff !== 1 ? "s" : ""}`);
      const container = scrollContainerRef.current;
      if (container && container.scrollTop > SCROLL_THRESHOLD) {
        setShowNewBanner(true);
        setNewQuestionCount((prev) => prev + diff);
      }
    }
  }, [questions.length]);

  const scrollToTop = useCallback(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    setShowNewBanner(false);
    setNewQuestionCount(0);
    setAnnouncement("");
  }, []);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container && container.scrollTop <= SCROLL_THRESHOLD) {
      setShowNewBanner(false);
      setAnnouncement("");
    }
  }, []);

  const bannerMessage = t("newQuestionBanner", { count: newQuestionCount });

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Screen-reader-only live region — permanently mounted to avoid announcement gaps */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* Scrollable question list */}
      <div
        id="qa-feed"
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {/* New question notification banner */}
        <NewContentBanner message={bannerMessage} visible={showNewBanner} onTap={scrollToTop} />

        {sortedQuestions.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
            <MessageSquarePlus className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-base text-muted-foreground">{t("noQuestions")}</p>
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
