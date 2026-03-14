'use client';

import { useReducer, useCallback } from 'react';
import type { Snippet, Question, Reply } from '@nasqa/core';

// ── Action types ──────────────────────────────────────────────────────────────

export type SessionAction =
  | { type: 'SNIPPET_ADDED'; payload: Snippet; optimisticId?: string }
  | { type: 'SNIPPET_DELETED'; payload: { snippetId: string } }
  | { type: 'CLIPBOARD_CLEARED' }
  | { type: 'QUESTION_ADDED'; payload: Question; optimisticId?: string }
  | {
      type: 'QUESTION_UPDATED';
      payload: { questionId: string; upvoteDelta?: number; isFocused?: boolean };
    }
  | { type: 'REPLY_ADDED'; payload: Reply }
  | { type: 'ADD_SNIPPET_OPTIMISTIC'; payload: Snippet }
  | { type: 'ADD_QUESTION_OPTIMISTIC'; payload: Question }
  | { type: 'REMOVE_OPTIMISTIC'; payload: { id: string } };

// ── State shape ───────────────────────────────────────────────────────────────

interface SessionState {
  /** Reverse-chronological (newest first). */
  snippets: Snippet[];
  /** Stored unsorted — sorted by selector (sortedQuestions). */
  questions: Question[];
  /** All replies; grouped by questionId via repliesByQuestion helper. */
  replies: Reply[];
}

// ── Reducer ───────────────────────────────────────────────────────────────────

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'SNIPPET_ADDED': {
      let snippets: Snippet[];
      if (action.optimisticId) {
        // Replace optimistic placeholder if present
        const replaced = state.snippets.some((s) => s.id === action.optimisticId);
        snippets = replaced
          ? state.snippets.map((s) =>
              s.id === action.optimisticId ? action.payload : s
            )
          : [action.payload, ...state.snippets];
      } else {
        // Deduplicate: avoid adding if already present (e.g. after optimistic update)
        const exists = state.snippets.some((s) => s.id === action.payload.id);
        snippets = exists ? state.snippets : [action.payload, ...state.snippets];
      }
      // Sort newest first by createdAt
      return {
        ...state,
        snippets: [...snippets].sort((a, b) => b.createdAt - a.createdAt),
      };
    }

    case 'SNIPPET_DELETED': {
      return {
        ...state,
        snippets: state.snippets.filter((s) => s.id !== action.payload.snippetId),
      };
    }

    case 'CLIPBOARD_CLEARED': {
      return { ...state, snippets: [] };
    }

    case 'QUESTION_ADDED': {
      let questions: Question[];
      if (action.optimisticId) {
        const replaced = state.questions.some((q) => q.id === action.optimisticId);
        questions = replaced
          ? state.questions.map((q) =>
              q.id === action.optimisticId ? action.payload : q
            )
          : [...state.questions, action.payload];
      } else {
        const exists = state.questions.some((q) => q.id === action.payload.id);
        questions = exists ? state.questions : [...state.questions, action.payload];
      }
      return { ...state, questions };
    }

    case 'QUESTION_UPDATED': {
      const { questionId, upvoteDelta, isFocused } = action.payload;
      const questions = state.questions.map((q) => {
        if (q.id !== questionId) {
          // If this update sets a different question to focused, un-focus others
          return isFocused === true ? { ...q, isFocused: false } : q;
        }
        return {
          ...q,
          upvoteCount:
            upvoteDelta !== undefined ? q.upvoteCount + upvoteDelta : q.upvoteCount,
          isFocused: isFocused !== undefined ? isFocused : q.isFocused,
        };
      });
      return { ...state, questions };
    }

    case 'REPLY_ADDED': {
      const exists = state.replies.some((r) => r.id === action.payload.id);
      if (exists) return state;
      return { ...state, replies: [...state.replies, action.payload] };
    }

    case 'ADD_SNIPPET_OPTIMISTIC': {
      return {
        ...state,
        snippets: [action.payload, ...state.snippets],
      };
    }

    case 'ADD_QUESTION_OPTIMISTIC': {
      return {
        ...state,
        questions: [...state.questions, action.payload],
      };
    }

    case 'REMOVE_OPTIMISTIC': {
      return {
        ...state,
        snippets: state.snippets.filter((s) => s.id !== action.payload.id),
        questions: state.questions.filter((q) => q.id !== action.payload.id),
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
    [state.replies]
  );

  return { state, dispatch, sortedQuestions, repliesByQuestion };
}
