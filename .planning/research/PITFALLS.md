# Pitfalls Research

**Domain:** Performance optimization for real-time Next.js + AppSync session app (v2.0)
**Researched:** 2026-03-17
**Confidence:** HIGH — findings grounded in direct codebase inspection (all mutation hooks, server actions, subscription handler, SST config, and DynamoDB resolvers read) plus verification against official Next.js, AppSync, Shiki, and AWS Lambda documentation.

---

## Critical Pitfalls

### Pitfall 1: Client-Side Mutations Bypass Server-Side Validation — Rate Limiting and Auth Enforcement Disappear

**What goes wrong:**
The v2.0 plan eliminates the Server Action network hop by having the browser call AppSync mutations directly. The Server Actions in `packages/frontend/src/actions/qa.ts` and `snippet.ts` do more than forward GraphQL calls — they enforce three security layers that the browser cannot replicate:

1. **Input validation** — text length checks (`text.length > 500`), empty text rejection, and `parseRateLimitOrBan` error translation all live in the server action, not the Lambda resolver.
2. **Rate limiting** — `checkRateLimit` in `packages/functions/src/resolvers/rate-limit.ts` runs inside the Lambda resolver, so it is still enforced even on direct client calls. But the _user-facing error message_ translation (`t("rateLimited", { seconds })`) is done in the server action using `getTranslations`. Moving to direct client mutations means `RATE_LIMIT_EXCEEDED:42` is surfaced raw to the browser instead of a localized message.
3. **Host secret exposure** — The `hostSecretHash` is currently never sent to the browser at all for host mutations; it is kept server-side. If host mutations (`pushSnippet`, `deleteSnippet`, `clearClipboard`, `focusQuestion`, `banParticipant`) are moved client-side, the `hostSecretHash` must travel to the browser. It is already present in the URL fragment but not currently in JS memory — moving it into client mutation calls makes it visible in DevTools Network tab and bundle state.

The AppSync API key (`NEXT_PUBLIC_APPSYNC_API_KEY`) is already public by design — AppSync API key mode is explicitly documented for unauthenticated public access scenarios. The risk model is: the API key grants write access to any mutation, and the Lambda resolver enforces authorization. Bypassing the server action does not inherently break this model **for participant mutations**. The problem is specifically host mutations, where `verifyHostSecret` in the Lambda resolver DynamoDB check is the sole auth gate.

**Why it happens:**
The "eliminate Server Action hop" optimization is framed as a performance win without separating which actions are safe to move client-side (participant mutations with device fingerprint) from which are security-critical (host mutations with `hostSecretHash` verification). Developers apply the optimization uniformly.

**How to avoid:**
Bifurcate mutation strategy:

- **Participant mutations** (`addQuestion`, `addReply`, `upvoteQuestion`, `downvoteQuestion`, `react`): Safe to move client-side because the Lambda resolver enforces fingerprint-based rate limiting and ban checks. Move these to direct `appsyncClient.graphql()` calls.
- **Host mutations** (`pushSnippet`, `deleteSnippet`, `clearClipboard`, `focusQuestion`, `banQuestion`, `banParticipant`, `restoreQuestion`): Keep as Server Actions. The `hostSecretHash` must not travel over direct client mutation calls where it would be visible in the browser's Network tab, even though it is already in the URL fragment.

For participant mutations moving client-side, replicate the validation in the client hook (`text.length > 500` check before dispatch) so optimistic updates are never created for invalid input. Handle raw `RATE_LIMIT_EXCEEDED:N` errors in the client by parsing the seconds value directly — a small client-side parser replaces `getTranslations`.

**Warning signs:**

- `hostSecretHash` appears in browser DevTools Network tab under any GraphQL mutation request.
- Host can be impersonated by a participant who extracts the API key and guesses or brute-forces session slugs.
- `RATE_LIMIT_EXCEEDED:42` is displayed raw in toast error messages after the migration.
- Input longer than 500 characters creates an optimistic item that is immediately rejected by the Lambda resolver, causing a flicker.

**Phase to address:** Direct client-to-AppSync mutations phase — must document the participant/host split in phase requirements before implementation begins.

---

### Pitfall 2: Optimistic Snippet Dispatch Races with Subscription Broadcast — Double Item Appears

