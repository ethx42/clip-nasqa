# Feature Research

**Domain:** Performance optimization — real-time session tool (Next.js + AppSync + DynamoDB)
**Researched:** 2026-03-17
**Confidence:** HIGH (codebase directly inspected; claims verified against current sources)

---

## Context: What Is Already Built

Before classifying features, the existing architecture must be understood to avoid recommending what already exists.

**Already complete (do not rebuild):**

- Optimistic updates for questions, votes, downvotes, replies, reactions — all with rollback
- `ADD_SNIPPET_OPTIMISTIC` / `REMOVE_OPTIMISTIC` reducer actions exist in `use-session-state.ts`
- Server Actions via `appsyncMutation` (plain `fetch` HTTP POST — not Amplify client)
- `aws-amplify` used only for WebSocket subscriptions (not mutations)
- Shiki runs server-side via `renderHighlight` Server Action, absent from client bundle
- QA sort debounce set at 1000ms (`setTimeout(..., 1000)` in `qa-panel.tsx`)
- Highlight debounce set at 200ms (`scheduleHighlight` in `host-input.tsx`)
- `getTranslations()` called at the top of every Server Action — including error-only paths
- `getSession` and `getSessionData` called independently in both `page.tsx` and `generateMetadata` — same render, same slug, two DynamoDB round-trips each

**Gap identified in code review:**

- `pushSnippetAction` does NOT dispatch `ADD_SNIPPET_OPTIMISTIC` before firing. The host types, presses push, the form clears, then waits for the AppSync subscription round-trip before the card appears in the clipboard. Questions have optimistic insertion; snippets do not.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that a production real-time tool at this quality level must provide. Missing these creates a perceived regression from what already works.

| Feature                                        | Why Expected                                                                                                                                                                                                                      | Complexity | Notes                                                                                                                                        |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Optimistic snippet push                        | Questions already have it — the gap is jarring to the host who sees instant Q feedback but delayed snippet feedback                                                                                                               | MEDIUM     | Needs `ADD_SNIPPET_OPTIMISTIC` dispatch before `pushSnippetAction` fires; rollback on failure; dedup guard in `SNIPPET_ADDED` already exists |
| QA sort debounce tuned down                    | 1000ms feels sluggish after a fast upvote; 300ms is perceptually immediate without card-jump chaos                                                                                                                                | LOW        | Change one constant in `qa-panel.tsx` line 79; no logic change                                                                               |
| Lambda memory locked at minimum effective size | Default SST Lambda `sst.config.ts` has no explicit `memory` set — default is 1024MB. Node.js + DynamoDB SDK resolvers are I/O-bound; 512MB is the proven cost-efficient floor (comparable cold start to 1024MB for I/O workloads) | LOW        | Add `memory: "512 MB"` to `ResolverFn` in `sst.config.ts`; requires redeploy                                                                 |
| SSR fetch deduplication                        | `getSession` and `getSessionData` each called independently in `generateMetadata` and the page component for the same slug. Four DynamoDB round-trips per page render where two would suffice                                     | LOW        | Wrap both functions with `cache()` from React — deduplicates within single render pass without persistent cross-request caching              |

### Differentiators (Competitive Advantage)

Features that go beyond correctness and meaningfully improve perceived latency or developer ergonomics.

