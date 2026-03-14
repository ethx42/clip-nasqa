'use server';

import { codeToHtml } from 'shiki';
import type { BundledLanguage } from 'shiki';
import { appsyncClient } from '@/lib/appsync-client';
import { PUSH_SNIPPET } from '@/lib/graphql/mutations';

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
    await appsyncClient.graphql({
      query: PUSH_SNIPPET,
      variables: formData,
    });
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to push snippet';
    return { ok: false, error: message };
  }
}
