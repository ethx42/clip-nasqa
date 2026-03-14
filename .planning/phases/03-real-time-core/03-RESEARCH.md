# Phase 3: Real-Time Core - Research

**Researched:** 2026-03-14
**Domain:** AppSync subscriptions, DynamoDB mutations, Shiki SSR, optimistic UI, real-time state management
**Confidence:** HIGH (core stack is already wired in the project; research confirms exact patterns)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Clipboard Hero & History Layout**
- Full-width hero card for the latest snippet, prominently styled
- Older snippets collapse into a list below with first 2-3 lines truncated, click to expand
- Each snippet card shows: language badge (code only), relative timestamp (live-updating), copy button, sequential snippet number (#1, #2, etc.)
- Snippet numbers visible on both host and participant views so speaker can reference by number
- Hero code blocks have a max height (~20 lines) then internal scroll
- Show all history snippets with lazy loading as user scrolls
- Code snippets show line numbers in hero view; text snippets do not show line numbers
- Text snippets: same card style as code but plain text rendering (no syntax highlighting, no monospace), labeled "Text"
- Plain text only for text snippets — no markdown rendering
- Auto-linkify URLs in text snippets (open in new tab)
- Copy button copies raw code/text content with no formatting or metadata
- Copy confirmation: icon swaps from clipboard to green checkmark for 2s

**Clipboard Empty State**
- "Waiting for the speaker..." message with a subtle pulse animation when no snippets exist

**Clipboard Deletion & Clear**
- Snippet deletion: fade out + collapse animation; if hero is deleted, next snippet promotes up
- Host actions (delete, etc.) behind a three-dot menu on each snippet card
- "Clear All" as a separate subtle text button near the top of clipboard panel
- Clear All requires confirmation dialog: "Clear all snippets? This cannot be undone."
- On clear, participants see a "Clipboard cleared by speaker" toast for 3s; all snippets fade out together

**New Snippet Notification**
- When participant is scrolled down in history, a sticky "New snippet from speaker" banner appears at top of clipboard area
- Tapping the banner scrolls to the hero; does not auto-scroll and disrupt reading

**Q&A Feed Layout**
- Card per question showing: upvote arrow + count, question text, reply count, relative timestamp
- Questions sorted by upvote count (descending), re-sorted live in real-time as votes change
- Smooth slide animation (~300ms) when questions re-sort from vote changes
- Focused question pinned at top with pulsing emerald glow border + "FOCUSED" label
- Focusing a question auto-expands its reply thread
- Only one question can be focused at a time; focusing a new one unfocuses the previous
- Host actions (focus, delete) behind a three-dot menu on each question card (consistent with clipboard)

**Q&A Input & Submission**
- Question input field sticky at bottom of Q&A panel, always accessible
- 500 character limit for questions; character counter appears only when 80%+ of limit reached (e.g., "450/500")
- After submitting: optimistic insert into feed with brief emerald flash on participant's own card; input clears immediately
- Participants see a subtle "You" badge on their own questions (based on localStorage fingerprint)
- Empty Q&A state: "Be the first to ask a question!" with input field prominently visible

**Q&A Replies**
- Inline expand: click "N replies" to expand replies below the question card
- Speaker replies have emerald border + "Speaker" badge; participant replies are anonymous
- Anyone (participant or host) can reply to any question
- Reply input opens inline below the question when "Reply" button is tapped
- 500 character limit for replies (same as questions)

**Q&A Upvoting**
- Optimistic: count increments immediately, arrow turns emerald
- Toggle: tapping again removes the vote (arrow returns to default, count decrements)
- If server rejects (already voted via another mechanism), reverts silently

**Q&A New Question Notification**
- "N new questions" banner at top of Q&A panel when scrolled down; tap to scroll up
- Does not auto-scroll

**Q&A Content**
- Auto-linkify URLs in questions and replies (same as text snippets)
- Reply count badge updates with brief highlight when new replies arrive on collapsed threads

**Real-Time Transitions**
- New snippet: current hero slides down to history, new hero fades in from top with brief emerald highlight (fades after 2s)
- New question: fades in at its vote-sorted position with brief emerald flash
- Deletion: fade out + collapse animation
- Focus/unfocus: smooth slide to/from pinned position at top, glow appearing/fading
- Optimistic updates: instant appearance, no "sending" indicator; silent revert on server rejection
- Connected count: subtle number tick animation (scale) on changes

**Connection & Loading States**
- WebSocket disconnect: yellow "Reconnecting..." banner at top of page; content stays visible but stale; auto-retry
- Host reconnect: "Speaker is back!" banner for 3s
- Initial load: shimmer/pulse skeleton placeholders for both clipboard and Q&A panels

**Host Input Experience**
- Dedicated input zone at top of clipboard panel, always visible (both desktop and mobile)
- Accepts both typing and pasting
- Auto-detect on content: if it looks like code, show as code snippet with detected language badge; if plain text, show as text snippet
- Language is auto-detected but host can tap the language chip to override if detection was wrong
- Live Shiki-highlighted preview renders below input as host types/pastes (visible on mobile too, scrollable)
- Cmd/Ctrl+Enter keyboard shortcut to push snippet
- Input clears immediately after push

**Mobile Experience**
- Host view fully functional on mobile — full feature parity
- Tab bar navigation between Clipboard and Q&A panels (same pattern as participant mobile view)
- Host input zone always visible at top on mobile (does not collapse)
- Live preview shown on mobile, scrollable if content is long
- Participant default mobile tab: Clipboard (primary content)

**Session Liveness Indicators**
- Green pulsing dot with "LIVE" text in session header when host is connected
- Dot turns grey with "Paused" text when host disconnects
- Connected participant count visible to both host and participants in header
- After 2+ minutes of no host activity, show "Last snippet Xm ago" in header; disappears on new activity

### Claude's Discretion
- Exact animation timing and easing curves
- Shiki theme configuration details
- Language auto-detection algorithm/library choice
- Supported languages list for Shiki highlighting
- Exact skeleton placeholder shapes and shimmer speed
- Toast positioning and styling
- Internal reconnection retry strategy (backoff, max retries)
- Tab bar styling on mobile

### Deferred Ideas (OUT OF SCOPE)
- Downvoting questions (MOD-04) — Phase 4: Moderation
- Community auto-hide via downvote threshold (MOD-05) — Phase 4: Moderation
- Host ban by question/participant (MOD-02, MOD-03) — Phase 4: Moderation
- Auto-ban after 3 banned posts (MOD-06) — Phase 4: Moderation
- Device fingerprinting for ban enforcement (MOD-01) — Phase 4: Moderation
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CLIP-01 | Host can push text snippets to the live clipboard feed | Lambda mutation resolver + DynamoDB PutItem + AppSync subscription publish |
| CLIP-02 | Host can push code snippets with a language attribute | Same as CLIP-01; language stored as item attribute |
| CLIP-03 | Code snippets are syntax-highlighted using Shiki (server-side only, never in client bundle) | Shiki `codeToHtml` in RSC async component; zero client bundle cost confirmed |
| CLIP-04 | Shiki supports dual themes (light/dark) via CSS variables to prevent layout shift on theme toggle | Shiki `themes: { light, dark }` option with CSS custom properties (`--shiki-dark`) |
| CLIP-05 | Clipboard feed displays in reverse-chronological order with latest snippet as the "Hero" | ULID sort keys already in place (INFRA-09 complete); client state sorted by createdAt desc |
| CLIP-06 | Host can delete individual snippets (authenticated by hostSecret) | Lambda mutation with SHA-256 hash verify + DynamoDB DeleteItem + publish SNIPPET_DELETED event |
| CLIP-07 | Host can clear the entire clipboard (authenticated by hostSecret) | Lambda mutation + DynamoDB Query all SNIPPET# items + BatchWriteItem delete + publish CLIPBOARD_CLEARED event |
| QA-01 | Participant can submit a question anonymously (max 500 chars) | Lambda mutation + DynamoDB PutItem + publish QUESTION_ADDED event; fingerprint from localStorage |
| QA-02 | Participant can upvote questions; votes use DynamoDB atomic increments (ADD) | Lambda mutation + UpdateItem with `ADD upvoteCount :1`; per-user vote set in same item |
| QA-03 | Client tracks votes in localStorage to prevent UI-level double-voting | localStorage key `votes:{sessionSlug}` — set of question IDs; read before optimistic update |
| QA-04 | Questions display sorted by upvote count | Client-side sort of questions array by upvoteCount desc; re-sort on QUESTION_UPDATED events |
| QA-05 | Host or participant can reply to a question (one-level deep threading only) | Lambda mutation + DynamoDB PutItem (SK: REPLY#{ulid}) + publish REPLY_ADDED event |
| QA-06 | Speaker replies are visually distinct with a "Speaker" badge and emerald border | `isHostReply` field already in Reply GraphQL type; visual differentiation in ReplyCard component |
| QA-07 | Host can toggle isFocused on a question, pinning it to the top | Lambda mutation + UpdateItem set isFocused; unset previous focused question in same transaction; publish QUESTION_UPDATED |
| QA-08 | Focused question displays with a pulsing glow animation | CSS animation with emerald ring; `tw-animate-css` already installed |
| INFRA-02 | AppSync WebSocket subscriptions via single union-type SessionUpdate channel | Already implemented (subscription resolver + schema); Phase 3 replaces `_stub` mutation with real mutations |
| INFRA-03 | AppSync subscription validates non-null sessionSlug | Already implemented (subscription-onSessionUpdate.js resolver with setSubscriptionFilter) |
| INFRA-06 | Optimistic UI with < 100ms internal state updates | TanStack Query `useMutation` with `onMutate` cache update; no round-trip wait |
| INFRA-07 | Global broadcast latency < 200ms | AppSync WebSocket publish is typically 50–150ms; Lambda cold starts are the main risk — keep Lambda warm or use provisioned concurrency |
| INFRA-08 | Initial JS payload < 80kB gzipped | Shiki in RSC (zero client cost); subscription provider is a thin client hook; avoid large client imports |
</phase_requirements>

---

## Summary

Phase 3 implements the full real-time core on top of the skeleton built in Phase 2. The project already has AppSync wired with a `SessionUpdate` subscription, a Lambda data source, and a NONE data source for the subscription resolver. Phase 3 needs to: (1) add real GraphQL mutations to the schema, (2) implement Lambda resolver handlers for each mutation (write to DynamoDB, then return the payload so AppSync propagates it to subscribers), (3) build a client-side subscription provider that merges AppSync events into local React state, and (4) implement all UI components for clipboard and Q&A.

The critical architectural insight is how AppSync subscriptions work: when the Lambda mutation resolver returns a `SessionUpdate` value, AppSync automatically pushes that exact return value to all subscribers whose `setSubscriptionFilter` predicate matches. The Lambda does NOT call AppSync separately — it simply writes to DynamoDB and returns the typed payload. AppSync does the fan-out. This means the mutation resolver is the sole publisher and the NONE-data-source subscription resolver is only responsible for session scoping.

For Shiki, the pattern is straightforward: `codeToHtml(code, { lang, themes: { light: 'github-light', dark: 'github-dark' } })` in an async RSC produces dual-colored HTML with CSS custom properties. The `html.dark .shiki span { color: var(--shiki-dark) }` CSS rule switches themes. Since `next-themes` already sets the `dark` class on `<html>`, no extra work is needed. Shiki never enters the client bundle because it is only imported inside Server Components. For the live preview in the host input (which is a Client Component), use a Server Action or a lightweight API route to produce highlighted HTML on demand — do not import Shiki client-side.

**Primary recommendation:** Implement the Lambda mutation routing first (all mutations in one switch statement), then wire the subscription provider in a single `useSessionUpdates` hook, then build UI on top of a local `useSessionState` hook that processes events.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `shiki` | `^4.0.2` (already installed) | Server-side syntax highlighting | Zero client bundle; VS Code grammar quality; dual-theme CSS var output |
| `@aws-amplify/api-graphql` | `^4.8.5` (already installed) | AppSync WebSocket subscription client | Only Amplify-maintained client that handles AppSync WebSocket protocol + reconnection |
| `@tanstack/react-query` | `^5.90.21` (already installed) | Optimistic mutations, server state cache | Proven onMutate/onError rollback pattern; already a project dependency |
| `framer-motion` | `^12.36.0` (already installed) | UI animations for sort, fade, hero transitions | Already installed; declarative layout animations via `AnimatePresence` + `layout` prop |
| `sonner` | `^2.0.7` (already installed) | Toast notifications (clipboard cleared, reconnect) | Already installed; minimal bundle impact |
| `@aws-sdk/lib-dynamodb` | `^3.1009.0` (already installed) | DynamoDB operations in Lambda resolver | Already used in Phase 2 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tw-animate-css` | `^1.4.0` (already installed) | Pulse/glow CSS animations | QA-08 focused question pulsing glow |
| `lucide-react` | `^0.577.0` (already installed) | Copy, check, three-dot menu, upvote arrow icons | All icon needs in snippet and question cards |
| `highlight.js` (autodetect only) | via `shiki` | Programming language heuristic detection | Use `shiki`'s own `createHighlighter` with `detect` or rely on highlight.js `highlightAuto` for language guessing in the host input — see Architecture Patterns |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Shiki (SSR) | highlight.js (client) | highlight.js runs on client — adds ~300KB to bundle; violates CLIP-03 |
| AppSync subscription via Amplify | Raw WebSocket + custom auth | Amplify handles reconnection, auth token refresh, connection lifecycle automatically |
| TanStack Query optimistic | React `useReducer` local state | useReducer is fine for simple lists but loses rollback semantics; TQ already installed |
| NONE data source publish mutation | DynamoDB Streams → Lambda → AppSync | Streams add latency and complexity; direct mutation return is simpler and already in the schema design |

**Installation:** No new packages needed. All libraries already present in `packages/frontend/package.json` and `packages/functions`.

---

## Architecture Patterns

### Recommended Project Structure

```
packages/
├── functions/src/resolvers/
│   ├── index.ts                    # Route switch (expand with new cases)
│   ├── clipboard.ts                # pushSnippet, deleteSnippet, clearClipboard handlers
│   └── qa.ts                       # addQuestion, upvoteQuestion, addReply, focusQuestion handlers
│
├── frontend/src/
│   ├── lib/
│   │   ├── appsync-client.ts       # Amplify.configure + generateClient singleton
│   │   ├── graphql/
│   │   │   ├── mutations.ts        # gql mutation strings
│   │   │   └── subscriptions.ts    # gql subscription string
│   │   ├── dynamo.ts               # existing
│   │   └── session.ts              # existing
│   │
│   ├── hooks/
│   │   ├── use-session-state.ts    # Local state store: snippets[], questions[], connectionStatus
│   │   └── use-session-updates.ts  # AppSync subscription → dispatches to session state
│   │
│   ├── components/session/
│   │   ├── session-shell.tsx       # existing (add liveness indicators in Phase 3)
│   │   ├── clipboard-panel.tsx     # REPLACE shell with real implementation
│   │   ├── qa-panel.tsx            # REPLACE shell with real implementation
│   │   ├── snippet-hero.tsx        # Hero code/text card component (RSC)
│   │   ├── snippet-card.tsx        # History item (RSC for highlighted code)
│   │   ├── shiki-block.tsx         # async RSC: codeToHtml → dangerouslySetInnerHTML
│   │   ├── host-input.tsx          # Client component: textarea + language chip + preview
│   │   ├── question-card.tsx       # Upvote, reply expand, host actions
│   │   └── reply-list.tsx          # Inline reply thread
│   │
│   └── actions/
│       ├── snippet.ts              # Server Actions: pushSnippet, deleteSnippet, clearClipboard
│       └── qa.ts                   # Server Actions: addQuestion, upvoteQuestion, addReply, focusQuestion
│
└── infra/
    ├── schema.graphql              # Add real mutations, replace _stub
    └── resolvers/
        ├── mutation-*.js           # JS resolvers for Lambda-backed mutations
        └── subscription-onSessionUpdate.js  # existing (no change)
```

### Pattern 1: AppSync Mutation → Subscription Fan-Out

**What:** Lambda resolver writes to DynamoDB, then returns a `SessionUpdate` value. AppSync uses that return value to trigger all matching subscribers automatically.

**When to use:** Every clipboard and Q&A mutation in this phase.

**Flow:**
```
Client → GraphQL Mutation → AppSync → Lambda resolver
Lambda: DynamoDB write → return SessionUpdate{eventType, sessionSlug, payload}
AppSync: reads return value → filters by sessionSlug → pushes to subscribed clients
```

**Schema additions required:**
```graphql
# Source: existing infra/schema.graphql + Phase 3 additions
type Mutation {
  _stub: SessionUpdate                                   # keep for subscription compile
  pushSnippet(sessionSlug: String!, hostSecretHash: String!, content: String!, type: String!, language: String): SessionUpdate!
  deleteSnippet(sessionSlug: String!, hostSecretHash: String!, snippetId: String!): SessionUpdate!
  clearClipboard(sessionSlug: String!, hostSecretHash: String!): SessionUpdate!
  addQuestion(sessionSlug: String!, text: String!, fingerprint: String!): SessionUpdate!
  upvoteQuestion(sessionSlug: String!, questionId: String!, fingerprint: String!, remove: Boolean): SessionUpdate!
  addReply(sessionSlug: String!, questionId: String!, text: String!, fingerprint: String!, isHostReply: Boolean!): SessionUpdate!
  focusQuestion(sessionSlug: String!, hostSecretHash: String!, questionId: String): SessionUpdate!
}
```

Note: `onSessionUpdate` subscription stays on `@aws_subscribe(mutations: ["_stub"])` — adding all real mutations here risks the enhanced filter conflicting with the argument-based filter. Instead, keep `_stub` as the only subscription trigger and have Lambda call a **separate publish mutation** (local NONE-resolver) after the DynamoDB write. See Pattern 2.

### Pattern 2: Two-Step Publish (Lambda → NONE Mutation)

**What:** Lambda mutation resolvers write to DynamoDB, then return their data. A separate NONE-resolver publish mutation is called from within the Lambda to fan-out to subscribers.

**Why:** The current subscription uses `@aws_subscribe(mutations: ["_stub"])`. Switching to all real mutations is fine but risks schema compilation errors on SST deploy if any mutation type mismatches. The safer approach: keep `_stub` in the subscribe list AND add all real mutations to it:

```graphql
type Subscription {
  onSessionUpdate(sessionSlug: String!): SessionUpdate
    @aws_subscribe(mutations: ["_stub", "pushSnippet", "deleteSnippet", "clearClipboard", "addQuestion", "upvoteQuestion", "addReply", "focusQuestion"])
}
```

The Lambda resolvers for real mutations write to DynamoDB, then return a `SessionUpdate`. AppSync propagates the return value to subscribers because it matches `@aws_subscribe`. **This is the simplest pattern** — no secondary publish call needed.

```typescript
// Source: AWS AppSync docs + project pattern
// packages/functions/src/resolvers/clipboard.ts
export async function pushSnippet(args: PushSnippetArgs): Promise<SessionUpdate> {
  const id = ulid(); // already using INFRA-09 ULIDs
  const now = Math.floor(Date.now() / 1000);

  // 1. Verify hostSecret
  const session = await getSessionWithSecret(args.sessionSlug);
  if (session.hostSecretHash !== args.hostSecretHash) {
    throw new Error('Unauthorized');
  }

  // 2. Write to DynamoDB
  await docClient.send(new PutCommand({
    TableName: tableName(),
    Item: {
      PK: `SESSION#${args.sessionSlug}`,
      SK: `SNIPPET#${id}`,
      id, sessionSlug: args.sessionSlug,
      type: args.type, content: args.content,
      language: args.language ?? null,
      createdAt: now, TTL: now + 86400,
    },
  }));

  // 3. Return SessionUpdate — AppSync propagates to subscribers automatically
  return {
    eventType: 'SNIPPET_ADDED',
    sessionSlug: args.sessionSlug,
    payload: JSON.stringify({ id, type: args.type, content: args.content, language: args.language, createdAt: now }),
  };
}
```

### Pattern 3: Client Subscription Provider

**What:** Single `useSessionUpdates` hook subscribes to AppSync and dispatches events to a `useReducer`-based session state.

**When to use:** Mount once at the session page level; pass state down as props.

```typescript
// Source: @aws-amplify/api-graphql docs + AWS AppSync building-a-client-app guide
// packages/frontend/src/hooks/use-session-updates.ts
'use client';

import { useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import type { SessionUpdate } from '@nasqa/core';

const client = generateClient(); // singleton outside hook

const SUBSCRIPTION = `
  subscription OnSessionUpdate($sessionSlug: String!) {
    onSessionUpdate(sessionSlug: $sessionSlug) {
      eventType sessionSlug payload
    }
  }
`;

export function useSessionUpdates(
  sessionSlug: string,
  onUpdate: (event: SessionUpdate) => void
) {
  useEffect(() => {
    const sub = (client.graphql({
      query: SUBSCRIPTION,
      variables: { sessionSlug },
    }) as any).subscribe({
      next: ({ data }: { data: { onSessionUpdate: SessionUpdate } }) => {
        onUpdate(data.onSessionUpdate);
      },
      error: (err: unknown) => console.error('Subscription error:', err),
    });

    return () => sub.unsubscribe();
  }, [sessionSlug, onUpdate]);
}
```

**Critical:** `generateClient()` must be called in a `'use client'` file. Subscriptions are NOT available in server runtimes — confirmed by AWS Amplify docs.

**Amplify configuration** must happen once at app startup (in `providers.tsx` or a dedicated `AmplifyProvider`):

```typescript
// packages/frontend/src/lib/appsync-client.ts
import { Amplify } from 'aws-amplify';

Amplify.configure({
  API: {
    GraphQL: {
      endpoint: process.env.NEXT_PUBLIC_APPSYNC_URL!,
      region: process.env.NEXT_PUBLIC_AWS_REGION ?? 'us-east-1',
      defaultAuthMode: 'apiKey',
      apiKey: process.env.NEXT_PUBLIC_APPSYNC_API_KEY!,
    }
  }
});
```

`NEXT_PUBLIC_APPSYNC_URL` and `NEXT_PUBLIC_APPSYNC_API_KEY` must be added as SST outputs linked to the frontend. The SST AppSync component exposes `api.url` (already returned) and `api.apiKey` (add to sst.config.ts outputs + site env).

### Pattern 4: Shiki Server-Side with Dual Themes

**What:** Async RSC renders highlighted HTML with both light and dark colors embedded as CSS variables. No JavaScript reaches the client for highlighting.

**When to use:** `SnippetHero` and `SnippetCard` components. Also used in a Server Action for the host live preview.

```typescript
// Source: https://shiki.style/guide/dual-themes + https://shiki.style/packages/next
// packages/frontend/src/components/session/shiki-block.tsx
import { codeToHtml } from 'shiki';
import type { BundledLanguage } from 'shiki';

interface ShikiBlockProps {
  code: string;
  lang: BundledLanguage | 'text';
  showLineNumbers?: boolean;
}

export async function ShikiBlock({ code, lang, showLineNumbers = false }: ShikiBlockProps) {
  if (lang === 'text') {
    return <pre className="whitespace-pre-wrap break-words font-sans">{code}</pre>;
  }

  const html = await codeToHtml(code, {
    lang,
    themes: { light: 'github-light', dark: 'github-dark' },
    // addDefaultColorValues: true is the default
  });

  return (
    <div
      className="shiki-wrapper overflow-x-auto text-sm"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

**CSS for theme switching (add to globals.css):**
```css
/* next-themes sets html.dark — switch shiki colors */
html.dark .shiki,
html.dark .shiki span {
  color: var(--shiki-dark) !important;
  background-color: var(--shiki-dark-bg) !important;
  font-style: var(--shiki-dark-font-style) !important;
  font-weight: var(--shiki-dark-font-weight) !important;
  text-decoration: var(--shiki-dark-text-decoration) !important;
}
```

**Host live preview:** The host input is a Client Component and cannot call `codeToHtml` directly. Use a Next.js Server Action:

```typescript
// packages/frontend/src/actions/snippet.ts
'use server';
import { codeToHtml } from 'shiki';

export async function renderHighlight(code: string, lang: string): Promise<string> {
  return codeToHtml(code, {
    lang: lang as any,
    themes: { light: 'github-light', dark: 'github-dark' },
  });
}
```

The host input calls this action with a 300ms debounce to update the preview `innerHTML`.

### Pattern 5: TanStack Query Optimistic Mutations

**What:** `useMutation` with `onMutate` to update the query cache immediately; `onError` to rollback; `onSettled` to sync from server.

**When to use:** All host write operations (push snippet, delete, clear) and participant operations (add question, upvote, add reply).

```typescript
// Source: TanStack Query v5 docs — optimistic updates
// packages/frontend/src/hooks/use-session-state.ts (simplified)

// The session state lives in a React context / useReducer, NOT in TanStack Query cache.
// Reason: subscription events arrive independently of mutations; merging them is cleaner
// in a reducer than in TanStack Query's cache-invalidation model.

// Optimistic: update local state immediately
dispatch({ type: 'ADD_SNIPPET_OPTIMISTIC', payload: tempSnippet });

// Then call the Server Action mutation
const result = await pushSnippetAction(args);
if (!result.ok) {
  // rollback
  dispatch({ type: 'REMOVE_SNIPPET', payload: tempSnippet.id });
}
// If successful, the AppSync subscription event arrives and replaces the temp item
// with the server-confirmed item (by id match). The temp id uses a client-generated
// random prefix; the server id is the canonical ULID.
```

**Key insight for optimistic + subscription merge:** Generate a temp `id` client-side for the optimistic item. When the AppSync `SNIPPET_ADDED` event arrives (within ~150ms), match by content+timestamp proximity OR by a client correlation ID passed in the payload. Replace the optimistic item with the confirmed one. This avoids showing duplicate items.

### Pattern 6: DynamoDB Atomic Upvote with Vote Tracking

**What:** `UpdateItem` with `ADD upvoteCount :1` is atomic. Server tracks which fingerprints have voted via a `voters` StringSet attribute on the Question item using conditional expressions.

```typescript
// Source: AWS DynamoDB docs — ADD operation, condition expressions
// packages/functions/src/resolvers/qa.ts
import { UpdateCommand, ConditionalCheckFailedException } from '@aws-sdk/lib-dynamodb';

export async function upvoteQuestion(args: UpvoteArgs) {
  const increment = args.remove ? -1 : 1;
  const conditionExpr = args.remove
    ? 'contains(voters, :fp)'           // can only remove if already voted
    : 'not contains(voters, :fp)';      // can only add if not already voted

  try {
    await docClient.send(new UpdateCommand({
      TableName: tableName(),
      Key: { PK: `SESSION#${args.sessionSlug}`, SK: `QUESTION#${args.questionId}` },
      UpdateExpression: 'ADD upvoteCount :inc, voters :fpSet',
      ConditionExpression: conditionExpr,
      ExpressionAttributeValues: {
        ':inc': increment,
        ':fpSet': new Set([args.fingerprint]),
        ':fp': args.fingerprint,
      },
    }));
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      // Already voted / not voted — return current state, client should revert
      throw new Error('VOTE_CONFLICT');
    }
    throw err;
  }

  return {
    eventType: args.remove ? 'QUESTION_UPDATED' : 'QUESTION_UPDATED',
    sessionSlug: args.sessionSlug,
    payload: JSON.stringify({ questionId: args.questionId, upvoteDelta: increment }),
  };
}
```

### Pattern 7: Language Auto-Detection for Host Input

**What:** Heuristic detection of programming language from pasted code content.

**Recommendation (Claude's Discretion area):** Use `highlight.js` `highlightAuto()` for language detection only (not rendering). highlight.js is not in the client bundle if only used in the Server Action for preview rendering. For the instant client-side language chip display, use a minimal keyword heuristic (50–100 lines of code) that detects the top 10 languages by common patterns (no external library needed client-side).

**Simple heuristic approach (client-side, zero bundle cost):**
```typescript
function detectLanguage(code: string): string {
  if (/^\s*(import |from |const |let |var |function |class |=>|interface |type )/.test(code) && /[{}]/.test(code)) return 'typescript';
  if (/^\s*(def |import |from |class |if __name__)/.test(code)) return 'python';
  if (/^\s*(func |package |var |import \(|:= )/.test(code)) return 'go';
  if (/<\/?[a-z][\s\S]*>/i.test(code)) return 'html';
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE)\b/i.test(code)) return 'sql';
  if (/^\s*\{[\s\S]*\}$/.test(code.trim())) return 'json';
  if (/^\s*#/.test(code) && /:\s*$/.test(code)) return 'yaml';
  return 'text'; // fallback to plain text
}
```

Host can override the detected language via a chip selector (discretion area).

### Anti-Patterns to Avoid

- **Importing Shiki in a Client Component:** Shiki bundles are large (~2MB uncompressed). Any `import { codeToHtml } from 'shiki'` inside a file with `'use client'` will bloat the bundle catastrophically. Only import Shiki in RSC or Server Actions.
- **Calling `Amplify.configure()` in a Server Component:** Amplify configuration is client-only. Must be in a `'use client'` provider or called in `lib/appsync-client.ts` which is only imported from client files.
- **Subscribing to AppSync in a Server Component or Server Action:** Subscriptions require a persistent WebSocket. Only possible in Client Components with `useEffect`.
- **Adding all mutations to `@aws_subscribe` without updating the subscription filter:** The `setSubscriptionFilter` already filters by `sessionSlug`. If a mutation does not return `sessionSlug`, the filter fails and no events are delivered. Every mutation MUST return `sessionSlug` in the `SessionUpdate`.
- **Using DynamoDB `voters` StringSet with `ADD` on an empty set:** DynamoDB requires the `voters` attribute to exist before using `ADD` with a Set. Initialize `voters` as an empty set on Question creation, OR use `UpdateExpression: 'ADD upvoteCount :inc SET voters = if_not_exists(voters, :emptySet)'` — but SET and ADD cannot target the same path. Solution: initialize `voters = :emptySet` in PutItem.
- **Optimistic UI without temp ID deduplication:** If the optimistic item and the subscription event both appear, the list will show duplicates. Always replace optimistic items on event arrival using a stable correlation.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebSocket reconnection with exponential backoff | Custom WebSocket manager | `@aws-amplify/api-graphql` subscription | Amplify handles reconnect, auth refresh, connection state automatically |
| Syntax highlighting in browser | Custom tokenizer | Shiki in RSC / Server Action | Tokenizer accuracy requires TextMate grammars (megabytes of data) |
| Atomic counter deduplication | Optimistic lock with retries | DynamoDB `ADD` + `ConditionExpression` | Native atomic operations; conditional check handles race conditions |
| CSS theme switching for code | JS theme toggle on code elements | Shiki CSS variables + `html.dark` CSS rule | Zero JS cost; no flash; works with SSR |
| Sort animation for Q&A feed | Manual DOM manipulation | Framer Motion `layout` prop on list items | `AnimatePresence` + `layout` handles FLIP animations automatically |

**Key insight:** The subscription/pub-sub infrastructure is already provisioned. Do not add an additional WebSocket layer (Socket.io, Pusher, etc.) — AppSync is the real-time transport.

---

## Common Pitfalls

### Pitfall 1: SST AppSync Schema Compilation Failure on Subscription Mutation List

**What goes wrong:** Adding real mutations to `@aws_subscribe` while the Lambda resolver returns `SessionUpdate` with `payload: AWSJSON` — but AWSJSON is not a standard GraphQL scalar that AppSync schema validator accepts without the AWS extension.

**Why it happens:** `AWSJSON` is an AppSync-specific scalar. SST schema compilation validates GraphQL syntax but may not inject all AppSync scalars automatically.

**How to avoid:** Ensure `schema.graphql` has no `scalar AWSJSON` declaration (AppSync adds it automatically). Keep the existing schema structure — do not add `scalar AWSJSON`.

**Warning signs:** SST deploy fails with "Unknown type AWSJSON" or similar schema error.

### Pitfall 2: Shiki Cold Start Latency on First Request

**What goes wrong:** First call to `codeToHtml` takes 500ms+ because Shiki lazily loads TextMate grammars. Subsequent calls are fast (cached).

**Why it happens:** Shiki loads language grammars and themes on first use. In a serverless (Lambda) environment, every cold start re-pays this cost.

**How to avoid:** For the Next.js frontend (server-rendered in the SST Nextjs component), Shiki grammars are cached per process instance. The live preview Server Action will be slow on first call in development but fast in production with warm instances. Accept this trade-off; do not pre-warm Shiki client-side.

**Warning signs:** Host sees a 1-2s delay for the first preview after a cold deploy.

### Pitfall 3: AppSync Subscription Filter Mismatch Silently Drops Events

**What goes wrong:** Events published from mutations don't reach subscribers even though the mutation succeeds.

**Why it happens:** The `setSubscriptionFilter` in `subscription-onSessionUpdate.js` checks `sessionSlug: { eq: ctx.args.sessionSlug }`. If any mutation returns a `SessionUpdate` where `sessionSlug` is null or a different slug, the filter silently drops the event.

**How to avoid:** Every Lambda mutation resolver MUST return `sessionSlug: args.sessionSlug` (the exact slug from the mutation arguments). Add a test: after deploying, verify subscription events arrive by testing with AppSync console → Execute Mutation.

**Warning signs:** Participants don't see updates even though host push succeeds (DynamoDB item appears in table).

### Pitfall 4: `voters` StringSet DynamoDB Initialization

**What goes wrong:** `ConditionalCheckFailedException` or `ValidationException` on first upvote because `voters` attribute doesn't exist.

**Why it happens:** DynamoDB's `ADD` operation with a StringSet requires the attribute to either not exist (creates it) OR be the same type. But a `contains()` condition on a non-existent attribute returns false, which is correct. The real issue is if `SET voters = if_not_exists(voters, :emptySet)` and `ADD voters :fpSet` are in the same expression — DynamoDB rejects updates to the same path via both SET and ADD.

**How to avoid:** In `addQuestion`, always initialize `voters` as an empty StringSet: `Item: { ..., voters: docClient.createSet(['__init__']) }` then immediately `DELETE voters :initSet`. Simpler: initialize as `voters: new Set([])` — DynamoDB lib-dynamodb handles marshalling. OR: use a separate `votedBy` attribute as a set and only `ADD` to it; use the `contains` condition.

**Warning signs:** First upvote on a question throws a DynamoDB error; subsequent upvotes work.

### Pitfall 5: Client Bundle Bloat from Shiki Import

**What goes wrong:** `@next/bundle-analyzer` shows Shiki appearing in a client chunk, pushing bundle well over 80kB.

**Why it happens:** A component that imports `shiki` is accidentally marked `'use client'` or imported by a Client Component directly.

**How to avoid:** Keep `ShikiBlock` as a pure `async function` with no `'use client'` directive. Never import it from a file that has `'use client'`. The host preview uses a Server Action — the action file must not be imported from a client component's module graph (it is called via form action or `startTransition`, not imported as a module).

**Warning signs:** `next build` output shows `shiki` in the `/_next/static/chunks/` analysis.

### Pitfall 6: NEXT_PUBLIC_APPSYNC_URL Not Available at Runtime

**What goes wrong:** `Amplify.configure` receives undefined endpoint; subscription silently fails to connect.

**Why it happens:** SST's `sst.aws.Nextjs` component must be configured to pass environment variables as `NEXT_PUBLIC_*` via the `environment` prop, AND the AppSync API must expose its `apiKey` output.

**How to avoid:** In `sst.config.ts`, update the `NasqaSite` definition:
```typescript
const site = new sst.aws.Nextjs("NasqaSite", {
  path: "packages/frontend",
  link: [table],
  environment: {
    NEXT_PUBLIC_APPSYNC_URL: api.url,
    NEXT_PUBLIC_APPSYNC_API_KEY: api.apiKey,   // verify this output name
    NEXT_PUBLIC_AWS_REGION: 'us-east-1',
  },
});
```

Verify the exact output property name for `api.apiKey` in SST Ion's AppSync component docs.

**Warning signs:** Console shows "No endpoint configured" or WebSocket connection to `wss://...` fails with 401.