| Feature                            | Value Proposition                                                                                                                                                                                                                                                                 | Complexity | Notes                                                                                                                                                                                                                                                                                               |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lazy i18n in Server Actions        | `getTranslations("actionErrors")` is called at the top of every action even on the success path where it is never used. Deferring it to the error branch removes one async call from the hot path for all 15 action call sites                                                    | LOW        | Move `const t = await getTranslations(...)` inside the `catch` block in `snippet.ts`, `qa.ts`, `moderation.ts`, `reactions.ts`. No behavior change on success paths                                                                                                                                 |
| Direct client-to-AppSync mutations | Eliminates the Netlify edge function network hop: browser → Netlify → AppSync becomes browser → AppSync. Saves 100–200ms on every host mutation. The API key is already public (`NEXT_PUBLIC_APPSYNC_API_KEY`) — this is an accepted tradeoff for an anonymous public-facing tool | HIGH       | Create `lib/appsync-client.ts` mirroring `lib/appsync-server.ts` using the same plain `fetch` pattern. Replace `safeAction(pushSnippetAction(...))` calls with direct fetch. Scope initially to host mutations (`pushSnippet`, `deleteSnippet`, `clearClipboard`)                                   |
| Client-side syntax highlighting    | Removes the `renderHighlight` Server Action round-trip from the host's live typing preview. Currently: type → 200ms debounce → Server Action → Netlify edge → Shiki on server → response → display. With client Shiki: type → 200ms debounce → Shiki in-browser → display         | HIGH       | Shiki supports `createHighlighter` with on-demand language loading. Lazy-import only the languages in `SUPPORTED_LANGUAGES` (~10 languages). Cost: ~50–80kB gzipped additional bundle on the host page only. Requires aws-amplify bundle issue resolved first or host page dynamic import isolation |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature                                              | Why Requested                                                  | Why Problematic                                                                                                                                                                                                                                                          | Alternative                                                                                                                                          |
| ---------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provisioned concurrency for Lambda                   | Eliminates cold starts entirely                                | Bills 24/7 even when sessions are idle. Nasqa sessions are bursty — 500 participants for 45 minutes, then zero. Provisioned concurrency would bill for 23+ idle hours per session                                                                                        | Memory tuning at 512MB+ with ARM64 architecture gets cold start to ~200–375ms at near-zero ongoing cost. Accept the first-invocation cold start      |
| Replacing aws-amplify with a custom WebSocket client | Amplify is 68kB gzipped — exceeds the 80kB bundle target alone | AppSync's WebSocket protocol is undocumented. Subscription filter semantics, reconnection logic, and dedup are all handled by Amplify. Building a replacement risks missing reconnect and filter edge cases                                                              | Scope Amplify import to the subscription hook only via dynamic import (`next/dynamic`). This is a separate bundle-budget milestone, not part of v2.0 |
| Persistent cross-request cache for session data      | Eliminates DynamoDB reads after first load                     | Session data changes in real-time (votes, new questions). A stale cross-request cache would show wrong counts. WebSocket subscriptions handle delta updates but do not restore full state after reconnect                                                                | Keep `cache()` deduplication within a single render pass only (request memoization). Do not add a TTL-based persistent cache                         |
| Aggressive highlight debounce reduction below 150ms  | Feels more responsive                                          | Below ~150ms the Server Action round-trip is still slower than the debounce delay — reducing it only increases server action invocations without improving perceived responsiveness. If client-side Shiki is implemented, 0ms debounce becomes viable                    | Keep 200ms for the server path. Once client-side Shiki lands, debounce becomes irrelevant                                                            |
| `useOptimistic` hook (React 19 API)                  | Cleaner API than manual `useReducer` dispatch                  | The existing reducer pattern in `use-session-state.ts` handles multi-source deduplication — it replaces optimistic `_opt_` IDs when the real subscription arrives. `useOptimistic` only reverts on error; it does not merge incoming subscription payloads with temp IDs | Continue with `useReducer` + `_opt_` ID pattern. The existing pattern is correct and more capable                                                    |

---

## Feature Dependencies

```
Optimistic snippet push
    └──requires──> ADD_SNIPPET_OPTIMISTIC already in reducer (exists — no schema change)
    └──requires──> Dedup guard in SNIPPET_ADDED for optimisticId (exists — line 60-68)
    └──requires──> REMOVE_OPTIMISTIC dispatch on pushSnippetAction failure (add inline)
    └──note──> Logic should move into useHostMutations as handlePushSnippet
               to match the pattern used by handleAddQuestion in useSessionMutations

SSR fetch deduplication
    └──requires──> React.cache() wrapper on getSession and getSessionData in lib/session.ts
    └──note──> Must be request-scoped (no TTL arg) — persistent cache would serve stale data

Lazy i18n in Server Actions
    └──independent──> No dependencies; pure error-path refactor of 4 files
    └──note──> Only applies when error message is actually surfaced (catch blocks)

QA sort debounce reduction
    └──independent──> One-line change in qa-panel.tsx line 79

Lambda memory tuning
    └──independent──> SST config change only; redeploy required

Direct client mutations
    └──requires──> lib/appsync-client.ts (client-side fetch to AppSync)
    └──requires──> Error propagation without reportError (server-only utility)
    └──conflicts with──> Server Action safeAction wrapper (does not apply to client fetch)
    └──note──> Host mutations first (pushSnippet, deleteSnippet, clearClipboard);
               participant mutations (addQuestion, upvoteQuestion) follow once pattern proven
    └──enhances──> Optimistic snippet push (mutation is faster so roundtrip completes sooner)

Client-side Shiki
    └──requires──> Dynamic import scoped to host page (next/dynamic or lazy())
    └──requires──> Bundle budget headroom — currently consumed by aws-amplify (68kB)
    └──requires──> SUPPORTED_LANGUAGES list from detect-language.ts to scope grammar imports
    └──note──> Does NOT replace shiki-block.tsx SSR rendering — participant view stays server-rendered
    └──enhances──> Optimistic snippet push (highlight available instantly during typing)
```

### Dependency Notes

