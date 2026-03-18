# Project Research Summary

**Project:** Nasqa Live — v2.0 Performance & Instant Operations
**Domain:** Real-time session tool (Next.js + AppSync + DynamoDB) — performance optimization milestone on a production codebase
**Researched:** 2026-03-17
**Confidence:** HIGH

## Executive Summary

Nasqa Live is a production-deployed real-time session tool — a live clipboard for code snippets and a live Q&A feed — used by presenters during conferences and workshops. The codebase is already in v1.3. The v2.0 goal is to make every host action feel instantaneous. All research was conducted by direct codebase inspection at commit `7c4e8fa`, not theoretical survey, giving unusually high confidence across all four research areas.

The recommended approach is a targeted six-change optimization plan: (1) eliminate the Netlify-to-AppSync network hop for participant mutations by calling AppSync directly from the browser; (2) add optimistic snippet push so the host sees their own clipboard updates at 0ms instead of ~400ms; (3) wrap SSR data fetches with `React.cache()` to halve DynamoDB reads per page load; (4) reduce the QA sort debounce from 1000ms to 300ms (with a layout animation prerequisite); (5) increase Lambda memory to 256MB for better cold-start economics; and (6) move Shiki syntax preview client-side using dynamic imports and the JavaScript regex engine. These changes are incremental and independent enough to be sequenced without a big-bang rewrite.

The key risks are security (host mutations must not move client-side because `hostSecretHash` would be visible in the browser's Network tab), correctness (optimistic snippet dispatch races with subscription broadcast and produces a duplicate card without a content-fingerprint dedup guard), and cost (Lambda memory increase beyond 256MB doubles cold-start billing under AWS's August 2025 pricing change where the INIT phase is now billed at invocation rate). All three risks have precise, documented prevention strategies.

## Key Findings

### Recommended Stack

The stack is locked at production versions and must not change. The relevant constraints for v2.0 implementation: Next.js 16.1.6 App Router with React 19.2.3 (stable `cache()` API available); Shiki 4.0.2 which exposes both `./bundle/web` and `shiki/core` for fine-grained client-side imports with a JavaScript regex engine option; aws-amplify 6.16.3 which already configures an `appsyncClient` used by the subscription hook and is browser-compatible for direct mutations; SST Ion 4.2.7 which accepts `memory: "256 MB"` as a string on `sst.aws.Function`.

**Core technologies and their v2.0 relevance:**

- **Next.js 16 + React 19:** `cache()` from `react` is stable — enables per-request DynamoDB deduplication without cross-request staleness risk
- **AppSync + aws-amplify 6:** `appsyncClient.graphql()` already works in the browser (used for subscriptions); the same client can fire mutations directly, eliminating the Netlify server action hop for participant mutations
- **Shiki 4.0.2:** Ships `shiki/core` + `shiki/engine/javascript` — the correct client-side path; `bundle/web` export confirmed present in `node_modules/shiki/dist/bundle-web.mjs`
- **SST Ion 4.2.7:** `memory` property on `sst.aws.Function`; use `"256 MB"` (not `"512 MB"` — see Pitfalls)
- **DynamoDB single-table, on-demand:** No schema changes needed for any v2.0 optimization; all changes are application-layer

### Expected Features

Research confirmed one gap not previously documented: `pushSnippetAction` does NOT dispatch `ADD_SNIPPET_OPTIMISTIC` before firing, creating a jarring inconsistency — the host sees instant feedback on question submissions but 300–600ms feedback on snippet pushes, despite the reducer already supporting it via `ADD_SNIPPET_OPTIMISTIC` and `REMOVE_OPTIMISTIC`.

**Must have (table stakes — v2.0 core wave):**

- Optimistic snippet push — closes the largest perceived-latency gap; reducer already supports it
- QA sort debounce 300ms — but only after Framer Motion `layout` animation is added to question cards (prerequisite, not optional enhancement)
- Lazy i18n in Server Actions — move `getTranslations()` inside `catch` blocks; removes one async call from every hot-path success
- SSR fetch deduplication via `React.cache()` — halves DynamoDB reads per page load (4 → 2)

