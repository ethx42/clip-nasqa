# Architecture Research

**Domain:** Real-time session tool — Next.js 16 + AppSync + DynamoDB performance optimization
**Researched:** 2026-03-17
**Confidence:** HIGH (based on direct codebase inspection)

---

## Standard Architecture

### Current System Overview (Before v2.0)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          BROWSER (Client)                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌───────────────────────────────────────────────┐    │
│  │  SessionLivePage  │  │           useSessionUpdates                   │    │
│  │  SessionLive      │  │  Amplify appsyncClient.graphql() WebSocket    │    │
│  │  HostPage         │  │  (already direct — no Server Action hop)      │    │
│  └────────┬──────────┘  └───────────────────────────────────────────┘      │
│           │ calls                          ↑ real-time subscription events  │
│  ┌────────▼────────────────────────────┐                                    │
│  │  useSessionMutations / useHost      │                                    │
│  │  Mutations → safeAction(serverAct)  │                                    │
│  └────────┬────────────────────────────┘                                    │
│           │ fetch POST (Server Action RPC)                                   │
└───────────│──────────────────────────────────────────────────────────────────┘
            │
┌───────────▼──────────────────────────────────────────────────────────────────┐
│                     NETLIFY EDGE (Next.js Server)                            │
├──────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Server Actions: snippet.ts / qa.ts / moderation.ts / reactions.ts  │    │
│  │  - getTranslations() on EVERY call (eager i18n load)                │    │
│  │  - appsyncMutation() via plain fetch POST                           │    │
│  └────────────────────────┬────────────────────────────────────────────┘    │
│                           │ HTTP POST                                         │
│  ┌────────────────────────▼────────────────────────────────────────────┐    │
│  │  SSR Page Routes: getSession() + getSessionData()                   │    │
│  │  - Direct AWS SDK calls to DynamoDB (no cache)                      │    │
│  │  - generateMetadata() ALSO calls getSessionData() (redundant scan) │    │
│  └────────────────────────┬────────────────────────────────────────────┘    │
│                           │ HTTP POST (extra network hop)                    │
└───────────────────────────│──────────────────────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────────────────────┐
│                         AWS AppSync                                           │
├──────────────────────────────────────────────────────────────────────────────┤
│  Mutation resolvers → lambdaDS → Lambda (128MB default memory)               │
│  Subscription: onSessionUpdate (NONE data source, server-side filter)        │
└───────────────────────────┬──────────────────────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────────────────────┐
│                         Lambda (ResolverFn)                                   │
│  128MB default — all 12 mutation resolvers in one handler                    │
│  DynamoDB SDK calls per mutation                                              │
└───────────────────────────┬──────────────────────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────────────────────┐
│                    DynamoDB (single-table, on-demand)                        │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Target System Overview (After v2.0)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          BROWSER (Client)                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │  useSessionMutations / useHostMutations                            │     │
│  │  — appsyncClient.graphql(mutation) DIRECTLY (no Netlify hop)      │     │
│  │  — optimistic dispatch before await                               │     │
│  └───────────────────────────────────────────────────────────────────┘     │
│                                  │                                           │
│  ┌────────────────────────────────▼──────────────────────────────────┐     │
│  │  useHostMutations (host-input.tsx push)                           │     │
│  │  — dispatch({ type: "ADD_SNIPPET_OPTIMISTIC" }) immediately       │     │
│  │  — appsyncClient.graphql(PUSH_SNIPPET) direct                     │     │
│  │  — subscription confirms with real ID → SNIPPET_ADDED replaces   │     │
│  └───────────────────────────────────────────────────────────────────┘     │
│                                  │ direct GraphQL HTTP POST                  │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │  Shiki client-side (dynamic import, lazy)                        │      │
│  │  import('shiki/bundle/web') for host preview rendering           │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                  │ WebSocket subscription (unchanged)        │
└──────────────────────────────────│───────────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼───────────────────────────────────────────┐
│                     NETLIFY EDGE (Next.js Server)                            │
├──────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │  createSession() Server Action — KEPT (needs crypto, direct DB)   │      │
│  └────────────────────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │  SSR Page Routes: React.cache(getSession) + React.cache(getData)  │      │
│  │  — same render pass deduplicates DynamoDB calls                   │      │
│  │  — generateMetadata() reuses cached result from page render       │      │
│  └────────────────────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │  Server Actions (renderHighlight REMOVED, i18n lazy on error)     │      │
│  └────────────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────────────┘