- **Optimistic snippet push is the highest value, lowest risk item.** The reducer already supports it via `ADD_SNIPPET_OPTIMISTIC` and `REMOVE_OPTIMISTIC`. The missing piece is dispatching `ADD_SNIPPET_OPTIMISTIC` before `pushSnippetAction` fires, and `REMOVE_OPTIMISTIC` on failure. The `SNIPPET_ADDED` case already handles `optimisticId` replacement.
- **Direct client mutations conflict with the server-side error pipeline.** `reportError` is a server-only utility. Client-side fetch errors must be caught locally and surfaced via `toast.error`. This is already the pattern for vote rollbacks — the same approach applies.
- **Client-side Shiki should follow optimistic snippet push.** With optimistic push, the snippet card appears immediately on submit. The live highlight preview during typing is a secondary concern. Reversing the order adds bundle risk before the core UX fix ships.
- **SSR deduplication and lazy i18n are independent and low-risk.** Both can ship in the first wave without dependencies on the other items.

---

## MVP Definition

This is a subsequent milestone on an already-shipped product. MVP means: the minimum set of changes that delivers the v2.0 goal ("every user action must feel instantaneous") with acceptable risk.

### Ship First (v2.0 core — low risk, high clarity)

- [ ] Optimistic snippet push — closes the largest perceived-latency gap for the host
- [ ] QA sort debounce reduction (1000ms to 300ms) — instant UX improvement, zero risk
- [ ] Lazy i18n in Server Actions — removes hidden async overhead from every hot-path action
- [ ] SSR fetch deduplication via `React.cache()` — eliminates duplicate DynamoDB reads per render

### Ship After Core (v2.0 polish — higher complexity, needs scoping)

- [ ] Lambda memory explicitly set to 512MB in `sst.config.ts` — verify default, lock for cost efficiency
- [ ] Direct client-to-AppSync mutations for host snippet push — measured latency improvement
- [ ] Client-side Shiki for host input preview — requires bundle budget resolution first

### Defer (v2.1+)

- [ ] Direct client mutations for participant Q&A — lower value than snippet path, higher risk surface
- [ ] aws-amplify dynamic import splitting — bundle size fix; separate milestone, does not affect latency

---

## Feature Prioritization Matrix

| Feature                     | User Value                                                | Implementation Cost                                    | Priority |
| --------------------------- | --------------------------------------------------------- | ------------------------------------------------------ | -------- |
| Optimistic snippet push     | HIGH — host primary action has no instant feedback        | LOW — reducer already supports it                      | P1       |
| QA sort debounce 300ms      | MEDIUM — prevents jarring 1s reorder delay                | LOW — one-line change                                  | P1       |
| Lazy i18n in Server Actions | LOW-MEDIUM — removes hidden async overhead from hot path  | LOW — move getTranslations inside catch                | P1       |
| SSR fetch deduplication     | LOW-MEDIUM — halves DynamoDB read count per page load     | LOW — React.cache() wrapper                            | P1       |
| Lambda memory tuning        | MEDIUM — reduces cold start for burst sessions            | LOW — SST config + redeploy                            | P2       |
| Direct client mutations     | HIGH — eliminates ~150ms network hop on every host action | HIGH — new client fetch pattern, error handling rework | P2       |
| Client-side Shiki           | MEDIUM — removes round-trip latency from host preview     | HIGH — bundle budget risk, dynamic import complexity   | P2       |

**Priority key:**

- P1: Include in v2.0 first wave — low cost, high clarity
- P2: Include in v2.0 second wave — higher complexity, needs scoping
- P3: Future milestone

---

## Technical Details Per Feature

### Optimistic Snippet Push

**Current flow:** host types → presses push → `handlePush` clears input → fires `pushSnippetAction` → waits for AppSync subscription → `SNIPPET_ADDED` dispatched → card appears.

**Target flow:** host types → presses push → `handlePush` dispatches `ADD_SNIPPET_OPTIMISTIC` with `_opt_${Date.now()}` ID → clears input → fires `pushSnippetAction` → on failure, dispatches `REMOVE_OPTIMISTIC` and restores input → on success, subscription arrives with real ID → `SNIPPET_ADDED` with `optimisticId` replaces the placeholder.

The optimistic snippet must be shaped correctly: `type`, `language`, `content`, and `sessionSlug` must match the real item. The `createdAt` can be `Math.floor(Date.now() / 1000)`. The `TTL` is irrelevant for the optimistic placeholder.

Logic recommendation: move push handling into `useHostMutations` as a `handlePushSnippet` function, accepting the same arguments as `pushSnippetAction`. This matches the pattern used by `handleAddQuestion` in `useSessionMutations`.

### SSR Fetch Deduplication

**Current problem in `page.tsx` and `host/page.tsx`:**

```
generateMetadata:  getSession(slug) + getSessionData(slug)   // 2 DynamoDB reads
SessionPage:       getSession(slug) + getSessionData(slug)   // 2 DynamoDB reads
                                                             // = 4 reads per page load
```