**What goes wrong:**
The existing question/reply optimistic flow works because `QUESTION_ADDED` and `REPLY_ADDED` reducer cases deduplicate using `_opt_` prefix matching by `(fingerprint, sessionSlug, text)`. The snippet flow is different:

1. Host dispatches `ADD_SNIPPET_OPTIMISTIC` — an optimistic item with `_opt_${Date.now()}` ID appears instantly.
2. The `pushSnippet` mutation succeeds and the Lambda resolver triggers `SNIPPET_ADDED` broadcast.
3. `use-session-updates.ts` receives the broadcast and dispatches `SNIPPET_ADDED` with the real item.
4. The `SNIPPET_ADDED` reducer case has dedup logic: `const exists = state.snippets.some((s) => s.id === action.payload.id)` — but the optimistic item has `_opt_*` as its ID, not the real ULID. The `optimisticId` branch requires the caller to pass `optimisticId` in the action payload: `{ type: "SNIPPET_ADDED", payload: realSnippet, optimisticId: tempId }`.

The subscription handler in `use-session-updates.ts` line 124 dispatches `SNIPPET_ADDED` **without** `optimisticId`:

```typescript
stableDispatch({ type: "SNIPPET_ADDED", payload: parsed as Snippet });
```

When the optimistic update is added for snippet push, if the code dispatches `ADD_SNIPPET_OPTIMISTIC` client-side, then the subscription arrives and dispatches `SNIPPET_ADDED` without `optimisticId`, the reducer's `exists` check fails (IDs are different), and the real snippet is prepended alongside the still-present optimistic ghost. Two items show until the optimistic ghost is removed — but there is no `REMOVE_OPTIMISTIC` call after a successful `pushSnippet`, only after a failed one.

**Why it happens:**
The `SessionAction` type on `SNIPPET_ADDED` already has `optimisticId?: string` as an optional field (line 10 in `use-session-state.ts`), but the subscription dispatch path does not populate it. The optimistic update requires cooperation between the mutation hook (which knows the `tempId`) and the subscription handler (which needs to pass that same `tempId` back). There is no mechanism to connect them — the subscription fires asynchronously and independently.

**How to avoid:**
Use one of two approaches:

**Option A (preferred) — Replace, not add:** When `ADD_SNIPPET_OPTIMISTIC` is dispatched, store the `tempId` in a `pendingSnippets` ref alongside a `content + language` fingerprint. When `SNIPPET_ADDED` arrives on the subscription, check if a pending entry matches by content and language (not by ID). If matched, replace — emit `{ type: "SNIPPET_ADDED", payload: realSnippet, optimisticId: tempId }`. This mirrors exactly how `QUESTION_ADDED` works for questions in the reducer (lines 94–114 in `use-session-state.ts`).

**Option B — Skip optimistic for snippets and use mutation response directly:** After `appsyncClient.graphql()` returns, the mutation response contains the full `SessionUpdate` payload. Dispatch the real snippet directly from the mutation response _before_ the subscription broadcast arrives. Cancel the optimistic ghost immediately. The subscription duplicate is then blocked by the `exists` check because the real ID is already in state.

**Warning signs:**

- Two identical snippets visible in the clipboard panel after the host pushes one snippet.
- The duplicate disappears after ~500ms (the subscription dedup delay), causing a visible flash.
- Only reproducible by the host — participants never see a duplicate because they have no optimistic dispatch.
- No duplicate in the `REMOVE_OPTIMISTIC` path (only called on failure) so it only manifests on success.

**Phase to address:** Optimistic snippet push phase — must implement the `pendingSnippets` ref approach or mutation-response approach before exposing `ADD_SNIPPET_OPTIMISTIC` dispatch.

---

### Pitfall 3: Lambda Memory Increase Triples Billing on Cold Starts After AWS August 2025 Pricing Change

**What goes wrong:**
AWS changed Lambda billing in August 2025: the INIT phase (cold start initialization) is now billed at the same rate as invocation duration. Previously cold start time was free. The current `sst.config.ts` does not specify a `memory` value for `ResolverFn`, which defaults to 128MB in SST. The v2.0 optimization plan targets increasing memory to reduce cold start latency.

For a Node.js Lambda with no heavy initialization (the current resolver is lightweight: `@aws-sdk/lib-dynamodb`, `ulid`, `pino`), the cold start at 128MB is typically 200–400ms. At 512MB it is ~120–250ms. The latency improvement is real and consistent.