AppSync + Lambda + DynamoDB — unchanged structurally,
Lambda memory bumped (512MB) in sst.config.ts
```

---

## Component Responsibilities

| Component                                                             | Responsibility                                              | Status in v2.0                                                                                                             |
| --------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `lib/session.ts` (`getSession`, `getSessionData`)                     | SSR DynamoDB reads for initial hydration                    | MODIFIED — wrap with `cache()`                                                                                             |
| `lib/appsync-server.ts` (`appsyncMutation`)                           | Server-side HTTP POST to AppSync used by Server Actions     | RETAINED for any remaining SAs; unused if all mutations go client-side                                                     |
| `lib/appsync-client.ts` (`appsyncClient`)                             | Amplify client for subscriptions and (new) direct mutations | EXTENDED — add `graphqlMutation()` helper                                                                                  |
| `lib/safe-action.ts`                                                  | Wraps Server Action promises for network error handling     | EXTENDED — add `safeClientMutation()` for direct GraphQL calls                                                             |
| `lib/parse-appsync-error.ts`                                          | (New) Shared AppSync error → user message parser            | NEW FILE — extracted from Server Action inline functions                                                                   |
| Server Actions `snippet.ts`, `qa.ts`, `moderation.ts`, `reactions.ts` | Validate + call AppSync + return ActionResult               | MODIFIED — mutation bodies removed; only `renderHighlight` and session-creation helpers remain, then those too are removed |
| `actions/session.ts` (`createSession`)                                | Session creation via DynamoDB directly, uses Node.js crypto | UNCHANGED — must stay Server Action                                                                                        |
| `hooks/use-session-mutations.ts`                                      | Optimistic dispatch + mutation for participant actions      | MODIFIED — call `graphqlMutation()` directly                                                                               |
| `hooks/use-host-mutations.ts`                                         | Optimistic dispatch + mutation for host actions             | MODIFIED — call `graphqlMutation()` directly; add `handlePushSnippet`                                                      |
| `components/session/host-input.tsx`                                   | Snippet push UI with Shiki preview                          | MODIFIED — optimistic via `onPush` prop + lazy client Shiki                                                                |
| `components/session/shiki-block.tsx`                                  | Async Server Component rendering Shiki HTML for display     | UNCHANGED — stays server-only for displayed snippets                                                                       |
| `components/session/qa-panel.tsx`                                     | Renders sorted questions with debounced sort                | MODIFIED — debounce 1000ms → 300ms                                                                                         |
| `sst.config.ts` (`ResolverFn`)                                        | Lambda function definition                                  | MODIFIED — add `memory: "512 MB"`                                                                                          |

---

## Recommended Project Structure Changes

```
packages/frontend/src/
├── lib/
│   ├── appsync-client.ts        # EXTENDED: export graphqlMutation() helper
│   ├── appsync-server.ts        # RETAINED (unchanged; used by createSession path if needed)
│   ├── safe-action.ts           # EXTENDED: add safeClientMutation() alongside safeAction()
│   ├── parse-appsync-error.ts   # NEW: shared parseAppsyncError() extracted from action files
│   ├── session.ts               # MODIFIED: wrap getSession/getSessionData with cache()
│   └── graphql/
│       ├── mutations.ts         # UNCHANGED: mutation strings already defined
│       └── subscriptions.ts     # UNCHANGED
├── hooks/
│   ├── use-session-mutations.ts # MODIFIED: direct appsyncClient calls
│   ├── use-host-mutations.ts    # MODIFIED: direct calls + handlePushSnippet added
│   └── use-session-updates.ts  # UNCHANGED
├── actions/
│   ├── session.ts               # UNCHANGED: createSession stays as Server Action
│   ├── snippet.ts               # MODIFIED: renderHighlight removed; push/delete/clear removed
│   ├── qa.ts                    # MODIFIED: all mutation bodies removed
│   ├── moderation.ts            # MODIFIED: all mutation bodies removed
│   └── reactions.ts             # MODIFIED: all mutation bodies removed
└── components/session/
    ├── host-input.tsx           # MODIFIED: receives onPush prop; lazy client Shiki
    ├── clipboard-panel.tsx      # MODIFIED: threads onPush prop from parent
    └── shiki-block.tsx          # UNCHANGED: stays server-only for displayed snippets
