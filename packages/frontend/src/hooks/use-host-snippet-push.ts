"use client";

import { useCallback, useRef } from "react";

import type { Snippet } from "@nasqa/core";

import { pushSnippetAction } from "@/actions/snippet";
import type { SessionAction } from "@/hooks/use-session-state";
import { safeAction } from "@/lib/safe-action";

interface UseHostSnippetPushParams {
  sessionCode: string;
  hostSecretHash: string;
  dispatch: React.Dispatch<SessionAction>;
  snippetsLength: number;
  editingSnippetIds: Set<string>;
}

interface HostSnippetPushResult {
  handlePush: (content: string, lang: string) => Promise<{ success: boolean; tempId: string }>;
  handleEditStart: (tempId: string) => void;
  handleEditEnd: (tempId: string, newContent: string, newLang: string) => void;
  handleRetry: (tempId: string, content: string, lang: string) => Promise<void>;
  handleDismissFailed: (tempId: string) => void;
}

export function useHostSnippetPush({
  sessionCode,
  hostSecretHash,
  dispatch,
  editingSnippetIds,
}: UseHostSnippetPushParams): HostSnippetPushResult {
  /** Tracks snippets whose server push was deferred because they were being edited. */
  const pendingPushes = useRef<Map<string, { content: string; lang: string }>>(new Map());

  /**
   * Internal helper: push snippet to server with one silent retry.
   * If the snippet is currently being edited, defer the push.
   */
  const executeServerPush = useCallback(
    async (tempId: string, content: string, lang: string) => {
      // Deferred push check: if snippet is being edited, store/update and return
      if (editingSnippetIds.has(tempId)) {
        pendingPushes.current.set(tempId, { content, lang });
        return;
      }

      const type = lang !== "text" ? "code" : "text";

      // First attempt
      const result = await safeAction(
        pushSnippetAction({
          sessionCode,
          hostSecretHash,
          content,
          type,
          language: lang !== "text" ? lang : undefined,
        }),
        "Network error",
      );

      if (result.success) {
        pendingPushes.current.delete(tempId);
        return;
      }

      // One silent retry
      const retryResult = await safeAction(
        pushSnippetAction({
          sessionCode,
          hostSecretHash,
          content,
          type,
          language: lang !== "text" ? lang : undefined,
        }),
        "Network error",
      );

      if (retryResult.success) {
        pendingPushes.current.delete(tempId);
        return;
      }

      // Both attempts failed
      dispatch({ type: "SNIPPET_PUSH_FAILED", payload: { id: tempId } });
    },
    [sessionCode, hostSecretHash, dispatch, editingSnippetIds],
  );

  const handlePush = useCallback(
    async (content: string, lang: string): Promise<{ success: boolean; tempId: string }> => {
      const tempId = `_opt_${Date.now()}`;
      const type = lang !== "text" ? "code" : "text";

      const optimisticSnippet: Snippet = {
        id: tempId,
        sessionCode,
        type,
        content,
        language: lang !== "text" ? lang : undefined,
        createdAt: Math.floor(Date.now() / 1000),
        TTL: 0,
      };

      dispatch({ type: "ADD_SNIPPET_OPTIMISTIC", payload: optimisticSnippet });
      pendingPushes.current.set(tempId, { content, lang });

      // Fire and forget — failures are handled via SNIPPET_PUSH_FAILED
      void executeServerPush(tempId, content, lang);

      return { success: true, tempId };
    },
    [sessionCode, dispatch, executeServerPush],
  );

  const handleEditStart = useCallback(
    (tempId: string) => {
      dispatch({ type: "SNIPPET_EDIT_START", payload: { id: tempId } });
    },
    [dispatch],
  );

  const handleEditEnd = useCallback(
    (tempId: string, newContent: string, newLang: string) => {
      dispatch({ type: "SNIPPET_EDIT_END", payload: { id: tempId, content: newContent } });
      pendingPushes.current.set(tempId, { content: newContent, lang: newLang });
      // Now that editing is done, execute the push with final content
      void executeServerPush(tempId, newContent, newLang);
    },
    [dispatch, executeServerPush],
  );

  const handleRetry = useCallback(
    async (tempId: string, content: string, lang: string) => {
      dispatch({ type: "SNIPPET_RETRY", payload: { id: tempId } });

      const type = lang !== "text" ? "code" : "text";
      const result = await safeAction(
        pushSnippetAction({
          sessionCode,
          hostSecretHash,
          content,
          type,
          language: lang !== "text" ? lang : undefined,
        }),
        "Network error",
      );

      if (!result.success) {
        dispatch({ type: "SNIPPET_PUSH_FAILED", payload: { id: tempId } });
      } else {
        pendingPushes.current.delete(tempId);
      }
    },
    [sessionCode, hostSecretHash, dispatch],
  );

  const handleDismissFailed = useCallback(
    (tempId: string) => {
      dispatch({ type: "REMOVE_OPTIMISTIC", payload: { id: tempId } });
      pendingPushes.current.delete(tempId);
    },
    [dispatch],
  );

  return {
    handlePush,
    handleEditStart,
    handleEditEnd,
    handleRetry,
    handleDismissFailed,
  };
}
