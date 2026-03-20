"use client";

import { useCallback, useReducer } from "react";

import type { Question, ReactionCounts, Reply, Snippet } from "@nasqa/core";

// ── Action types ──────────────────────────────────────────────────────────────

export type SessionAction =
  | { type: "SNIPPET_ADDED"; payload: Snippet; optimisticId?: string }
  | { type: "SNIPPET_DELETED"; payload: { snippetId: string } }
  | { type: "CLIPBOARD_CLEARED" }
  | { type: "QUESTION_ADDED"; payload: Question; optimisticId?: string }
  | {
      type: "QUESTION_UPDATED";
      payload: {
        questionId: string;
        upvoteDelta?: number;
        upvoteCount?: number;
        downvoteCount?: number;
        isFocused?: boolean;
        isBanned?: boolean;
        isHidden?: boolean;
      };
    }
  | { type: "PARTICIPANT_BANNED"; payload: { fingerprint: string } }
  | { type: "REPLY_ADDED"; payload: Reply }
  | { type: "ADD_SNIPPET_OPTIMISTIC"; payload: Snippet }
  | { type: "ADD_QUESTION_OPTIMISTIC"; payload: Question }
  | { type: "REMOVE_OPTIMISTIC"; payload: { id: string } }
  | { type: "SNIPPET_PUSH_FAILED"; payload: { id: string } }
  | { type: "SNIPPET_RETRY"; payload: { id: string } }
  | { type: "SNIPPET_EDIT_START"; payload: { id: string } }
  | { type: "SNIPPET_EDIT_END"; payload: { id: string; content: string } }
  | {
      type: "REACTION_UPDATED";
      payload: {
        targetId: string;
        targetType: "QUESTION" | "REPLY";
        counts: ReactionCounts;
        reactionOrder: string[];
      };
    }
  | { type: "QUESTION_EDITED"; payload: { questionId: string; text: string; editedAt: number } }
  | { type: "QUESTION_DELETED"; payload: { questionId: string } }
  | { type: "REPLY_EDITED"; payload: { replyId: string; text: string; editedAt: number } }
  | { type: "REPLY_DELETED"; payload: { replyId: string } }
  | {
      type: "SNIPPET_EDITED";
      payload: { snippetId: string; content: string; language?: string; editedAt: number };
    }
  | { type: "QUESTION_HARD_DELETED"; payload: { questionId: string } }
  | { type: "REPLY_HARD_DELETED"; payload: { replyId: string } }
  | { type: "SNIPPET_HARD_DELETED"; payload: { snippetId: string } };

// ── State shape ───────────────────────────────────────────────────────────────

interface SessionState {
  /** Reverse-chronological (newest first). */
  snippets: Snippet[];
  /** Stored unsorted — sorted by selector (sortedQuestions). */
  questions: Question[];
  /** All replies; grouped by questionId via repliesByQuestion helper. */
  replies: Reply[];
  /** Fingerprints of banned participants — used to disable QAInput for banned users. */
  bannedFingerprints: Set<string>;
  /** Snippet IDs that failed to push to the server. */
  failedSnippetIds: Set<string>;
  /** Snippet IDs currently being inline-edited (defers server push). */
  editingSnippetIds: Set<string>;
}

