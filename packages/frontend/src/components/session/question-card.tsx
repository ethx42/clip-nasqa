"use client";

import type { Reply } from "@nasqa/core";

import { QuestionCardHost } from "./question-card-host";
import { QuestionCardParticipant } from "./question-card-participant";
import type { QuestionCardBaseProps } from "./question-card-shared";

interface QuestionCardProps extends QuestionCardBaseProps {
  replies: Reply[];
}

/**
 * Thin facade that routes to the correct variant based on `isHost`.
 * - isHost=true  → QuestionCardHost (moderation toolbar + ban dialog)
 * - isHost=false → QuestionCardParticipant (no moderation controls)
 *
 * Preserves backward compatibility: all existing consumers can keep
 * importing from "./question-card" unchanged.
 */
export function QuestionCard({ isHost, ...props }: QuestionCardProps) {
  if (isHost) {
    return <QuestionCardHost {...props} isHost={true} />;
  }
  return <QuestionCardParticipant {...props} />;
}
