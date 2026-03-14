'use client';

import { useEffect, useCallback } from 'react';
import type { Snippet, Question, Reply } from '@nasqa/core';
import { appsyncClient } from '@/lib/appsync-client';
import { ON_SESSION_UPDATE } from '@/lib/graphql/subscriptions';
import type { SessionAction } from './use-session-state';

interface SessionUpdateEvent {
  eventType: string;
  sessionSlug: string;
  payload: string; // AWSJSON — serialized JSON string
}

/**
 * Subscribes to AppSync OnSessionUpdate events for the given session.
 * Parses incoming events and dispatches them to the session state reducer.
 *
 * Cleanup: unsubscribes on unmount or when sessionSlug changes.
 */
export function useSessionUpdates(
  sessionSlug: string,
  dispatch: React.Dispatch<SessionAction>
): void {
  // Stable dispatch reference — prevents re-subscription on every render
  const stableDispatch = useCallback(
    (action: SessionAction) => dispatch(action),
    [dispatch]
  );

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sub = (
      appsyncClient.graphql({
        query: ON_SESSION_UPDATE,
        variables: { sessionSlug },
      }) as any
    ).subscribe({
      next: ({ data }: { data: { onSessionUpdate: SessionUpdateEvent } }) => {
        const event = data?.onSessionUpdate;
        if (!event) return;

        const { eventType, payload } = event;

        try {
          switch (eventType) {
            case 'SNIPPET_ADDED': {
              const snippet = JSON.parse(payload) as Snippet;
              stableDispatch({ type: 'SNIPPET_ADDED', payload: snippet });
              break;
            }
            case 'SNIPPET_DELETED': {
              const { snippetId } = JSON.parse(payload) as { snippetId: string };
              stableDispatch({ type: 'SNIPPET_DELETED', payload: { snippetId } });
              break;
            }
            case 'CLIPBOARD_CLEARED': {
              stableDispatch({ type: 'CLIPBOARD_CLEARED' });
              break;
            }
            case 'QUESTION_ADDED': {
              const question = JSON.parse(payload) as Question;
              stableDispatch({ type: 'QUESTION_ADDED', payload: question });
              break;
            }
            case 'QUESTION_UPDATED': {
              const { questionId, upvoteDelta, isFocused } = JSON.parse(payload) as {
                questionId: string;
                upvoteDelta?: number;
                isFocused?: boolean;
              };
              stableDispatch({
                type: 'QUESTION_UPDATED',
                payload: { questionId, upvoteDelta, isFocused },
              });
              break;
            }
            case 'REPLY_ADDED': {
              const reply = JSON.parse(payload) as Reply;
              stableDispatch({ type: 'REPLY_ADDED', payload: reply });
              break;
            }
            default:
              console.warn('[useSessionUpdates] Unknown eventType:', eventType);
          }
        } catch (err) {
          console.error('[useSessionUpdates] Failed to parse event payload:', err, payload);
        }
      },
      error: (err: unknown) => {
        console.error('[useSessionUpdates] Subscription error:', err);
        // Connection status tracking will be added in Plan 05 (reconnection banner)
      },
    });

    return () => {
      sub.unsubscribe();
    };
  }, [sessionSlug, stableDispatch]);
}