sst.config.ts                    # MODIFIED: Lambda memory "512 MB"
```

---

## Architectural Patterns

### Pattern 1: Direct Client-to-AppSync Mutations (Bypass Server Action Hop)

**What:** Replace `safeAction(serverAction(...))` calls in hooks with `appsyncClient.graphql({ query: MUTATION_STRING, variables })` calls directly from the client hook. The Amplify client is already configured in `appsync-client.ts` with `apiKey` auth mode and is already used for subscriptions in `use-session-updates.ts`.

**When to use:** All mutations that do not require server-only capabilities. `createSession` in `actions/session.ts` must stay a Server Action because it uses `node:crypto`, writes directly to DynamoDB, and must protect the raw secret from client exposure.

**Trade-offs:**

- Pro: Eliminates one full network round-trip (Client → Netlify → AppSync becomes Client → AppSync directly).
- Pro: Estimated ~50-150ms latency reduction per mutation depending on Netlify edge proximity relative to AppSync region.
- Con: `getTranslations` for error messages is a server-only import. Error strings for rate limits and ban messages must move to client-side. Solution: extract error parsing to `lib/parse-appsync-error.ts` and use `useTranslations` (already used in both hooks for `tErrors`).
- Con: API key becomes used by client code — but `NEXT_PUBLIC_APPSYNC_API_KEY` is already exposed in the browser. No security regression; AppSync API key is not a secret for this auth model.

**Integration point in `lib/appsync-client.ts`:**

```typescript
// Addition to existing appsync-client.ts
export async function graphqlMutation<T = unknown>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const result = await appsyncClient.graphql({ query, variables });
  // Amplify throws on GraphQL errors; no manual check needed
  return (result as { data: T }).data;
}
```

In hooks, replace the pattern:

```typescript
// BEFORE
await safeAction(
  upvoteQuestionAction({ sessionSlug, questionId, fingerprint, remove }),
  tErrors("networkError"),
);

// AFTER
await safeClientMutation(
  () => graphqlMutation(UPVOTE_QUESTION, { sessionSlug, questionId, fingerprint, remove }),
  tErrors("networkError"),
);
```

### Pattern 2: Optimistic Snippet Dispatch in host-input.tsx

**What:** Before awaiting the AppSync mutation, dispatch `ADD_SNIPPET_OPTIMISTIC` with a `_opt_${Date.now()}` temp ID into the session reducer. When the `SNIPPET_ADDED` subscription event arrives, it replaces the optimistic entry via content-fingerprint matching (same pattern as `QUESTION_ADDED` in the reducer).

**When to use:** Snippet push only (host action). Questions and replies already implement this pattern in `use-session-mutations.ts` via `handleAddQuestion` and `handleReply`.

**Trade-offs:**

- Pro: Host sees their own snippet appear at ~0ms instead of waiting for mutation RTT + subscription delivery.
- Con: On mutation failure, the optimistic snippet must be rolled back via `REMOVE_OPTIMISTIC`. The current `host-input.tsx` already restores textarea content on failure — add `REMOVE_OPTIMISTIC` dispatch.
- Con: The existing `SNIPPET_ADDED` reducer path handles `optimisticId` replacement when an ID is explicitly provided. But for subscriptions arriving without `optimisticId`, the fallback is ID-based dedup only. Since the optimistic ID is `_opt_...` and the real ID is a UUID, ID dedup will not match. Use content-fingerprint dedup instead (check for matching `sessionSlug + content + type` among optimistic entries) — consistent with how `QUESTION_ADDED` handles this.

**Ownership resolution:** `dispatch` is not currently available in `host-input.tsx`. Rather than prop-drilling through `ClipboardPanel`, add `handlePushSnippet` to `use-host-mutations.ts` (which already has `dispatch`). Pass it as `onPush` to `HostInput`:

```typescript
// use-host-mutations.ts addition
const handlePushSnippet = useCallback(
  async (content: string, lang: string) => {
    const tempId = `_opt_${Date.now()}`;
    const type = lang !== "text" ? "code" : "text";
    dispatch({
      type: "ADD_SNIPPET_OPTIMISTIC",
      payload: {
        id: tempId,
        sessionSlug,
        content,
        type,
        language: lang !== "text" ? lang : undefined,
        createdAt: Math.floor(Date.now() / 1000),
        TTL: 0,
      },
    });
    const result = await safeClientMutation(
      () =>
        graphqlMutation(PUSH_SNIPPET, {
          sessionSlug,
          hostSecretHash,
          content,
          type,
          language: lang !== "text" ? lang : undefined,
        }),
      tErrors("networkError"),
    );
    if (!result.success) {
      dispatch({ type: "REMOVE_OPTIMISTIC", payload: { id: tempId } });
      toast.error(result.error, { duration: 5000 });
    }
  },
  [sessionSlug, hostSecretHash, dispatch, tErrors],
);
```

### Pattern 3: React.cache() for SSR DynamoDB Deduplication

**What:** Wrap `getSession` and `getSessionData` in `lib/session.ts` with React's `cache()` function. This deduplicates calls within the same render pass. Currently both `generateMetadata()` and the page component call both functions — resulting in 4 DynamoDB operations per page load. With `cache()`, the second call per function returns the memoized result, reducing to 2 operations.

**When to use:** Any server function called multiple times during a single Next.js request. `cache()` is per-request scoped — no cross-request data contamination risk.

**Trade-offs:**

- Pro: Eliminates 2 redundant DynamoDB calls per SSR page load (one `GetItem` + one `QueryCommand`).
- Pro: Zero behaviour change — same data, same error handling, same TTL filtering.
- Con: None for this use case. `cache()` is stable in React 19 (this project uses `react: 19.2.3`).
- Do NOT use `unstable_cache` from `next/cache` here — that persists across requests. Session data is live and must not be stale.

**Integration point in `lib/session.ts`:**

```typescript
import { cache } from "react";