**Should have (v2.0 polish wave):**

- Lambda memory at 256MB — reduces cold starts by ~40% at only 1.2x billing cost
- Direct client-to-AppSync mutations for participant actions — eliminates ~100–200ms Netlify network hop per mutation
- Client-side Shiki for host preview — eliminates server-action round-trip on each keystroke; requires JS regex engine and dynamic import

**Defer to v2.1+:**

- Direct client mutations for host mutations — blocked on security boundary; `hostSecretHash` must not travel to the browser
- aws-amplify dynamic import bundle splitting — real bundle size win (~68kB gzip) but separate milestone
- Participant mutations client-side validation hardening — validate pattern on host-safe changes first

### Architecture Approach

The v2.0 architecture makes two structural changes. First, `lib/appsync-client.ts` gains a `graphqlMutation()` helper — a thin typed wrapper around `appsyncClient.graphql()` that mirrors the `appsyncMutation()` interface from `appsync-server.ts`. Second, `use-host-mutations.ts` gains `handlePushSnippet()` which owns optimistic dispatch, mutation call, and rollback, making `HostInput` fully presentational. The server action layer for participant mutations is removed (except `createSession` which must stay server-side because it uses `node:crypto`). SSR routes gain `React.cache()` wrappers on `getSession` and `getSessionData` with no call-site changes.

**Major components and v2.0 changes:**

1. `lib/appsync-client.ts` — EXTENDED: add `graphqlMutation()` export for direct browser-to-AppSync calls
2. `lib/safe-action.ts` — EXTENDED: add `safeClientMutation()` alongside existing `safeAction()`
3. `lib/parse-appsync-error.ts` — NEW FILE: shared error parser replacing inline `parseRateLimitOrBan()` in action files
4. `lib/session.ts` — MODIFIED: wrap `getSession`/`getSessionData` with `cache()` from `react`
5. `hooks/use-host-mutations.ts` — MODIFIED: add `handlePushSnippet()` with optimistic dispatch + pending-snippets ref dedup
6. `components/session/host-input.tsx` — MODIFIED: receives `onPush` prop; add lazy client Shiki via dynamic import
7. `components/session/qa-panel.tsx` — MODIFIED: debounce 1000ms → 300ms (after layout animation prerequisite)
8. `sst.config.ts` — MODIFIED: `memory: "256 MB"` on `ResolverFn`
9. All action files (`snippet.ts`, `qa.ts`, `moderation.ts`, `reactions.ts`) — MODIFIED: mutation bodies removed; only `createSession` in `session.ts` survives unchanged

### Critical Pitfalls

1. **Host mutations must NOT move client-side** — `hostSecretHash` appearing in browser DevTools Network tab would allow any observer to replay host mutations. Participant mutations are safe to move (fingerprint-based auth enforced in Lambda). Host mutations (`pushSnippet`, `deleteSnippet`, `clearClipboard`, `focusQuestion`, `banQuestion`, `banParticipant`, `restoreQuestion`) must stay as Server Actions. Verify by Network tab audit: zero host mutations should originate from the browser.

2. **Optimistic snippet dispatch races with subscription broadcast** — The `SNIPPET_ADDED` subscription handler in `use-session-updates.ts` dispatches without `optimisticId`. The optimistic entry has `id: "_opt_..."` and the real subscription entry has a UUID — ID-based dedup fails, producing two identical snippets briefly. Fix: store `tempId → content+language` in a `pendingSnippets` ref; when `SNIPPET_ADDED` arrives, match by content+language fingerprint and replace. This mirrors the `QUESTION_ADDED` dedup pattern already in the reducer. Do not ship `ADD_SNIPPET_OPTIMISTIC` without this guard.