// ── Reducer ───────────────────────────────────────────────────────────────────

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "SNIPPET_ADDED": {
      const s = action.payload;
      let snippets: Snippet[];
      let nextFailedIds = state.failedSnippetIds;

      if (action.optimisticId) {
        // Replace optimistic placeholder if present
        const replaced = state.snippets.some((x) => x.id === action.optimisticId);
        snippets = replaced
          ? state.snippets.map((x) => (x.id === action.optimisticId ? s : x))
          : [s, ...state.snippets];
      } else {
        // Deduplicate: avoid adding if already present (e.g. after optimistic update)
        const exists = state.snippets.some((x) => x.id === s.id);
        if (exists) {
          snippets = state.snippets;
        } else {
          // Content-fingerprint dedup: replace matching _opt_ placeholder without optimisticId
          const hasOptimistic = state.snippets.some(
            (x) =>
              x.id.startsWith("_opt_") &&
              x.sessionCode === s.sessionCode &&
              x.content === s.content &&
              (x.language ?? null) === (s.language ?? null) &&
              x.type === s.type,
          );
          if (hasOptimistic) {
            // Find the optimistic ID to remove from failedSnippetIds
            const optSnippet = state.snippets.find(
              (x) =>
                x.id.startsWith("_opt_") &&
                x.sessionCode === s.sessionCode &&
                x.content === s.content &&
                (x.language ?? null) === (s.language ?? null) &&
                x.type === s.type,
            );
            snippets = state.snippets.map((x) =>
              x.id.startsWith("_opt_") &&
              x.sessionCode === s.sessionCode &&
              x.content === s.content &&
              (x.language ?? null) === (s.language ?? null) &&
              x.type === s.type
                ? s
                : x,
            );
            if (optSnippet && state.failedSnippetIds.has(optSnippet.id)) {
              nextFailedIds = new Set(state.failedSnippetIds);
              nextFailedIds.delete(optSnippet.id);
            }
          } else {
            snippets = [s, ...state.snippets];
          }
        }
      }
      // Sort newest first by createdAt
      return {
        ...state,
        snippets: [...snippets].sort((a, b) => b.createdAt - a.createdAt),
        failedSnippetIds: nextFailedIds,
      };
    }

    case "SNIPPET_DELETED": {
      return {
        ...state,
        snippets: state.snippets.filter((s) => s.id !== action.payload.snippetId),
      };
    }

    case "CLIPBOARD_CLEARED": {
      return { ...state, snippets: [] };
    }

    case "QUESTION_ADDED": {
      const q = action.payload;
      const exists = state.questions.some((x) => x.id === q.id);
      if (exists) return state;
      // Replace optimistic question (_opt_ ID) with the real one from subscription
      const hasOptimistic = q.id.startsWith("_opt_")
        ? false
        : state.questions.some(
            (x) =>
              x.id.startsWith("_opt_") &&
              x.sessionCode === q.sessionCode &&
              x.fingerprint === q.fingerprint &&
              x.text === q.text,
          );
      const filtered = hasOptimistic
        ? state.questions.filter(
            (x) =>
              !(
                x.id.startsWith("_opt_") &&
                x.sessionCode === q.sessionCode &&
                x.fingerprint === q.fingerprint &&
                x.text === q.text
              ),
          )
        : state.questions;
      return { ...state, questions: [...filtered, q] };
    }

    case "QUESTION_UPDATED": {
      const { questionId, upvoteDelta, upvoteCount, downvoteCount, isFocused, isBanned, isHidden } =
        action.payload;
      const questions = state.questions.map((q) => {
        if (q.id !== questionId) {
          // If this update sets a different question to focused, un-focus others
          return isFocused === true ? { ...q, isFocused: false } : q;
        }
        return {
          ...q,
          // Prefer absolute upvoteCount (from subscription) over delta (from optimistic)
          upvoteCount:
            upvoteCount !== undefined
              ? upvoteCount
              : upvoteDelta !== undefined
                ? q.upvoteCount + upvoteDelta
                : q.upvoteCount,
          downvoteCount: downvoteCount !== undefined ? downvoteCount : q.downvoteCount,
          isFocused: isFocused !== undefined ? isFocused : q.isFocused,
          isBanned: isBanned !== undefined ? isBanned : q.isBanned,
          isHidden: isHidden !== undefined ? isHidden : q.isHidden,
        };
      });
      return { ...state, questions };
    }

    case "PARTICIPANT_BANNED": {
      const next = new Set(state.bannedFingerprints);
      next.add(action.payload.fingerprint);
      return { ...state, bannedFingerprints: next };
    }

    case "REPLY_ADDED": {
      const reply = action.payload;
      const exists = state.replies.some((r) => r.id === reply.id);
      if (exists) return state;
      // Replace optimistic reply (temp _opt_ ID) with real one from subscription
      const hasOptimistic = reply.id.startsWith("_opt_")
        ? false
        : state.replies.some(
            (r) =>
              r.id.startsWith("_opt_") &&
              r.questionId === reply.questionId &&
              r.fingerprint === reply.fingerprint &&
              r.text === reply.text,
          );
      const filtered = hasOptimistic
        ? state.replies.filter(
            (r) =>
              !(
                r.id.startsWith("_opt_") &&
                r.questionId === reply.questionId &&
                r.fingerprint === reply.fingerprint &&
                r.text === reply.text
              ),
          )
        : state.replies;
      return { ...state, replies: [...filtered, reply] };
    }

    case "ADD_SNIPPET_OPTIMISTIC": {
      return {
        ...state,
        snippets: [action.payload, ...state.snippets],
      };
    }

    case "ADD_QUESTION_OPTIMISTIC": {
      return {
        ...state,
        questions: [...state.questions, action.payload],
      };
    }

    case "REMOVE_OPTIMISTIC": {
      const nextFailed = new Set(state.failedSnippetIds);
      nextFailed.delete(action.payload.id);
      const nextEditing = new Set(state.editingSnippetIds);
      nextEditing.delete(action.payload.id);
      return {
        ...state,
        snippets: state.snippets.filter((s) => s.id !== action.payload.id),
        questions: state.questions.filter((q) => q.id !== action.payload.id),
        failedSnippetIds: nextFailed,
        editingSnippetIds: nextEditing,
      };
    }

    case "SNIPPET_PUSH_FAILED": {
      const next = new Set(state.failedSnippetIds);
      next.add(action.payload.id);
      return { ...state, failedSnippetIds: next };
    }

    case "SNIPPET_RETRY": {
      const next = new Set(state.failedSnippetIds);
      next.delete(action.payload.id);
      return { ...state, failedSnippetIds: next };
    }

    case "SNIPPET_EDIT_START": {
      const next = new Set(state.editingSnippetIds);
      next.add(action.payload.id);
      return { ...state, editingSnippetIds: next };
    }

    case "SNIPPET_EDIT_END": {
      const next = new Set(state.editingSnippetIds);
      next.delete(action.payload.id);
      return {
        ...state,
        editingSnippetIds: next,
        snippets: state.snippets.map((s) =>
          s.id === action.payload.id ? { ...s, content: action.payload.content } : s,
        ),
      };
    }

    case "REACTION_UPDATED": {
      const { targetId, targetType, counts, reactionOrder } = action.payload;
      const reactionCounts = JSON.stringify(counts);
      const reactionOrderStr = JSON.stringify(reactionOrder);
      if (targetType === "QUESTION") {
        return {
          ...state,
          questions: state.questions.map((q) =>
            q.id === targetId ? { ...q, reactionCounts, reactionOrder: reactionOrderStr } : q,
          ),
        };
      }
      // targetType === "REPLY"
      return {
        ...state,
        replies: state.replies.map((r) =>
          r.id === targetId ? { ...r, reactionCounts, reactionOrder: reactionOrderStr } : r,
        ),
      };
    }

    case "QUESTION_EDITED": {
      const { questionId, text, editedAt } = action.payload;
      return {
        ...state,
        questions: state.questions.map((q) => (q.id === questionId ? { ...q, text, editedAt } : q)),
      };
    }

    case "QUESTION_DELETED": {
      return {
        ...state,
        questions: state.questions.filter((q) => q.id !== action.payload.questionId),
      };
    }

    case "REPLY_EDITED": {
      const { replyId, text, editedAt } = action.payload;
      return {
        ...state,
        replies: state.replies.map((r) => (r.id === replyId ? { ...r, text, editedAt } : r)),
      };
    }

    case "REPLY_DELETED": {
      return {
        ...state,
        replies: state.replies.filter((r) => r.id !== action.payload.replyId),
      };
    }

    case "SNIPPET_EDITED": {
      const { snippetId, content, language, editedAt } = action.payload;
      return {
        ...state,
        snippets: state.snippets.map((s) =>
          s.id === snippetId
            ? {
                ...s,
                content,
                editedAt,
                ...(language !== undefined ? { language } : {}),
              }
            : s,
        ),
      };
    }

    case "QUESTION_HARD_DELETED": {
      const { questionId } = action.payload;
      return {
        ...state,
        questions: state.questions.filter((q) => q.id !== questionId),
        // Cascade: remove all replies belonging to this question
        replies: state.replies.filter((r) => r.questionId !== questionId),
      };
    }

    case "REPLY_HARD_DELETED": {
      return {
        ...state,
        replies: state.replies.filter((r) => r.id !== action.payload.replyId),
      };
    }

    case "SNIPPET_HARD_DELETED": {
      return {
        ...state,
        snippets: state.snippets.filter((s) => s.id !== action.payload.snippetId),
      };
    }

    default:
      return state;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface SessionStateResult {
  state: SessionState;
  dispatch: React.Dispatch<SessionAction>;
  /** Questions sorted: focused first, then upvoteCount desc, then createdAt desc. */
  sortedQuestions: Question[];
  /** Replies for a specific question, sorted by createdAt asc. */
  repliesByQuestion: (questionId: string) => Reply[];
  /** Fingerprints of banned participants. */
  bannedFingerprints: Set<string>;
  /** Snippet IDs that failed to push to the server. */
  failedSnippetIds: Set<string>;
  /** Snippet IDs currently being inline-edited (defers server push). */
  editingSnippetIds: Set<string>;
}