export const getSession = cache(async function getSession(slug: string): Promise<Session | null> {
  // ... existing implementation unchanged
});

export const getSessionData = cache(async function getSessionData(
  slug: string,
): Promise<SessionData> {
  // ... existing implementation unchanged
});
```

No changes to `page.tsx` or `host/page.tsx` call sites — deduplication is transparent.

### Pattern 4: Lambda Memory Increase via sst.config.ts

**What:** Add `memory: "512 MB"` to the `ResolverFn` definition. Current default is 128MB. Lambda CPU allocation scales linearly with memory — 512MB provides 4x the CPU of 128MB, directly reducing cold start initialization time and warm execution duration.

**When to use:** Lambda functions with observable cold start latency. The single `ResolverFn` handles all 12 mutations. Cold starts are most impactful at session start (presenter just created the session, first participant joins) — exactly the latency-sensitive moment.

**Trade-offs:**

- Pro: Cold start reduction of ~40-60% (128MB → 512MB for Node.js + DynamoDB SDK init).
- Pro: `AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1"` is already set — connection pooling benefits from additional memory headroom.
- Con: Marginal cost increase. Negligible at 50-500 concurrent users with sub-second DynamoDB operations.
- 512MB is sufficient. 1024MB provides diminishing returns for I/O-bound DynamoDB workloads.

**Integration point in `sst.config.ts`:**

```typescript
const resolverFn = new sst.aws.Function("ResolverFn", {
  handler: "packages/functions/src/resolvers/index.handler",
  memory: "512 MB", // ADD — was unset (defaults to 128MB)
  environment: {
    TABLE_NAME: table.name,
    AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
  },
  link: [table],
});
```

### Pattern 5: Lazy getTranslations in Server Action Error Paths

**What:** Move `const t = await getTranslations("actionErrors")` from the top of each Server Action function to inside the `catch` block (or error return branch). `getTranslations` reads the locale from request headers and loads the i18n JSON bundle — it incurs overhead on every call, even when the mutation succeeds.

**When to use:** Server Actions where success is the common case (>99% under normal operation). Applies to `pushSnippetAction`, `deleteSnippetAction`, `clearClipboardAction`, `upvoteQuestionAction`, `focusQuestionAction`, `banQuestionAction`, `banParticipantAction`, `restoreQuestionAction`, and their equivalents in `reactions.ts`.

**Trade-offs:**

- Pro: Saves ~2-5ms on the P50 success path for each mutation.
- Con: Slightly more verbose — `t` must be loaded inside each error branch separately, or via a lazily-called helper.
- Con: Actions with sync input validation (`addQuestionAction` checks `text.length > 500` before the try/catch) still need `t` eagerly. Apply lazy loading only to pure-pass-through actions.
- Note: If Pattern 1 (direct mutations) is implemented first, most of these Server Actions are removed. Apply lazy `getTranslations` only to actions that survive (e.g., any that remain in `session.ts` or validation-only paths).