3. **Lambda memory above 256MB doubles cold-start billing** — AWS changed Lambda billing in August 2025: the INIT phase is now billed at invocation rate. At 512MB the cold-start cost is 2x that of 128MB. At 256MB it is only 1.2x, with a ~40% latency reduction. Target 256MB, not 512MB.

4. **QA sort debounce reduction requires layout animation as a prerequisite** — Without Framer Motion `layout` prop on question cards, reducing debounce from 1000ms to 300ms causes visible card teleporting during active voting. The debounce is a compensation mechanism for missing layout animation, not pure latency overhead.

5. **Client-side Shiki must use dynamic import and the JS regex engine** — Static import of `shiki` in any client component adds 695kB gzip to the initial bundle. The Wasm engine (`shiki/engine/oniguruma`) adds an extra network request on page load and 200–500ms initialization delay on first keystroke. Always use `import("shiki/core")` inside an async callback with `createJavaScriptRegexEngine()`. Verify with bundle analyzer that `shiki` appears only in a lazy chunk.

## Implications for Roadmap

The six optimizations have a clear dependency order. Independent infrastructure changes ship first. The two structural mutation-path changes depend on shared utilities that must exist first. Client-side Shiki depends on the host-input.tsx refactor from the optimistic snippet phase. Lazy i18n ships alongside the mutation removal it enables.

### Phase 1: Infrastructure and Independent Quick Wins

**Rationale:** Three changes are fully independent of the mutation path refactor and can be code-reviewed in isolation with near-zero implementation risk. Ship them first to deliver measurable improvements and validate the deployment pipeline before touching hooks and mutation architecture.

**Delivers:** Reduced Lambda cold starts (~40%); halved SSR DynamoDB reads per page load; faster QA list reordering with smooth positional animation

**Addresses:** Lambda memory tuning (P2), SSR fetch deduplication (P1), QA sort debounce (P1 — with layout animation in same phase)

**Avoids:**

- Lambda billing spike — use 256MB not 512MB (PITFALLS Pitfall 3)
- Stale SSR data — use `cache()` not `unstable_cache`; add `export const dynamic = "force-dynamic"` to session pages as a guard (PITFALLS Pitfall 4)
- Card teleporting — add Framer Motion `layout` prop to question cards before reducing debounce (PITFALLS Pitfall 5)

**Files:** `sst.config.ts`, `lib/session.ts`, `components/session/qa-panel.tsx`, question card component (add `layout` prop)

### Phase 2: Mutation Path Utilities and Participant Mutations

**Rationale:** Before hooks can call AppSync directly, the shared plumbing must exist. Once utilities exist, participant mutations are the safe first migration — no security boundary at stake. Lazy i18n is shipped here because it applies to the action files being modified or removed in this phase.

**Delivers:** `graphqlMutation()` and `safeClientMutation()` shared utilities; `parseAppsyncError()` shared error parser; participant mutations (`addQuestion`, `upvoteQuestion`, `downvoteQuestion`, `react`, `addReply`) calling AppSync directly; ~100–200ms latency reduction per participant action; lazy `getTranslations()` in surviving action files

**Addresses:** Direct client mutations for participant path (P2), lazy i18n in Server Actions (P1)

**Avoids:**

- Host secret exposure — host mutations explicitly kept as Server Actions in this phase (PITFALLS Pitfall 1)
- Rate limit i18n regression — client-side `parseAppsyncError()` handles `RATE_LIMIT_EXCEEDED:N` (PITFALLS integration gotchas)
- Missing input validation — replicate `text.length > 500` and `text.trim().length === 0` checks in hook before optimistic dispatch

**Files:** `lib/appsync-client.ts` (extend), `lib/safe-action.ts` (extend), `lib/parse-appsync-error.ts` (new), `hooks/use-session-mutations.ts`, `actions/qa.ts`, `actions/moderation.ts`, `actions/reactions.ts`

### Phase 3: Optimistic Snippet Push

