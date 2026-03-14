'use server';

import { appsyncClient } from '@/lib/appsync-client';
import {
  ADD_QUESTION,
  UPVOTE_QUESTION,
  ADD_REPLY,
  FOCUS_QUESTION,
} from '@/lib/graphql/mutations';

export async function addQuestionAction(args: {
  sessionSlug: string;
  text: string;
  fingerprint: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (args.text.length > 500) {
    return { ok: false, error: 'Question must be 500 characters or fewer' };
  }
  if (args.text.trim().length === 0) {
    return { ok: false, error: 'Question cannot be empty' };
  }

  try {
    await appsyncClient.graphql({
      query: ADD_QUESTION,
      variables: args,
    });
    return { ok: true };
  } catch (err) {
    console.error('addQuestionAction error:', err);
    return { ok: false, error: 'Failed to submit question' };
  }
}

export async function upvoteQuestionAction(args: {
  sessionSlug: string;
  questionId: string;
  fingerprint: string;
  remove?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await appsyncClient.graphql({
      query: UPVOTE_QUESTION,
      variables: args,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('VOTE_CONFLICT')) {
      return { ok: false, error: 'VOTE_CONFLICT' };
    }
    console.error('upvoteQuestionAction error:', err);
    return { ok: false, error: 'Failed to upvote question' };
  }
}

export async function addReplyAction(args: {
  sessionSlug: string;
  questionId: string;
  text: string;
  fingerprint: string;
  isHostReply: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  if (args.text.length > 500) {
    return { ok: false, error: 'Reply must be 500 characters or fewer' };
  }
  if (args.text.trim().length === 0) {
    return { ok: false, error: 'Reply cannot be empty' };
  }

  try {
    await appsyncClient.graphql({
      query: ADD_REPLY,
      variables: args,
    });
    return { ok: true };
  } catch (err) {
    console.error('addReplyAction error:', err);
    return { ok: false, error: 'Failed to submit reply' };
  }
}

export async function focusQuestionAction(args: {
  sessionSlug: string;
  hostSecretHash: string;
  questionId?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await appsyncClient.graphql({
      query: FOCUS_QUESTION,
      variables: args,
    });
    return { ok: true };
  } catch (err) {
    console.error('focusQuestionAction error:', err);
    return { ok: false, error: 'Failed to focus question' };
  }
}
