'use server';

import { appsyncMutation } from '@/lib/appsync-server';
import {
  BAN_QUESTION,
  BAN_PARTICIPANT,
  DOWNVOTE_QUESTION,
  RESTORE_QUESTION,
} from '@/lib/graphql/mutations';

export async function banQuestionAction(args: {
  sessionSlug: string;
  hostSecretHash: string;
  questionId: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await appsyncMutation(BAN_QUESTION, args);
    return { ok: true };
  } catch (err) {
    console.error('banQuestionAction error:', err);
    return { ok: false, error: 'Failed to ban question' };
  }
}

export async function banParticipantAction(args: {
  sessionSlug: string;
  hostSecretHash: string;
  fingerprint: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await appsyncMutation(BAN_PARTICIPANT, args);
    return { ok: true };
  } catch (err) {
    console.error('banParticipantAction error:', err);
    return { ok: false, error: 'Failed to ban participant' };
  }
}

export async function downvoteQuestionAction(args: {
  sessionSlug: string;
  questionId: string;
  fingerprint: string;
  remove?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await appsyncMutation(DOWNVOTE_QUESTION, args);
    return { ok: true };
  } catch (err) {
    console.error('downvoteQuestionAction error:', err);
    return { ok: false, error: 'Failed to downvote question' };
  }
}

export async function restoreQuestionAction(args: {
  sessionSlug: string;
  hostSecretHash: string;
  questionId: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await appsyncMutation(RESTORE_QUESTION, args);
    return { ok: true };
  } catch (err) {
    console.error('restoreQuestionAction error:', err);
    return { ok: false, error: 'Failed to restore question' };
  }
}
