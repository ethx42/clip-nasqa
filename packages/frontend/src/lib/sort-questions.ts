import type { Question } from "@nasqa/core";

/**
 * Pure sort utility for Q&A questions.
 *
 * Sort order:
 *   1. Focused questions first (isFocused === true)
 *   2. Then by upvoteCount descending
 *   3. Ties broken by createdAt descending (newer first)
 *
 * Returns a new array — never mutates the input.
 * No React dependency; safe to import in any context.
 */
export function sortQuestions(questions: Question[]): Question[] {
  return [...questions].sort((a, b) => {
    // Focused questions always pin to the top
    if (a.isFocused && !b.isFocused) return -1;
    if (!a.isFocused && b.isFocused) return 1;

    // Higher upvote count ranks first
    if (b.upvoteCount !== a.upvoteCount) return b.upvoteCount - a.upvoteCount;

    // Tiebreak: newer question (larger createdAt epoch) comes first
    return b.createdAt - a.createdAt;
  });
}