**Rationale:** Highest-value single UX fix. The mutation utilities from Phase 2 are a prerequisite (`handlePushSnippet` uses `safeClientMutation`). The content-fingerprint dedup guard must be implemented before this ships — without it, the optimistic entry and the subscription-confirmed entry both appear, causing a visible duplicate flash on every push.

**Delivers:** Host snippet push perceived at 0ms; clipboard panel updates instantly on push; rollback on failure restores textarea content; `HostInput` becomes fully presentational (`onPush` prop, no direct action imports)

**Addresses:** Optimistic snippet push (P1), host mutation path partially migrated to `use-host-mutations.ts`

**Avoids:**

- Optimistic double-add race — implement `pendingSnippets` ref with content+language fingerprint matching in `SNIPPET_ADDED` reducer before dispatch exists (PITFALLS Pitfall 2)
- Prop-drilling `dispatch` — add `handlePushSnippet` to `use-host-mutations.ts` (already has `dispatch`, `sessionSlug`, `hostSecretHash`); thread as `onPush` prop through `ClipboardPanel` to `HostInput`

**Files:** `hooks/use-host-mutations.ts`, `hooks/use-session-state.ts` (add content-fingerprint dedup to `SNIPPET_ADDED`), `components/session/host-input.tsx`, `components/session/clipboard-panel.tsx`

### Phase 4: Client-Side Shiki for Host Preview

**Rationale:** Depends on Phase 3 completing the `host-input.tsx` refactor and removing the `renderHighlight` Server Action call. Bundle budget must be verified first — confirm `shiki` will land in a lazy chunk and not in the initial bundle. If total initial bundle already exceeds 100kB gzip, consider deferring until aws-amplify is dynamically imported.

**Delivers:** Instant syntax highlighting during host typing (0ms vs. ~150–300ms Server Action RTT); `renderHighlight` export deleted from `actions/snippet.ts`

**Addresses:** Client-side Shiki for host preview (P2)

**Avoids:**

- Bundle overrun — dynamic `import("shiki/core")` only inside async callback; never a static import; JS regex engine not Wasm (PITFALLS Pitfall 6)
- First-keystroke delay — pre-initialize Shiki asynchronously after host page mount on idle, not on first keystroke; use singleton `highlighter.current` ref pattern (PITFALLS UX Pitfalls)
- Scope creep — `shiki-block.tsx` server component for participant clipboard display stays server-rendered; only `HostInput` preview goes client-side

**Files:** `components/session/host-input.tsx`, `actions/snippet.ts` (delete `renderHighlight`)

### Phase Ordering Rationale

- Phase 1 first because all three changes are isolated and validate the deployment pipeline before touching hooks
- Phase 2 before Phase 3 because `safeClientMutation()` and `graphqlMutation()` are prerequisites for `handlePushSnippet()` in the hook
- Phase 3 before Phase 4 because client-side Shiki replaces the `renderHighlight` call that Phase 3 removes from `host-input.tsx`; out-of-order creates a broken intermediate state
- Lazy i18n ships in Phase 2 (not separately) because the action files it targets are being modified anyway; bundling reduces total review cycles

### Research Flags

Phases requiring verification before implementation begins:

- **Phase 1 (QA debounce):** Verify whether Framer Motion `layout` prop is already applied to question cards; if so, no prerequisite work needed
- **Phase 1 (Lambda memory):** Conflicting reports in research on SST default (128MB vs 1024MB) — verify by inspecting `sst.config.ts` before choosing the memory value; in either case, target is 256MB
- **Phase 2 (rate limit i18n):** After migration, manually trigger rate limiting (11 rapid questions in 60 seconds) and verify toast shows localized countdown, not raw `RATE_LIMIT_EXCEEDED:N`
- **Phase 4 (bundle budget):** Run `next build` bundle analyzer before implementation; confirm `shiki` appears only in a lazy chunk and total initial bundle is under 100kB gzip

Phases with standard, well-documented patterns:

- **Phase 1 (React.cache() wrapping):** Fully documented in Architecture research with exact code samples; no unknowns
- **Phase 3 (optimistic snippet):** Pattern already exists in `QUESTION_ADDED` reducer path; exact `pendingSnippets` ref implementation documented in Architecture and Pitfalls research

