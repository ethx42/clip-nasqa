import { describe, expect, it } from "vitest";

import type { Question } from "@nasqa/core";

import { sortQuestions } from "@/lib/sort-questions";

function makeQuestion(overrides: Partial<Question> & { id: string }): Question {
  return {
    sessionCode: "test-session",
    text: "Test question",
    fingerprint: "fp-1",
    isHostQuestion: false,
    upvoteCount: 0,
    downvoteCount: 0,
    isHidden: false,
    isFocused: false,
    isBanned: false,
    createdAt: 1000,
    TTL: 9999999999,
    ...overrides,
  };
}

describe("sortQuestions", () => {
  it("returns an empty array when given an empty array", () => {
    expect(sortQuestions([])).toEqual([]);
  });

  it("returns a single-item array unchanged", () => {
    const q = makeQuestion({ id: "q1", upvoteCount: 5 });
    const result = sortQuestions([q]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("q1");
  });

  it("puts a focused question first regardless of vote count", () => {
    const highVotes = makeQuestion({ id: "high", upvoteCount: 100 });
    const focused = makeQuestion({ id: "focused", upvoteCount: 0, isFocused: true });
    const result = sortQuestions([highVotes, focused]);
    expect(result[0].id).toBe("focused");
    expect(result[1].id).toBe("high");
  });

  it("sorts non-focused questions by upvoteCount descending", () => {
    const low = makeQuestion({ id: "low", upvoteCount: 1 });
    const high = makeQuestion({ id: "high", upvoteCount: 99 });
    const mid = makeQuestion({ id: "mid", upvoteCount: 42 });
    const result = sortQuestions([low, mid, high]);
    expect(result.map((q) => q.id)).toEqual(["high", "mid", "low"]);
  });

  it("breaks upvote ties by createdAt descending (newer first)", () => {
    const older = makeQuestion({ id: "older", upvoteCount: 5, createdAt: 1000 });
    const newer = makeQuestion({ id: "newer", upvoteCount: 5, createdAt: 2000 });
    const result = sortQuestions([older, newer]);
    expect(result[0].id).toBe("newer");
    expect(result[1].id).toBe("older");
  });

  it("multiple focused questions maintain relative vote/recency order among themselves", () => {
    const focusedLow = makeQuestion({
      id: "f-low",
      upvoteCount: 1,
      isFocused: true,
      createdAt: 1000,
    });
    const focusedHigh = makeQuestion({
      id: "f-high",
      upvoteCount: 10,
      isFocused: true,
      createdAt: 500,
    });
    const focusedTied1 = makeQuestion({
      id: "f-tied-old",
      upvoteCount: 5,
      isFocused: true,
      createdAt: 800,
    });
    const focusedTied2 = makeQuestion({
      id: "f-tied-new",
      upvoteCount: 5,
      isFocused: true,
      createdAt: 1200,
    });
    const unfocused = makeQuestion({ id: "unfocused", upvoteCount: 999 });

    const result = sortQuestions([unfocused, focusedLow, focusedHigh, focusedTied1, focusedTied2]);
    // All focused first
    expect(result[0].isFocused).toBe(true);
    expect(result[1].isFocused).toBe(true);
    expect(result[2].isFocused).toBe(true);
    expect(result[3].isFocused).toBe(true);
    // Unfocused last
    expect(result[4].id).toBe("unfocused");
    // Among focused: sorted by upvoteCount desc, then createdAt desc
    const focusedIds = result.slice(0, 4).map((q) => q.id);
    expect(focusedIds[0]).toBe("f-high"); // highest votes
    expect(focusedIds[1]).toBe("f-tied-new"); // tie on 5 votes, newer
    expect(focusedIds[2]).toBe("f-tied-old"); // tie on 5 votes, older
    expect(focusedIds[3]).toBe("f-low"); // lowest votes
  });

  it("does not mutate the input array", () => {
    const questions = [
      makeQuestion({ id: "q2", upvoteCount: 1, createdAt: 1000 }),
      makeQuestion({ id: "q1", upvoteCount: 10, createdAt: 2000 }),
    ];
    const inputCopy = [...questions];
    sortQuestions(questions);
    // Input array order should be unchanged
    expect(questions[0].id).toBe(inputCopy[0].id);
    expect(questions[1].id).toBe(inputCopy[1].id);
  });
});