The billing math for cold starts under the new model:

- 128MB × 300ms INIT = 0.128 GB × 0.3s = 0.0384 GB-seconds per cold start
- 512MB × 150ms INIT = 0.512 GB × 0.15s = 0.0768 GB-seconds per cold start

The cold start _duration cost doubles_ when moving to 512MB even though the latency improves. For a low-traffic conference tool with bursty patterns (many cold starts at session start), this increases per-session cold start cost by 2×. At the target scale of 50–500 participants, where many may join simultaneously, this affects real spend.

Beyond a certain threshold, more memory yields diminishing latency returns. 256MB is the inflection point for lightweight Node.js resolvers — the improvement from 256MB to 1024MB is marginal (<30ms) while the billing cost quadruples.

**Why it happens:**
Developers apply the "more memory = faster Lambda" heuristic uniformly without accounting for the 2025 billing change that makes the INIT duration a cost variable, not a fixed overhead.

**How to avoid:**
Target 256MB for `ResolverFn`, not 512MB or 1024MB. The cost-performance curve for lightweight Node.js:

| Memory | Typical Cold Start | INIT Cost (GB-s) | Relative Cost vs 128MB |
| ------ | ------------------ | ---------------- | ---------------------- |
| 128MB  | 300ms              | 0.038            | 1×                     |
| 256MB  | 180ms              | 0.046            | 1.2×                   |
| 512MB  | 150ms              | 0.077            | 2×                     |
| 1024MB | 130ms              | 0.133            | 3.5×                   |

256MB cuts cold start latency by ~40% at only 1.2× the billing cost. Add in SST config:

```typescript
const resolverFn = new sst.aws.Function("ResolverFn", {
  memory: "256 MB",
  // ...
});
```

Do not use provisioned concurrency for this use case — at 5 provisioned instances it costs ~$220/month regardless of traffic, which far exceeds the economics of a conference tool.

**Warning signs:**

- Lambda cost line item increases disproportionately after memory change in a low-traffic week.
- CloudWatch metrics show cold starts decreasing in duration but monthly bill rising.
- Memory set above 512MB without benchmark data showing sub-30ms improvement per 256MB step.

**Phase to address:** Lambda memory optimization phase — run a cost model before committing to a memory value, not after.

---

### Pitfall 4: Next.js Data Cache Serves Stale SSR Hydration to Late-Joining Participants

**What goes wrong:**
`packages/frontend/src/lib/session.ts` fetches session data via `@aws-sdk/lib-dynamodb` (DynamoDB SDK directly, not through `fetch()`). Next.js's Data Cache only intercepts `fetch()` calls with a cache control header. DynamoDB SDK calls bypass the Data Cache entirely — they are always live reads.

However, `generateMetadata` in the session page calls both `getSession(slug)` and `getSessionData(slug)`. `getSessionData` executes a full DynamoDB `QueryCommand` — the same query the page component also calls. This is **two identical DynamoDB scans per page load** (one for metadata, one for the page component), with no deduplication.

The v2.0 plan includes "SSR data fetch deduplication." The standard fix is React's `cache()` function to memoize within a single render pass. The pitfall: if `cache()` is applied naively to `getSessionData`, it caches the result for the _entire Next.js server process lifetime_ if used outside a request context, rather than just for a single request.

In a real-time session app, a participant joining 5 minutes after session start must get the current 50 questions, not the 0 questions from the first cached load. `cache()` with no revalidation strategy would serve the initial empty state to all participants who join after the cache is warmed.

**Why it happens:**
Developers read the React docs on `cache()` and apply it to eliminate duplicate fetches, without distinguishing between "deduplicate within a request" (correct) and "cache across requests" (catastrophic for real-time data). The React `cache()` function deduplicates within a single render pass by default, which is correct — but only when called without any additional caching layer. If the result is also stored in a module-level variable or passed through Next.js ISR, it becomes cross-request.

**How to avoid:**
Use React `cache()` **only** to deduplicate within a single page render (between `generateMetadata` and the page component on the same request). Do not add `{ next: { revalidate: N } }` to any DynamoDB calls on the session page.