export function useSessionState(initialData: {
  snippets: Snippet[];
  questions: Question[];
  replies: Reply[];
}): SessionStateResult {
  const [state, dispatch] = useReducer(sessionReducer, {
    snippets: initialData.snippets,
    questions: initialData.questions,
    replies: initialData.replies,
    bannedFingerprints: new Set<string>(),
    failedSnippetIds: new Set<string>(),
    editingSnippetIds: new Set<string>(),
  });

  // Derived: sorted questions
  const sortedQuestions = [...state.questions].sort((a, b) => {
    if (a.isFocused && !b.isFocused) return -1;
    if (!a.isFocused && b.isFocused) return 1;
    if (b.upvoteCount !== a.upvoteCount) return b.upvoteCount - a.upvoteCount;
    return b.createdAt - a.createdAt;
  });

  // Derived: replies for a question
  const repliesByQuestion = useCallback(
    (questionId: string): Reply[] =>
      state.replies
        .filter((r) => r.questionId === questionId)
        .sort((a, b) => a.createdAt - b.createdAt),
    [state.replies],
  );

  return {
    state,
    dispatch,
    sortedQuestions,
    repliesByQuestion,
    bannedFingerprints: state.bannedFingerprints,
    failedSnippetIds: state.failedSnippetIds,
    editingSnippetIds: state.editingSnippetIds,
  };
}