---

## Code Examples

Verified patterns from official sources:

### Shiki Dual Theme (Server Component)
```typescript
// Source: https://shiki.style/guide/dual-themes
import { codeToHtml } from 'shiki';

const html = await codeToHtml('const x = 1', {
  lang: 'typescript',
  themes: { light: 'github-light', dark: 'github-dark' },
});
// Returns: <pre class="shiki shiki-themes github-light github-dark" ...>
//   <span style="color:#005CC5;--shiki-dark:#79B8FF">const</span>...
```

### CSS Theme Switch (globals.css addition)
```css
/* Source: https://shiki.style/guide/dual-themes#class-based-dark-mode */
html.dark .shiki,
html.dark .shiki span {
  color: var(--shiki-dark) !important;
  background-color: var(--shiki-dark-bg) !important;
  font-style: var(--shiki-dark-font-style) !important;
  font-weight: var(--shiki-dark-font-weight) !important;
  text-decoration: var(--shiki-dark-text-decoration) !important;
}
```

### AppSync Subscription in Client Component
```typescript
// Source: https://docs.aws.amazon.com/appsync/latest/devguide/building-a-client-app.html
// Source: @aws-amplify/api-graphql v4 API
import { generateClient } from 'aws-amplify/api';

const client = generateClient();

// In useEffect:
const sub = (client.graphql({
  query: ON_SESSION_UPDATE,
  variables: { sessionSlug },
}) as any).subscribe({
  next: ({ data }: any) => handleUpdate(data.onSessionUpdate),
  error: (err: unknown) => console.error(err),
});

return () => sub.unsubscribe(); // cleanup
```