```typescript
// lib/session.ts — wrap with React cache() for single-request deduplication only
import { cache } from "react";

export const getSessionData = cache(async (slug: string): Promise<SessionData> => {
  // existing DynamoDB QueryCommand — always a live read
});
```

This eliminates the duplicate DynamoDB scan within one request. The next request gets a fresh read. No ISR, no revalidate tags on session data.

Separately verify that Next.js is not applying any automatic caching to dynamic routes. The session page uses `params` which makes it a dynamic route — Next.js 15 does not cache dynamic routes by default. Add `export const dynamic = "force-dynamic"` to the session page as an explicit guard against future framework changes accidentally enabling caching.

**Warning signs:**

- `generateMetadata` and the page component each appear as separate DynamoDB read units in CloudWatch metrics.
- Participants joining at different times see different initial question counts when they first load the page.
- A CloudFront or Netlify CDN cache serves the same HTML to multiple users (check response headers for `Cache-Control: public`).

**Phase to address:** SSR data fetch deduplication phase — apply `cache()` for dedup, not for persistence.

---

### Pitfall 5: Debounce Reduction Causes Visible Card Reordering Jank Under Active Voting

**What goes wrong:**
`qa-panel.tsx` uses a debounced snapshot of questions to prevent cards from jumping position on every vote. Reducing the debounce timeout to improve perceived speed trades visual stability for layout thrashing.

The current sort order is: `isFocused` first, then `upvoteCount` desc, then `createdAt` desc. In an active session with 50 participants, questions receive votes at 2–5 per second. At the current debounce value, the list reorders at most once per interval. Reducing it to 100ms or less causes the list to resort multiple times per second, which triggers:

1. **React layout recalculation** — the list re-renders on each sort change. Without `layout` prop from Framer Motion (which is not currently applied to the QA list in v1.3), cards teleport to new positions instead of animating, which appears as flicker.
2. **Scroll anchor drift** — if the user has scrolled mid-list and a card above their viewport jumps to a new position, the browser recalculates scroll anchor unless `overflow-anchor: none` is set or the container has stable dimensions. This shifts the viewport unpredictably.
3. **Animation frame competition** — Framer Motion `AnimatePresence` exit animations and new-position layout animations compete when multiple items are simultaneously entering, exiting, and reordering, causing dropped frames on low-end devices.

**Why it happens:**
The debounce is perceived as a latency problem ("the list is slow to update") rather than a stability mechanism. Reducing it seems like a pure win. The tradeoff between perceived latency and visual stability is non-obvious until load testing with concurrent votes.

**How to avoid:**
Do not reduce the debounce timeout without first adding `layout` animation to question cards. The correct sequencing:

1. Add Framer Motion `layout` prop to the `motion.div` wrapping each `QuestionCard` in `QAPanel`.
2. Wrap the entire question list in a `<LayoutGroup>` so sibling cards animate their position change.
3. Only then reduce the debounce timeout, because animated repositioning is now smooth rather than jarring.

If Framer Motion layout animations are not added, keep the debounce at its current value. The debounce is a compensation mechanism for missing layout animation, not pure latency overhead.

Additionally, apply `overflow-anchor: none` to the scroll container to prevent browser scroll anchor from jumping when the list reorders above the viewport.

**Warning signs:**

- After debounce reduction, cards visually teleport to new positions during active voting.
- Scroll position jumps by the height of repositioned cards.
- React DevTools Performance tab shows layout recalculations at 30+ fps during voting bursts.
- Users report the Q&A list as "broken" or "jumpy" — a perception problem invisible in testing with a single user.

**Phase to address:** QA sort debounce reduction phase — this phase requires Framer Motion `layout` animation as a prerequisite, not an optional enhancement.

---

### Pitfall 6: Client-Side Shiki Adds Synchronous Wasm Initialization to Every Host Page Load

**What goes wrong:**
The current architecture keeps Shiki entirely server-side: `renderHighlight` is a `"use server"` function in `snippet.ts`, and the host types code into `HostInput` which calls this Server Action for preview. Shiki is not in the client bundle at all.

Moving Shiki client-side for "instant syntax preview" introduces a critical initialization cost. Shiki uses TextMate grammars compiled to Wasm for tokenization. The full Shiki bundle is 6.4MB minified (1.2MB gzip). Even with fine-grained imports (only the specific languages used), each language grammar is 50–200KB. The web bundle is 3.8MB minified (695KB gzip).