**Integration point — example for `pushSnippetAction`:**

```typescript
export async function pushSnippetAction(formData: {...}): Promise<ActionResult> {
  try {
    await appsyncMutation(PUSH_SNIPPET, formData);
    return { success: true };
  } catch (err) {
    const t = await getTranslations("actionErrors"); // MOVED to error path only
    reportError(err instanceof Error ? err : new Error(String(err)));
    return parseRateLimitOrBan(err, t, "failedPushSnippet");
  }
}
```

### Pattern 6: QA Sort Debounce Reduction

**What:** In `qa-panel.tsx`, the `useEffect` that updates `debouncedQuestions` uses `setTimeout(() => setDebouncedQuestions(questions), 1000)`. Change from 1000ms to 300ms.

**When to use:** This change is unconditional — the debounce mechanism already exists and works correctly. The value 1000ms makes the sort order visibly stale after votes. 300ms is at the boundary of human perception for position changes, providing responsiveness without constant list thrashing.

**Trade-offs:**

- Pro: Perceived responsiveness of vote-driven reordering improves substantially.
- Con: None. Same debounce logic, different duration.

**Integration point in `components/session/qa-panel.tsx`:**

```typescript
// Line ~79 — change 1000 to 300
const timer = setTimeout(() => setDebouncedQuestions(questions), 300);
```

### Pattern 7: Client-Side Shiki via Lazy Dynamic Import (Host Preview Only)

**What:** Replace the `renderHighlight` Server Action call in `host-input.tsx` with a lazy `import('shiki/bundle/web')` inside the debounce callback. Shiki 4.x ships `./bundle/web` as a proper ESM export confirmed present in `node_modules/shiki/dist/bundle-web.mjs`. This eliminates one Server Action round-trip per 200ms debounce cycle while the host types.

**When to use:** The preview backdrop in `HostInput` only. The `ShikiBlock` server component that renders snippets for all visitors stays server-rendered — no change.

**Trade-offs:**

- Pro: Eliminates ~100-300ms Server Action RTT per highlight call during host typing.
- Pro: Removes Shiki from the Server Action hot path entirely; `renderHighlight` export can be deleted.
- Con: Shiki's `bundle/web` uses the JavaScript regex engine by default (not Oniguruma WASM). Functionally identical for the languages detected by `detect-language.ts` (TypeScript, JavaScript, Python, etc.).
- Con: Bundle size concern. However, `import('shiki/bundle/web')` inside a callback creates a webpack dynamic split point — Next.js code-splits this into a separate chunk that is only downloaded when the host actually starts typing. It is never included in participant page bundles.
- Con: The `bundle/web` export includes all bundled languages (~language grammars). For production bundle hygiene, consider `shiki/core` with explicit language imports — but this is a separate optimization.

**Integration point in `host-input.tsx` — replace `scheduleHighlight`:**

```typescript
const scheduleHighlight = useCallback((code: string, lang: string) => {
  if (debounceRef.current) clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(async () => {
    if (!code.trim() || lang === "text") {
      setHighlightHtml("");
      return;
    }
    const { codeToHtml } = await import("shiki/bundle/web"); // lazy — never in initial bundle
    try {
      const html = await codeToHtml(code, {
        lang,
        themes: { light: "github-light", dark: "github-dark" },
      });
      setHighlightHtml(html);
    } catch {
      setHighlightHtml("");
    }
  }, 200);
}, []);
```

After this change, `renderHighlight` in `actions/snippet.ts` is unused and should be deleted. The `shiki` import in `actions/snippet.ts` is removed, potentially reducing the server bundle for that action route.

---

## Data Flow

### Current Mutation Flow (Before v2.0)

```
[User action in hook]
    ↓ optimistic dispatch (existing for votes/questions/replies, NOT snippets)
[safeAction(serverActionFn(args))]
    ↓ fetch POST to Netlify (/[locale]/... Next.js Server Action RPC)
[Server Action on Netlify]
    ↓ getTranslations() — eager i18n load even on success
    ↓ appsyncMutation(query, vars) — plain fetch POST
[AWS AppSync HTTP endpoint]
    ↓ route to lambdaDS
[Lambda ResolverFn — 128MB default]
    ↓ DynamoDB operation + mutation publishes subscription event
[AppSync WebSocket → all subscribers]
    ↓ useSessionUpdates dispatch
[sessionReducer → component re-render]
```