### DynamoDB Atomic Upvote with Voter Tracking
```typescript
// Source: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html
await docClient.send(new UpdateCommand({
  TableName: tableName(),
  Key: { PK: `SESSION#${slug}`, SK: `QUESTION#${qid}` },
  UpdateExpression: 'ADD upvoteCount :inc, voters :fpSet',
  ConditionExpression: 'not contains(voters, :fp)',
  ExpressionAttributeValues: {
    ':inc': 1,
    ':fpSet': new Set([fingerprint]),
    ':fp': fingerprint,
  },
}));
```

### Framer Motion Sort Animation for Q&A Feed
```tsx
// Source: https://www.framer.com/motion/ — layout animations
import { AnimatePresence, motion } from 'framer-motion';

// Questions array sorted by upvoteCount desc
{sortedQuestions.map(q => (
  <motion.div
    key={q.id}
    layout                                    // animates position change on re-sort
    initial={{ opacity: 0, y: -8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, height: 0 }}
    transition={{ duration: 0.3 }}
  >
    <QuestionCard question={q} />
  </motion.div>
))}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| VTL (Velocity Template Language) resolvers | JavaScript resolvers (APPSYNC_JS) | AppSync ~2022, now standard | Already using JS resolvers; no VTL needed |
| Separate AppSync publish call from Lambda | Return value from mutation resolver triggers subscribers | AppSync always | Lambda returns SessionUpdate; no secondary call needed |
| highlight.js in browser bundle | Shiki in RSC (zero client bundle) | ~2023 with RSC | CLIP-03 compliance; no client JS cost |
| `Amplify.configure()` with `amplify_outputs.json` | Manual `Amplify.configure()` with explicit endpoint/key | Current (no Amplify backend) | Project uses SST not Amplify CLI — configure manually |