The specific problems:

1. **Bundle budget violation** — the current budget is 80kB gzipped initial JS payload, already exceeded by `aws-amplify` at ~68kB. Adding even the fine-grained Shiki web bundle for JavaScript and TypeScript alone adds ~180KB gzip, pushing total initial bundle to ~250KB — 3× the budget.
2. **Wasm download race** — on first use, the Shiki engine downloads the Wasm binary. If this happens synchronously on `HostInput` mount, it blocks the first render of the host page. If lazy-loaded, the first keystroke after the page loads has a visible delay while Wasm initializes.
3. **Memory overhead** — Shiki loads grammar files into memory on the web worker. For a session tool running on the host's conference laptop (typically underpowered), this competes with the AppSync WebSocket connection and real-time state updates.

**Why it happens:**
"Client-side for instant preview" is a natural framing that ignores the cost differential between a Server Action round-trip (50–100ms network latency) versus Wasm initialization (200–500ms on first use). The Server Action round-trip is actually faster for first-use because the server is always warm.

**How to avoid:**
Use `next/dynamic` with `ssr: false` to lazy-load Shiki only on explicit user action, not on host page load:

```typescript
// Only load Shiki after the first time the user types a code snippet
const highlighter = useRef<ReturnType<typeof createHighlighter> | null>(null);

async function getHighlighter() {
  if (highlighter.current) return highlighter.current;
  const { createHighlighter } = await import("shiki/core");
  const { createJavaScriptRegexEngine } = await import("shiki/engine/javascript");
  highlighter.current = await createHighlighter({
    themes: [import("@shikijs/themes/github-light"), import("@shikijs/themes/github-dark")],
    langs: [import("@shikijs/langs/javascript"), import("@shikijs/langs/typescript")],
    engine: createJavaScriptRegexEngine(),
  });
  return highlighter.current;
}
```

Use the JavaScript regex engine (`shiki/engine/javascript`) instead of the Wasm engine (`shiki/engine/oniguruma`) to avoid the Wasm download. The JS engine is slower but 200KB lighter and has no Wasm initialization cost.

Additionally, keep the Server Action `renderHighlight` as a fallback for the initial load. Client-side Shiki activates only after the user has loaded the page and triggered lazy initialization. This hybrid approach eliminates the initial load penalty while still providing instant feedback after Shiki warms up.

Do not import `shiki` directly in any component file — use dynamic imports only, so the highlighter is excluded from the initial bundle.

**Warning signs:**

- `next build` bundle analysis shows `shiki` in the initial JS chunk (not a lazy chunk).
- First keystroke in the code editor has a 200–500ms delay before highlighting appears.
- Bundle analyzer shows total initial JS exceeding 150KB gzip after adding Shiki.
- The `shiki/engine/oniguruma` Wasm file appears as a separate network request in DevTools on host page load.

**Phase to address:** Client-side Shiki phase — must define the fine-grained import strategy and JavaScript engine preference before implementation, not after bundle analysis reveals the overrun.

---

## Technical Debt Patterns

| Shortcut                                                                  | Immediate Benefit                           | Long-term Cost                                                                    | When Acceptable                                                         |
| ------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Moving all mutations (host + participant) client-side uniformly           | Single code path, no Server Action overhead | Host `hostSecretHash` visible in Network tab; rate limit error messages lose i18n | Never — participant and host mutations have different security profiles |
| Full Shiki bundle import (`import "shiki"`) for client-side highlighting  | Simple one-liner                            | 695KB gzip added to bundle, Wasm initialization blocks first keystroke            | Never — always use fine-grained imports + JS engine for client-side use |
| `cache()` on `getSessionData` without `force-dynamic` on the session page | One line eliminates duplicate DynamoDB call | Risk of future Next.js version caching dynamic routes differently                 | Acceptable only with explicit `force-dynamic` guard                     |
| Lambda memory at 512MB or 1024MB                                          | Marginally faster cold starts               | 2–3.5× cold start billing cost under 2025 pricing model                           | Never for lightweight Node.js resolvers — 256MB is the correct target   |
| Reducing debounce without adding layout animation                         | Feels more responsive                       | Cards teleport on vote bursts; scroll anchor drifts; users perceive as broken     | Never without Framer Motion `layout` as a prerequisite                  |
| Raw `RATE_LIMIT_EXCEEDED:N` surfaces to client                            | No translation layer needed                 | Non-localized error message breaks i18n contract; `N` exposed to users            | Never — parse the seconds client-side and use local i18n string         |

