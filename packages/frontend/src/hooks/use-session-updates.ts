'use client';

import { useEffect, useCallback, useState } from 'react';
import { Hub } from 'aws-amplify/utils';
import { CONNECTION_STATE_CHANGE, ConnectionState } from 'aws-amplify/api';
import type { Snippet, Question, Reply } from '@nasqa/core';
import { appsyncClient } from '@/lib/appsync-client';
import { ON_SESSION_UPDATE } from '@/lib/graphql/subscriptions';
import type { SessionAction } from './use-session-state';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

/**
 * Safely parse an AWSJSON value that may be:
 * - already an object (Amplify auto-parsed it)
 * - a JSON string (single-encoded)
 * - a double-encoded JSON string (AppSync serialized the resolver's JSON.stringify output again)
 */
function parseAwsJson(value: unknown): unknown {
  if (typeof value === 'object' && value !== null) return value;
  if (typeof value !== 'string') return value;
  let result: unknown = JSON.parse(value);
  // If still a string after first parse, it was double-encoded
  if (typeof result === 'string') {
    result = JSON.parse(result);
  }
  return result;
}

interface SessionUpdateEvent {
  eventType: string;
  sessionSlug: string;
  payload: string; // AWSJSON — serialized JSON string
}

interface UseSessionUpdatesResult {
  connectionStatus: ConnectionStatus;
  lastHostActivity: number | null;
}

function mapConnectionState(state: ConnectionState): ConnectionStatus {
  switch (state) {
    case ConnectionState.Connected:
      return 'connected';
    case ConnectionState.Connecting:
    case ConnectionState.ConnectionDisrupted:
    case ConnectionState.ConnectedPendingKeepAlive:
    case ConnectionState.ConnectedPendingNetwork:
    case ConnectionState.ConnectedPendingDisconnect:
      return 'connecting';
    case ConnectionState.Disconnected:
      return 'disconnected';
    default:
      return 'connecting';
  }
}

/**
 * Subscribes to AppSync OnSessionUpdate events for the given session.
 * Parses incoming events and dispatches them to the session state reducer.
 *
 * Uses Amplify Hub CONNECTION_STATE_CHANGE to track actual WebSocket status
 * (not dependent on receiving the first data event).
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

  // Listen for Amplify connection state changes via Hub
  useEffect(() => {
    const stopListening = Hub.listen('api', (data) => {
      const { payload } = data;
      if (payload.event === CONNECTION_STATE_CHANGE) {
        const state = (payload.data as { connectionState: ConnectionState }).connectionState;
        setConnectionStatus(mapConnectionState(state));
      }
    });

    return () => stopListening();
  }, []);

  useEffect(() => {
    setConnectionStatus('connecting');

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
          // AWSJSON may be double-encoded (string→string) or auto-parsed (string→object)
          // depending on the Amplify client version and AppSync serialization path.
          const parsed = parseAwsJson(payload);

          switch (eventType) {
            case 'SNIPPET_ADDED': {
              stableDispatch({ type: 'SNIPPET_ADDED', payload: parsed as Snippet });
              setLastHostActivity(Date.now());
              break;
            }
            case 'SNIPPET_DELETED': {
              stableDispatch({ type: 'SNIPPET_DELETED', payload: parsed as { snippetId: string } });
              break;
            }
            case 'CLIPBOARD_CLEARED': {
              stableDispatch({ type: 'CLIPBOARD_CLEARED' });
              break;
            }
            case 'QUESTION_ADDED': {
              stableDispatch({ type: 'QUESTION_ADDED', payload: parsed as Question });
              break;
            }
            case 'QUESTION_UPDATED': {
              const { questionId, upvoteCount, isFocused } = parsed as {
                questionId: string;
                upvoteCount?: number;
                isFocused?: boolean;
              };
              stableDispatch({
                type: 'QUESTION_UPDATED',
                payload: { questionId, upvoteCount, isFocused },
              });
              break;
            }
            case 'REPLY_ADDED': {
              stableDispatch({ type: 'REPLY_ADDED', payload: parsed as Reply });
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
      },
    });

    return () => {
      sub.unsubscribe();
    };
  }, [sessionSlug, stableDispatch]);

  return { connectionStatus, lastHostActivity };
}
