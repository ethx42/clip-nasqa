'use server';

import { codeToHtml } from 'shiki';
import type { BundledLanguage } from 'shiki';
import { appsyncMutation } from '@/lib/appsync-server';
import { PUSH_SNIPPET, DELETE_SNIPPET, CLEAR_CLIPBOARD } from '@/lib/graphql/mutations';

/**
 * Renders Shiki highlighted HTML for the given code and language.
 * Used by HostInput for live preview without putting Shiki in the client bundle.
 */
export async function renderHighlight(
  code: string,
  lang: string
): Promise<string> {
  if (!code.trim() || lang === 'text') return '';
  try {
    const html = await codeToHtml(code, {
      lang: lang as BundledLanguage,
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    });
    return html;
  } catch {
    // Unsupported language — return empty, caller falls back to plain text
    return '';
  }
}

/**
 * Pushes a new snippet to the session via AppSync mutation.
 */
export async function pushSnippetAction(formData: {
  sessionSlug: string;
  hostSecretHash: string;
  content: string;
  type: string;
  language?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await appsyncMutation(PUSH_SNIPPET, formData);
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to push snippet';
    return { ok: false, error: message };
  }
}

/**
 * Deletes a single snippet from the session.
 */
export async function deleteSnippetAction(args: {
  sessionSlug: string;
  hostSecretHash: string;
  snippetId: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await appsyncMutation(DELETE_SNIPPET, args);
    return { ok: true };
  } catch (err) {
    console.error('deleteSnippetAction error:', err);
    return { ok: false, error: 'Failed to delete snippet' };
  }
}

/**
 * Clears all snippets from the session clipboard.
 */
export async function clearClipboardAction(args: {
  sessionSlug: string;
  hostSecretHash: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await appsyncMutation(CLEAR_CLIPBOARD, args);
    return { ok: true };
  } catch (err) {
    console.error('clearClipboardAction error:', err);
    return { ok: false, error: 'Failed to clear clipboard' };
  }
}