Total hops for a snippet push (host): Client → Netlify → AppSync → Lambda → DynamoDB → subscription back to Client.
Observed latency: ~300-600ms from button click to clipboard panel visual update.

### Target Mutation Flow (After v2.0)

```
[User action in hook]
    ↓ optimistic dispatch — IMMEDIATE (0ms perceived latency)
[graphqlMutation(MUTATION_STRING, vars)] via appsyncClient directly
    ↓ HTTP POST directly to AppSync endpoint (Netlify hop eliminated)
[AWS AppSync HTTP endpoint]
    ↓ route to lambdaDS
[Lambda ResolverFn — 512MB]
    ↓ DynamoDB operation + mutation publishes subscription event
[AppSync WebSocket → all subscribers]
    ↓ useSessionUpdates dispatch (deduplicates optimistic entry for own actions)
[sessionReducer → no visual change for own action (already shown optimistically)]
```

Expected broadcast latency (other participants seeing the update): ~100-200ms.
Expected own-action perceived latency: ~0ms (optimistic).

### SSR Data Flow (After v2.0 — with React.cache())

```
[Next.js renders /[locale]/session/[slug]]
    │
    ├── generateMetadata() calls getSession(slug)     ← cache MISS, DynamoDB GetItem
    ├── generateMetadata() calls getSessionData(slug) ← cache MISS, DynamoDB QueryCommand
    ├── page() calls getSession(slug)                 ← cache HIT — returns memoized result
    └── page() calls getSessionData(slug)             ← cache HIT — returns memoized result

Result: 2 DynamoDB operations instead of 4 per SSR page load.
```

---

## Integration Points

### Integration 1: appsync-client.ts Extension

**New vs Modified:** MODIFIED.
**Consumers after change:** `use-session-mutations.ts`, `use-host-mutations.ts`.
**What:** Add `graphqlMutation<T>(query, variables)` export. The existing `appsyncClient` is already configured with the correct endpoint and API key. This is a thin typed wrapper around `appsyncClient.graphql()` that mirrors the `appsyncMutation()` interface from `appsync-server.ts`.

```
appsync-client.ts
  exports:
    appsyncClient   (existing — used by use-session-updates.ts)
    graphqlMutation (new — used by hooks for direct mutations)
```

### Integration 2: safe-action.ts Extension

**New vs Modified:** MODIFIED.
**What:** Add `safeClientMutation<R>()` alongside existing `safeAction<R>()`. Client-side `graphqlMutation` throws `Error` on GraphQL errors (Amplify behavior) — same shape as Server Action fetch failures. The new helper uses the same catch-and-return-ActionResult pattern.

**Consumers:** `use-session-mutations.ts`, `use-host-mutations.ts`.

### Integration 3: parse-appsync-error.ts (New Shared Utility)

**New vs Modified:** NEW file.
**Why:** The `parseRateLimitOrBan()` function currently lives inline in every Server Action file (`snippet.ts`, `qa.ts`, `moderation.ts`, `reactions.ts`). When mutations move to client hooks, this logic must move client-side. Rather than duplicating it in each hook, extract to a shared utility.

**Signature:**

```typescript
// lib/parse-appsync-error.ts
export function parseAppsyncError(err: unknown, fallbackMessage: string): string {
  const message = err instanceof Error ? err.message : String(err);
  const rateLimitMatch = message.match(/RATE_LIMIT_EXCEEDED:(\d+)/);
  if (rateLimitMatch) return `Rate limited. Retry in ${rateLimitMatch[1]}s.`;
  if (message.includes("PARTICIPANT_BANNED")) return "You have been banned.";
  return fallbackMessage;
}
```

The hooks already have `tErrors` from `useTranslations` for the translated strings — pass the translated fallback message as `fallbackMessage`.

**Consumers:** `use-session-mutations.ts`, `use-host-mutations.ts`.

### Integration 4: host-input.tsx + use-host-mutations.ts Coordination

**New vs Modified:** MODIFIED both.
**The problem:** `HostInput` currently owns the full push flow by calling `pushSnippetAction` directly. With optimistic dispatch, it needs `dispatch` from `useSessionState`. `HostInput` is instantiated inside `ClipboardPanel` which does not receive `dispatch`.