---

## Integration Gotchas

| Integration                               | Common Mistake                                                                                    | Correct Approach                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| AppSync direct client + host mutations    | Passing `hostSecretHash` as a GraphQL variable from the browser                                   | Keep host mutations in Server Actions; only participant mutations go client-side               |
| AppSync direct client + rate limit errors | Displaying `RATE_LIMIT_EXCEEDED:42` raw from GraphQL error                                        | Add a client-side `parseRateLimitError(err)` that extracts seconds and uses `useTranslations`  |
| React `cache()` + DynamoDB                | Wrapping DynamoDB functions with Next.js `unstable_cache` or `revalidateTag`                      | Use React `cache()` only (request-scoped dedup), never `unstable_cache` for session data       |
| Shiki client-side + Next.js bundle        | `import { codeToHtml } from "shiki"` in a `"use client"` component                                | Always use dynamic `import("shiki/core")` inside an async function — never a static import     |
| Shiki + Wasm engine                       | Default `createHighlighter` uses oniguruma Wasm                                                   | Explicitly pass `engine: createJavaScriptRegexEngine()` for client-side use to avoid Wasm      |
| Optimistic snippet + subscription         | `ADD_SNIPPET_OPTIMISTIC` dispatch followed by subscription `SNIPPET_ADDED` without `optimisticId` | Store `tempId → content+language` in a pending ref; match by content when subscription arrives |
| Lambda memory + SST Ion                   | SST `sst.aws.Function` defaults to 128MB if `memory` is unspecified                               | Always set `memory: "256 MB"` explicitly; do not rely on the SST default                       |

---

## Performance Traps

| Trap                                                                 | Symptoms                                                                      | Prevention                                                                    | When It Breaks                            |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------- |
| Two DynamoDB scans per page load (generateMetadata + page component) | CloudWatch shows 2× expected read units per session page load                 | `cache()` wrap on `getSessionData` for within-request dedup                   | Every page load — always active           |
| Debounce reduced without layout animation                            | Cards teleport on vote bursts; scroll anchor jumps                            | Add `layout` prop + `LayoutGroup` before reducing debounce                    | Noticeable at 5+ concurrent votes/second  |
| Shiki full bundle in initial JS                                      | Host page TTI increases by 1–3s on slow connections                           | Dynamic import only; use JS regex engine                                      | First host page load on any connection    |
| Lambda memory > 256MB without benchmark                              | Bills 2–3× more per cold start vs. 128MB with marginal latency gain           | Benchmark at 128, 256, 512MB; choose 256                                      | Low-traffic bursty sessions (conferences) |
| Direct client mutations without input validation                     | Invalid input creates optimistic items that immediately fail; visible flicker | Replicate server action validations in client hook before optimistic dispatch | Every request with invalid input          |
| Subscription double-add after optimistic snippet                     | Two identical snippets flash briefly in clipboard panel                       | Pending-snippets ref pattern or dispatch from mutation response               | Every host `pushSnippet` in v2.0          |

---

## Security Mistakes

| Mistake                                                           | Risk                                                                                                                               | Prevention                                                                                                            |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `hostSecretHash` in browser mutation call                         | Any observer with browser devtools can replay host mutations with the hash                                                         | Host mutations stay as Server Actions; never pass `hostSecretHash` as a client-side GraphQL variable                  |
| Direct AppSync API key use without WAF                            | API key exposed in `NEXT_PUBLIC_*` env is by design, but without WAF, a bad actor can spam mutations to exhaust Lambda concurrency | Lambda rate limiter (DynamoDB bucket) is the primary protection; confirm it covers all direct-client mutation paths   |
| Removing server action validation without replicating client-side | Malformed input bypasses the 500-char limit, creating oversized DynamoDB items                                                     | Replicate all `text.length > N` and `text.trim().length === 0` checks in the mutation hook before optimistic dispatch |
| Rate limit error message leaking seconds                          | `RATE_LIMIT_EXCEEDED:42` exposes the rate limit window duration to clients                                                         | Parse in a helper function; surface only the localized message to the user, not the raw error string                  |

---

## UX Pitfalls