**Fix:** Wrap `getSession` and `getSessionData` in `lib/session.ts` with `cache` from `react`. React's `cache()` deduplicates by function reference + serialized arguments within one render pass. Result: 2 DynamoDB reads per page load regardless of how many server components call the functions. No persistent cache — request lifetime only.

### QA Sort Debounce

Current: `setTimeout(..., 1000)` in `qa-panel.tsx` line 79.
Target: `setTimeout(..., 300)`.

At 300ms, re-sorting happens fast enough to feel responsive while still batching rapid vote bursts (multiple participants voting in the same second). The 200–500ms range is the well-established sweet spot for list UX; 1000ms is empirically too slow for a live session.

### Lambda Memory

The `ResolverFn` in `sst.config.ts` has no `memory` property. SST Ion's default for `sst.aws.Function` is 1024MB. This is already within the optimal range for cold starts. The optimization is to add an explicit `memory: "512 MB"` declaration for cost efficiency, since AppSync resolvers are DynamoDB I/O-bound — they are not CPU-constrained and do not benefit from the extra vCPU headroom at 1024MB. Node.js 22 + DynamoDB SDK cold start at 512MB: ~375ms. At 1024MB: ~280ms. The 95ms difference is not worth 2x the compute cost for an I/O-bound resolver.

### Direct Client Mutations

**Mechanism:** `NEXT_PUBLIC_APPSYNC_URL` and `NEXT_PUBLIC_APPSYNC_API_KEY` are already exposed to the browser by naming convention. `lib/appsync-server.ts` is a plain `fetch` POST — this pattern is browser-compatible. `lib/appsync-client.ts` is an identical utility usable in client components and hooks.

**Security posture:** API key authentication for an anonymous, public-facing, 24-hour TTL tool is an accepted decision already made and documented in `PROJECT.md`. Resolver-level rate limiting and host secret validation still apply — these run inside Lambda regardless of where the mutation originates.

**Scope:** Start with host mutations (`pushSnippet`, `deleteSnippet`, `clearClipboard`) in `useHostMutations`. These have the highest latency impact and the most contained error handling. Participant mutations (`addQuestion`, `upvoteQuestion`) can follow once the pattern is validated.

### Client-Side Shiki

**Bundle cost:** `createHighlighter` with only the languages in `SUPPORTED_LANGUAGES` (~10 languages) + 2 themes loads approximately 50–80kB gzipped. The current aws-amplify subscription client is ~68kB gzipped and already exceeds the 80kB bundle target. Client-side Shiki cannot ship until either: (a) aws-amplify is replaced or dynamically imported, or (b) client-side Shiki is itself dynamically imported and excluded from the initial JS bundle.

**Scope boundary:** Client-side Shiki is only for the `HostInput` live typing preview. The `shiki-block.tsx` component used by the participant clipboard panel remains server-rendered. This is correct — participants never need interactive highlight feedback.

**API pattern:** Use `createHighlighter` with an explicit language list (not `bundledLanguages` which loads everything). Expose a singleton highlighter initialized once on first use.

---

## Sources

- Codebase inspection: `packages/frontend/src/hooks/use-session-state.ts`, `use-host-mutations.ts`, `use-session-mutations.ts`, `components/session/host-input.tsx`, `components/session/qa-panel.tsx`, `lib/session.ts`, `lib/appsync-server.ts`, `actions/snippet.ts`, `sst.config.ts`
- [React cache() and SSR deduplication — Next.js caching guide](https://nextjs.org/docs/app/guides/caching)
- [AWS Lambda cold start optimization in 2025 — what actually works](https://zircon.tech/blog/aws-lambda-cold-start-optimization-in-2025-what-actually-works/)
- [AWS Lambda cold starts in 2025: cost and performance data](https://edgedelta.com/company/knowledge-center/aws-lambda-cold-start-cost)
- [Lambda cold start benchmark across runtimes — maxday](https://maxday.github.io/lambda-perf/)
- [Fastest Node 22 Lambda coldstart configuration — Speedrun blog](https://speedrun.nobackspacecrew.com/blog/2025/07/21/the-fastest-node-22-lambda-coldstart-configuration.html)
- [Shiki Next.js integration — official shiki.style docs](https://shiki.style/packages/next)
- [Shiki performance optimization — on-demand language loading — innei blog](http://blog.innei.ren/shiki-dynamic-load-language?locale=en)
- [AppSync security and authorization — AWS official docs](https://docs.aws.amazon.com/appsync/latest/devguide/security-authz.html)
- [next-intl server/client component guidance — next-intl.dev](https://next-intl.dev/docs/environments/server-client-components)
- [Debounce vs throttle timing — kettanaito.com visual guide](https://kettanaito.com/blog/debounce-vs-throttle)

---

_Feature research for: v2.0 Performance and Instant Operations — nasqa-live_
_Researched: 2026-03-17_