## Confidence Assessment

| Area         | Confidence | Notes                                                                                                      |
| ------------ | ---------- | ---------------------------------------------------------------------------------------------------------- |
| Stack        | HIGH       | All versions from actual `package.json`; Shiki `bundle/web` export confirmed present in `node_modules`     |
| Features     | HIGH       | Codebase directly inspected; gap in `pushSnippetAction` verified by reading the actual implementation      |
| Architecture | HIGH       | All code samples verified against real file paths and line numbers; build order dependency graph confirmed |
| Pitfalls     | HIGH       | All six critical pitfalls grounded in direct code inspection plus official AWS, Next.js, and Shiki docs    |

**Overall confidence:** HIGH

### Gaps to Address

- **Lambda memory default conflict:** STACK.md says SST default is 1024MB; Architecture and Pitfalls research say 128MB. Verify the actual SST Ion 4.2.7 default at implementation time. The target is 256MB regardless of the current default.

- **Host mutations security decision:** Architecture research initially recommends moving host mutations client-side as a v2.0 P2 item. Pitfalls research explicitly contradicts this with a specific security argument about `hostSecretHash` visibility. The roadmap adopts the Pitfalls position: participant mutations move client-side in v2.0; host mutations stay as Server Actions. This is a v2.1 decision requiring a dedicated security review (e.g., rotating to session-scoped JWT tokens rather than URL-fragment hash).

- **Bundle budget:** Current initial JS bundle is ~156kB (exceeds 80kB target); aws-amplify is ~68kB of that. Client-side Shiki can only ship if it lands in a lazy chunk (confirmed achievable via dynamic import). Measure actual budget at Phase 4 start before implementing.

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection at commit `7c4e8fa` — `use-session-state.ts`, `use-host-mutations.ts`, `use-session-mutations.ts`, `use-session-updates.ts`, `host-input.tsx`, `qa-panel.tsx`, `lib/session.ts`, `lib/appsync-client.ts`, `lib/appsync-server.ts`, `actions/snippet.ts`, `actions/qa.ts`, `sst.config.ts`, `resolvers/rate-limit.ts`
- [React cache() and SSR deduplication — Next.js caching guide](https://nextjs.org/docs/app/guides/caching)
- [Next.js data security guide](https://nextjs.org/docs/app/guides/data-security)
- [AWS Lambda pricing — INIT phase now billed at invocation rate since August 2025](https://aws.amazon.com/lambda/pricing/)
- [Shiki bundles — official docs](https://shiki.style/guide/bundles)
- [Shiki Next.js integration — official docs](https://shiki.style/packages/next)
- [Shiki best performance practices — JS regex engine guidance](https://shiki.style/guide/best-performance)
- [AppSync authorization — AWS official docs](https://docs.aws.amazon.com/appsync/latest/devguide/security-authz.html)
- [AppSync security best practices — WAF recommendation](https://docs.aws.amazon.com/appsync/latest/devguide/best-practices.html)

### Secondary (MEDIUM confidence)

- [AWS Lambda cold start optimization 2025 — zircon.tech](https://zircon.tech/blog/aws-lambda-cold-start-optimization-in-2025-what-actually-works/) — cost model for 128/256/512MB cold start billing under new pricing
- [Reduce Lambda costs by optimizing memory — oneuptime 2026](https://oneuptime.com/blog/post/2026-02-12-reduce-lambda-costs-by-optimizing-memory-and-duration/view) — 256MB as inflection point for lightweight Node.js
- [Debounce vs throttle timing — kettanaito.com](https://kettanaito.com/blog/debounce-vs-throttle) — 200–500ms sweet spot for list reorder UX
- [Concurrent Optimistic Updates — TkDodo](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query) — optimistic update race conditions with in-flight requests

---

_Research completed: 2026-03-17_
_Ready for roadmap: yes_