| Pitfall                                             | User Impact                                                            | Better Approach                                                                                  |
| --------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Client-side Shiki warms up on first keystroke       | Host sees no highlighting for 200–500ms after typing starts            | Pre-initialize Shiki asynchronously on host page mount (after a 2s idle), not on first keystroke |
| Optimistic snippet flashes duplicate then collapses | Visible flicker distracts host during live presentation                | Implement pending-snippets dedup before exposing optimistic dispatch                             |
| Debounce reduction causes card jump                 | Audience watching participant view sees question list shuffle mid-read | Always prerequisite layout animation before debounce change                                      |
| Lambda cold start under concurrent join             | First 3–5 participants in a session experience >500ms mutation latency | 256MB memory reduces cold start; `AWS_NODEJS_CONNECTION_REUSE_ENABLED=1` is already set (good)   |

---

## "Looks Done But Isn't" Checklist

- [ ] **Direct client mutations:** Verify that NO host mutation (`pushSnippet`, `deleteSnippet`, `clearClipboard`, `focusQuestion`, `banQuestion`, `banParticipant`, `restoreQuestion`) calls `appsyncClient.graphql()` directly from the browser. Network tab audit: filter by `x-api-key` — only participant mutations should appear.
- [ ] **Optimistic snippet dedup:** Push a snippet from the host while connected. Verify exactly one item appears in the clipboard panel, not two. Reproduce with a 250ms artificial network delay to maximize the race window.
- [ ] **Rate limit error i18n:** Trigger rate limiting (11 questions in 60 seconds). Verify the toast message shows a localized string with the retry countdown, not the raw `RATE_LIMIT_EXCEEDED:N` string.
- [ ] **SSR dedup:** Add CloudWatch metrics on `getSessionData`. Confirm each page load generates exactly one DynamoDB `Query` call, not two.
- [ ] **Shiki bundle:** Run `next build` and inspect bundle analyzer output. Confirm `shiki` does not appear in any initial JS chunk — only in a lazy chunk. Confirm `oniguruma` Wasm does not appear in network waterfall on host page load.
- [ ] **Lambda memory cost:** After deploying 256MB memory setting, verify CloudWatch Lambda duration metrics show cold start duration decrease. Check the billing estimate in Cost Explorer for the first week — confirm it has not increased disproportionately.
- [ ] **Debounce + layout animation prerequisite:** If debounce is reduced, confirm Framer Motion `layout` prop is active on question cards. Open browser Performance tab, trigger 5 rapid votes, verify no layout thrashing (no multiple simultaneous layout recalculation events).

---

## Recovery Strategies

| Pitfall                                                                  | Recovery Cost | Recovery Steps                                                                                                                                                                                      |
| ------------------------------------------------------------------------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Host secret exposed in direct client mutation                            | HIGH          | Immediately rotate `hostSecretHash` for affected sessions (sessions auto-expire in 24h, so scope is limited); add a server action guard that rejects any host mutation from a direct client request |
| Optimistic double-add in production                                      | LOW           | Add the pending-snippets ref check; deploy; the optimistic duplicate ghost disappears on the next page load — no data corruption                                                                    |
| Shiki bundle overrun detected after deploy                               | MEDIUM        | Add `/* webpackChunkName: "shiki" */` magic comment and `next/dynamic` wrapper; one deploy fixes the chunk split                                                                                    |
| Lambda cost spike from high memory setting                               | LOW           | Revert `memory` in SST config and redeploy; cost normalizes in the next billing cycle                                                                                                               |
| Stale SSR data from accidental cache                                     | MEDIUM        | Add `export const dynamic = "force-dynamic"` to session page; redeploy; stale cache evicts on next CDN invalidation                                                                                 |
| Debounce reduced without layout animation — users complain about jumping | LOW           | Revert debounce value to prior setting; add Framer Motion layout animation in a follow-up phase before re-reducing                                                                                  |

---

## Pitfall-to-Phase Mapping