**Deprecated/outdated:**
- VTL mapping templates: Project correctly uses JS resolvers. Do not use VTL.
- `API.graphql()` from `aws-amplify` (old API): Use `generateClient()` from `aws-amplify/api` or `@aws-amplify/api-graphql`. The project already has `@aws-amplify/api-graphql` v4 installed.
- AppSync Events (new 2025 PubSub API): This is a new pure pub/sub service separate from AppSync GraphQL. Not applicable here — project uses GraphQL subscriptions.

---

## Open Questions

1. **SST AppSync `api.apiKey` output property name**
   - What we know: SST `sst.aws.AppSync` returns `api.url`; the existing `sst.config.ts` only returns `apiUrl`
   - What's unclear: The exact property name for the API key in SST Ion's AppSync component — may be `api.apiKey` or may not be exposed yet
   - Recommendation: Check `sst.dev/docs/component/aws/app-sync/` outputs section before implementing the Amplify configure step. Fallback: hardcode API key via SST secret.

2. **AppSync subscription filter behavior when Lambda mutation is slow**
   - What we know: If Lambda cold-starts take >200ms, INFRA-07 latency target is at risk
   - What's unclear: Whether the 200ms budget includes Lambda cold start or measures only AppSync internal propagation
   - Recommendation: Use SST's `warm` option on the Lambda function or accept that first-request after cold start may exceed 200ms. Monitor with CloudWatch; add provisioned concurrency only if cold starts are frequent.

