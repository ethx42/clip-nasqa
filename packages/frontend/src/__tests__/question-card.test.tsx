import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import type { Question, Reply } from "@nasqa/core";

import { QuestionCard } from "@/components/session/question-card";

import messages from "../../messages/en.json";

// Base question fixture
const baseQuestion: Question = {
  id: "q1",
  sessionSlug: "test-session",
  text: "What is the meaning of life?",
  fingerprint: "fp-viewer",
  authorName: undefined,
  upvoteCount: 5,
  downvoteCount: 1,
  isHidden: false,
  isFocused: false,
  isBanned: false,
  createdAt: Math.floor(Date.now() / 1000) - 30, // 30 seconds ago
  TTL: Math.floor(Date.now() / 1000) + 86400,
};

const noReplies: Reply[] = [];

interface RenderCardOptions {
  question?: Partial<Question>;
  replies?: Reply[];
  isHost?: boolean;
  fingerprint?: string;
}

function renderCard({
  question,
  replies = noReplies,
  isHost = false,
  fingerprint = "fp-other",
}: RenderCardOptions = {}) {
  const q: Question = { ...baseQuestion, ...question };
  const onUpvote = vi.fn();
  const onDownvote = vi.fn();
  const onReply = vi.fn();

  const result = render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <QuestionCard
        question={q}
        replies={replies}
        isHost={isHost}
        fingerprint={fingerprint}
        sessionSlug="test-session"
        votedQuestionIds={new Set()}
        downvotedQuestionIds={new Set()}
        onUpvote={onUpvote}
        onDownvote={onDownvote}
        onReply={onReply}
      />
    </NextIntlClientProvider>,
  );

  return { ...result, onUpvote, onDownvote, onReply };
}

describe("QuestionCard", () => {
  it("renders question text content", () => {
    renderCard();
    expect(screen.getByText("What is the meaning of life?")).toBeInTheDocument();
  });

  it("shows upvote count", () => {
    renderCard();
    // upvoteCount is 5
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("calls onUpvote handler when upvote button is clicked", async () => {
    const user = userEvent.setup();
    const { onUpvote } = renderCard();

    const upvoteButton = screen.getByRole("button", { name: /upvote question/i });
    await user.click(upvoteButton);

    expect(onUpvote).toHaveBeenCalledWith("q1", false);
  });

  it("shows 'You' when question fingerprint matches viewer fingerprint", () => {
    renderCard({ fingerprint: "fp-viewer" });
    expect(screen.getByText("You")).toBeInTheDocument();
  });

  it("shows author name when provided", () => {
    // viewer fingerprint "fp-viewer" differs from question fingerprint "fp-author"
    renderCard({
      question: { fingerprint: "fp-author", authorName: "Santiago Torres" },
      fingerprint: "fp-viewer",
    });
    // formatDisplayName: "Santiago T."
    expect(screen.getByText("Santiago T.")).toBeInTheDocument();
  });

  it("shows tombstone when isBanned is true (regardless of viewer)", () => {
    renderCard({ question: { isBanned: true } });
    expect(screen.getByText("This question was removed.")).toBeInTheDocument();
    expect(screen.queryByText("What is the meaning of life?")).not.toBeInTheDocument();
  });

  it("shows reply count toggle button when replies exist", () => {
    const replies: Reply[] = [
      {
        id: "r1",
        questionId: "q1",
        sessionSlug: "test-session",
        text: "Great question!",
        isHostReply: false,
        fingerprint: "fp-other",
        createdAt: Math.floor(Date.now() / 1000) - 10,
        TTL: Math.floor(Date.now() / 1000) + 86400,
      },
    ];
    renderCard({ replies });
    // "1 reply" button should be visible
    expect(screen.getByText(/1 reply/i)).toBeInTheDocument();
  });

  it("shows Anonymous when no author name and not own question", () => {
    renderCard({
      question: { fingerprint: "fp-other", authorName: undefined },
      fingerprint: "fp-viewer",
    });
    expect(screen.getByText("Anonymous")).toBeInTheDocument();
  });

  it("shows moderation controls when isHost is true", () => {
    renderCard({ isHost: true });
    // Host toolbar: "Remove question" (banQuestion key) and "Ban participant"
    expect(screen.getByRole("button", { name: /remove question/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ban participant/i })).toBeInTheDocument();
  });

  it("does not show moderation controls when isHost is false", () => {
    renderCard({ isHost: false });
    expect(screen.queryByRole("button", { name: /remove question/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /ban participant/i })).not.toBeInTheDocument();
  });
});