| Pitfall                                    | Prevention Phase                         | Verification                                                                                        |
| ------------------------------------------ | ---------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Host secret in client mutations            | Direct client-to-AppSync mutations phase | Network tab audit: zero host mutations from browser; all host mutations go through Server Actions   |
| Optimistic snippet double-add              | Optimistic snippet push phase            | Manual test: push snippet with 250ms artificial latency; exactly one item in clipboard              |
| Lambda memory billing spike                | Lambda memory optimization phase         | Cost Explorer comparison: week before vs. week after; cold start duration in CloudWatch             |
| Stale SSR data after cache() addition      | SSR deduplication phase                  | `force-dynamic` verified in build output; CloudWatch shows single DynamoDB call per page load       |
| Card jump from debounce reduction          | QA sort debounce phase                   | Prerequisite: Framer Motion layout on cards; load test: 5 concurrent votes, no teleporting observed |
| Shiki bundle overrun                       | Client-side Shiki phase                  | Bundle analyzer: shiki in lazy chunk only; total initial bundle < 100kB gzip                        |
| Rate limit i18n broken by client migration | Direct client mutations phase            | Trigger rate limit; verify localized toast with countdown, not raw error string                     |

---

## Sources

- [AppSync authorization — AWS official docs](https://docs.aws.amazon.com/appsync/latest/devguide/security-authz.html) — API key is appropriate for public-facing data; IAM for authenticated paths (HIGH confidence)
- [AppSync security best practices — AWS official docs](https://docs.aws.amazon.com/appsync/latest/devguide/best-practices.html) — recommends WAF for rate-limit protection on API key-authenticated APIs (HIGH confidence)
- [Next.js data security guide](https://nextjs.org/docs/app/guides/data-security) — Server Actions as public endpoints; always validate in action (HIGH confidence)
- [Next.js caching guide](https://nextjs.org/docs/app/guides/caching) — React `cache()` deduplicates within a single render pass; does not persist across requests (HIGH confidence)
- [AWS Lambda pricing — official](https://aws.amazon.com/lambda/pricing/) — INIT phase billed at invocation rate since August 2025 (HIGH confidence)
- [AWS Lambda cold start optimization 2025 — zircon.tech](https://zircon.tech/blog/aws-lambda-cold-start-optimization-in-2025-what-actually-works/) — 512MB memory doubles cold start billing cost vs 128MB under new pricing (MEDIUM confidence)
- [Reduce Lambda costs by optimizing memory and duration — oneuptime 2026](https://oneuptime.com/blog/post/2026-02-12-reduce-lambda-costs-by-optimizing-memory-and-duration/view) — cost model for memory vs. duration tradeoff (MEDIUM confidence)
- [Shiki bundles — official docs](https://shiki.style/guide/bundles) — full bundle 1.2MB gzip, web bundle 695KB gzip; fine-grained bundle recommended for web apps (HIGH confidence)
- [Shiki Next.js integration — official docs](https://shiki.style/packages/next) — server component approach avoids shipping Shiki to the client entirely (HIGH confidence)
- [Shiki best performance practices — official docs](https://shiki.style/guide/best-performance) — JavaScript regex engine for client-side use; fine-grained language imports (HIGH confidence)
- [Concurrent Optimistic Updates in React Query — TkDodo](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query) — optimistic update race conditions with in-flight requests (MEDIUM confidence)
- [AWS Amplify v6 bundle size improvements](https://aws.amazon.com/blogs/mobile/aws-amplify-javascripts-new-developer-preview-with-reduced-bundle-sizes-improved-typescript-and-next-js-support/) — API GraphQL category 58% smaller in v6 vs v5; tree-shaking requires function-based imports (HIGH confidence)
- [AppSync subscriptions not working — aws-amplify GitHub issue #2039](https://github.com/aws-amplify/amplify-js/issues/2039) — double-dispatch patterns from subscription + optimistic combined (MEDIUM confidence)
- [Layout thrashing and forced reflows — DebugBear](https://www.debugbear.com/blog/forced-reflows) — reading layout properties after writes forces synchronous layout recalculation (HIGH confidence)
- Direct codebase inspection — `use-session-state.ts`, `use-session-updates.ts`, `use-session-mutations.ts`, `use-host-mutations.ts`, `actions/snippet.ts`, `actions/qa.ts`, `lib/appsync-client.ts`, `lib/appsync-server.ts`, `resolvers/clipboard.ts`, `resolvers/rate-limit.ts`, `lib/session.ts`, `sst.config.ts` (HIGH confidence)

---

_Pitfalls research for: Nasqa Live — v2.0 Performance & Instant Operations_
_Researched: 2026-03-17_