**Solution:** Add `handlePushSnippet(content, lang)` to `use-host-mutations.ts`. The hook already has `dispatch`, `sessionSlug`, and `hostSecretHash`. Expose it from the hook return object. Thread it through the render tree:

```
session-live-host-page.tsx
  └── useHostMutations → { handlePushSnippet, ... }
       └── ClipboardPanel receives: onPush={handlePushSnippet}  (NEW PROP)
            └── HostInput receives: onPush={onPush}            (REPLACES sessionSlug/hostSecretHash props)
                 └── calls onPush(content, lang) on button click
```

**Props change to `ClipboardPanel`:** Add optional `onPush?: (content: string, lang: string) => Promise<void>`. Only rendered when `isHost` is true.
**Props change to `HostInput`:** Remove `sessionSlug` and `hostSecretHash`. Replace with `onPush: (content: string, lang: string) => Promise<void>`.

`HostInput` becomes fully presentational — no imports from `actions/snippet`, no `safeAction` calls.

### Integration 5: lib/session.ts — React.cache() Wrapping

**New vs Modified:** MODIFIED.
**Consumers:** Two page routes (`page.tsx`, `host/page.tsx`) — no changes to those files.
**Change:** Add `import { cache } from "react"` and wrap both exported functions. The implementation bodies are unchanged.

### Integration 6: sst.config.ts Lambda Memory

**New vs Modified:** MODIFIED.
**Change:** One line — `memory: "512 MB"` on `ResolverFn`.
**Requires:** `sst deploy` to production. No changes to Lambda handler code or resolver logic.

### Integration 7: qa-panel.tsx Debounce Value

**New vs Modified:** MODIFIED.
**Change:** One number — `1000` to `300` in the `setTimeout` inside the sort-debounce `useEffect`.
**No other dependencies.**

---

## Build Order (Dependency-Aware)

```
Dependencies:
  [7] client Shiki AND [2] optimistic snippet both touch host-input.tsx
      → must be done in the same PR or sequentially

  [1] direct mutations removes Server Actions
      → [5] lazy getTranslations is partially moot after [1]; apply only before or skip
      → [2] optimistic snippet needs the direct mutation pattern from [1]

  [3], [4], [6] are fully independent of each other and of [1]/[2]/[7]
```

**Recommended sequence:**

| Step | Change                            | Files                                                                                                                                                                | Rationale                                                                   |
| ---- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1    | Lambda memory                     | `sst.config.ts`                                                                                                                                                      | Infrastructure, deploy independently, zero code review friction             |
| 2    | QA debounce                       | `qa-panel.tsx`                                                                                                                                                       | One-character change, trivial                                               |
| 3    | React.cache()                     | `lib/session.ts`                                                                                                                                                     | Isolated, no mutation path involvement                                      |
| 4    | Lazy getTranslations              | `actions/snippet.ts`, `actions/qa.ts`, etc.                                                                                                                          | Apply before step 5 removes these files; or skip if removing in step 5      |
| 5    | Direct mutations                  | `lib/appsync-client.ts`, `lib/safe-action.ts`, `lib/parse-appsync-error.ts` (new), `hooks/use-session-mutations.ts`, `hooks/use-host-mutations.ts`, all action files | Largest change; adds new files, refactors hooks, removes most action bodies |
| 6    | Optimistic snippet + client Shiki | `hooks/use-host-mutations.ts`, `components/session/host-input.tsx`, `components/session/clipboard-panel.tsx`, `actions/snippet.ts` (delete renderHighlight)          | Combine into one PR since both modify `host-input.tsx`                      |

---

## Anti-Patterns

### Anti-Pattern 1: Using unstable_cache for getSessionData

**What people do:** Wrap `getSessionData` with `unstable_cache` from `next/cache` to persist results across requests (CDN-level caching).
**Why it's wrong:** `getSessionData` returns live session state that changes every few seconds during an active presentation. Cross-request caching would serve stale snippets and questions to new visitors. A 1s TTL provides negligible benefit while introducing staleness risk.
**Do this instead:** Use `React.cache()` — it deduplicates within a single request only (the `generateMetadata` + `page()` same-render-pass case), with zero cross-request staleness risk.

### Anti-Pattern 2: Moving createSession to Direct Client Mutation

