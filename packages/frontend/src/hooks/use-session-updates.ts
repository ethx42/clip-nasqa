'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import type { Snippet, Question, Reply } from '@nasqa/core';
import { appsyncClient } from '@/lib/appsync-client';
import { ON_SESSION_UPDATE } from '@/lib/graphql/subscriptions';
import type { SessionAction } from './use-session-state';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

interface SessionUpdateEvent {
  eventType: string;
  sessionSlug: string;
  payload: string; // AWSJSON — serialized JSON string
}

interface UseSessionUpdatesResult {
  connectionStatus: ConnectionStatus;
  lastHostActivity: number | null;
}

/**
 * Subscribes to AppSync OnSessionUpdate events for the given session.
 * Parses incoming events and dispatches them to the session state reducer.
 *
 * Returns connection status and last host activity timestamp for the live indicator.
 * Cleanup: unsubscribes on unmount or when sessionSlug changes.
 */
export function useSessionUpdates(
  sessionSlug: string,
  dispatch: React.Dispatch<SessionAction>
): UseSessionUpdatesResult {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [lastHostActivity, setLastHostActivity] = useState<number | null>(null);

  // Stable dispatch reference — prevents re-subscription on every render
  const stableDispatch = useCallback(
    (action: SessionAction) => dispatch(action),
    [dispatch]
  );

  // Track if we have received at least one event (to detect reconnection)
  const receivedFirstEvent = useRef(false);

  useEffect(() => {
    setConnectionStatus('connecting');
    receivedFirstEvent.current = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sub = (
      appsyncClient.graphql({
        query: ON_SESSION_UPDATE,
        variables: { sessionSlug },
      }) as any
    ).subscribe({
      next: ({ data }: { data: { onSessionUpdate: SessionUpdateEvent } }) => {
        // Mark connected on first event received
        if (!receivedFirstEvent.current) {
          receivedFirstEvent.current = true;
          setConnectionStatus('connected');
        }

        const event = data?.onSessionUpdate;
        if (!event) return;

        const { eventType, payload } = event;

        try {
          switch (eventType) {
            case 'SNIPPET_ADDED': {
              const snippet = JSON.parse(payload) as Snippet;
              stableDispatch({ type: 'SNIPPET_ADDED', payload: snippet });
              // Track host activity timestamp for liveness indicator
              setLastHostActivity(Date.now());
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
        setConnectionStatus('disconnected');
        // Amplify auto-retries; set back to connecting after a short delay
        setTimeout(() => {
          setConnectionStatus('connecting');
        }, 2000);
      },
    });

    return () => {
      sub.unsubscribe();
    };
  }, [sessionSlug, stableDispatch]);

  return { connectionStatus, lastHostActivity };
}