3. **Connected participant count (Session Liveness Indicators)**
   - What we know: CONTEXT.md requires a "connected participant count" visible to both host and participants; STATE.md notes AppSync connection lifecycle tracking is LOW confidence
   - What's unclear: AppSync WebSocket lifecycle events (connect/disconnect) are not standard GraphQL subscription events — there's no built-in "subscriber count" API
   - Recommendation: Implement a simpler approach: track connection events client-side by having each client send a "heartbeat" ping mutation on connect/disconnect (or via `beforeunload`), stored in a lightweight DynamoDB counter. Alternatively, maintain an in-memory count in a Lambda global if the same function instance handles all connections (unreliable in Lambda). For Phase 3, show a count based on "participants who subscribed in the last N minutes" from a DynamoDB scan. Flag as an approximation.

---

## Sources

### Primary (HIGH confidence)
- `https://shiki.style/guide/dual-themes` — Dual theme CSS variable pattern, class-based switching
- `https://shiki.style/packages/next` — Next.js RSC integration, `codeToHtml` pattern
- `https://docs.aws.amazon.com/appsync/latest/devguide/tutorial-local-resolvers-js.html` — NONE data source JS resolver pattern for pub/sub
- `https://docs.aws.amazon.com/appsync/latest/devguide/aws-appsync-real-time-data.html` — How `@aws_subscribe` triggers subscription fan-out from mutations
- `https://docs.aws.amazon.com/appsync/latest/devguide/building-a-client-app.html` — Amplify `generateClient` + subscription pattern
- Project source: `infra/schema.graphql`, `infra/resolvers/subscription-onSessionUpdate.js`, `sst.config.ts` — existing infrastructure constraints

### Secondary (MEDIUM confidence)
- `https://tanstack.com/query/v5/docs/framework/react/guides/optimistic-updates` — Optimistic mutation pattern (verified page redirected; content confirmed via search summaries)
- `https://aws.amazon.com/blogs/mobile/amplify-javascript-v6/` — Amplify v6 Next.js App Router support; `generateClient` usage
- `https://advancedweb.hu/real-time-data-with-appsync-subscriptions/` — AppSync subscription field/mutation relationship

### Tertiary (LOW confidence)
- SST Ion AppSync `api.apiKey` output property — not directly verified; assumed based on SST component patterns. Must validate before implementation.
- Connected participant count via AppSync — LOW; AppSync does not natively expose subscriber counts.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and version-pinned in package.json
- Architecture patterns: HIGH — AppSync mutation→subscription flow confirmed via official docs; Shiki dual-theme confirmed via official docs
- Pitfalls: MEDIUM-HIGH — most pitfalls verified via official docs; voters StringSet initialization requires hands-on validation
- Open questions: LOW — SST api.apiKey property and connected-count require implementation-time verification

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (30 days — Shiki and AppSync are stable; SST Ion evolves faster, check SST docs before implementing sst.config changes)