**What people do:** Remove all Server Actions including `createSession` for architectural consistency.
**Why it's wrong:** `createSession` uses `node:crypto` (`randomUUID`, `createHash`) for generating and hashing the host secret. These Node.js APIs are not available in browser context. Additionally, the raw secret must never be transmitted to the client before hashing — the Server Action is a security boundary, not merely a network hop optimization.
**Do this instead:** Keep `createSession` as the single remaining Server Action. All other mutations move to direct client calls.

### Anti-Pattern 3: Static Shiki Import in Host Page

**What people do:** Import Shiki at the top of `host-input.tsx` statically:

```typescript
import { codeToHtml } from "shiki/bundle/web"; // WRONG
```

**Why it's wrong:** This adds the Shiki chunk to the initial JS bundle for every page visitor, including participants who never see the host editor. The existing bundle at 156kB already exceeds the 80kB target.
**Do this instead:** Use a dynamic `import('shiki/bundle/web')` inside the debounce callback. Next.js/webpack creates a separate code-split chunk that is downloaded only when the host begins typing.

### Anti-Pattern 4: Optimistic Snippet Without Content-Fingerprint Dedup

**What people do:** Dispatch `ADD_SNIPPET_OPTIMISTIC` with a temp `_opt_...` ID, then rely on ID-based deduplication in the `SNIPPET_ADDED` reducer path.
**Why it's wrong:** The `SNIPPET_ADDED` fallback dedup checks `state.snippets.some((s) => s.id === action.payload.id)`. The optimistic snippet has `id: "_opt_..."` and the real server payload has a UUID — they will never match. Result: both the optimistic and real snippet appear in the list.
**Do this instead:** Add content-fingerprint dedup to `SNIPPET_ADDED` — check for an existing optimistic snippet with matching `sessionSlug + content + type` (same approach used in `QUESTION_ADDED` which matches by `sessionSlug + fingerprint + text`). Replace the optimistic entry with the server-confirmed one when found.

### Anti-Pattern 5: Removing safeAction Without Equivalent Error Boundary

**What people do:** Call `appsyncClient.graphql()` directly in hooks without error handling, assuming Amplify returns a structured response.
**Why it's wrong:** Amplify throws `Error` on GraphQL errors (auth failures, rate limits) and network failures. Without a catch, unhandled rejections bubble to React's error boundary, showing a full-page error UI instead of a toast.
**Do this instead:** Always wrap direct client mutations in `safeClientMutation()` which catches thrown errors and returns `{ success: false, error: string }` — preserving the `ActionResult` contract all hooks already handle.

---

## Scaling Considerations

| Scale                              | Architecture Adjustments                                                                                                                                                                                                    |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 50-500 concurrent (current target) | Direct mutations + 512MB Lambda — fully sufficient                                                                                                                                                                          |
| 500-5k concurrent                  | Lambda provisioned concurrency eliminates cold starts entirely; DynamoDB on-demand scales automatically                                                                                                                     |
| 5k+ concurrent                     | AppSync WebSocket connection limits per account become relevant; consider connection multiplexing; DynamoDB hot partitions are not a concern (single-table PK is `SESSION#slug` — each session is an independent partition) |

### Scaling Priorities for v2.0 Target

1. **First bottleneck:** Lambda cold starts on session open (128MB default) — addressed by memory increase.
2. **Second bottleneck:** Netlify round-trip on every mutation — addressed by direct client mutations.
3. **Third bottleneck:** Redundant DynamoDB reads on SSR page load — addressed by `React.cache()`.

---

## Sources

- Direct codebase inspection at commit `7c4e8fa` (2026-03-17)
- `packages/frontend/package.json`: Next.js 16.1.6, React 19.2.3, Shiki 4.0.2, aws-amplify 6.16.3
- `node_modules/shiki/package.json`: confirmed `./bundle/web` export pointing to `dist/bundle-web.mjs`
- `node_modules/shiki/dist/`: confirmed `bundle-web.mjs` present
- React 19 `cache()` API: per-request memoization for server components, stable in React 19
- SST Ion `sst.aws.Function`: `memory` property accepts `"512 MB"` string format (SST Ion IaC)
- Amplify `generateClient()` behavior: `.graphql()` throws on GraphQL errors; used in `use-session-updates.ts` as evidence of browser compatibility

---

_Architecture research for: nasqa-live v2.0 Performance & Instant Operations_
_Researched: 2026-03-17_
