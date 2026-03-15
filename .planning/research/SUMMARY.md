# Project Research Summary

**Project:** Nasqa Live v1.2 — Emoji Reactions on Q&A Items
**Domain:** Real-time audience engagement — per-item emoji reactions in a live presentation Q&A tool
**Researched:** 2026-03-15
**Confidence:** HIGH (stack and architecture derived from live codebase; features MEDIUM from competitive analysis + HIGH for implementation specifics)

## Executive Summary

Nasqa Live v1.2 adds emoji reactions as a sentiment layer on top of an already-shipped real-time Q&A system (Next.js 16 / AppSync / DynamoDB / Lambda). The core challenge is not inventing new infrastructure — it is extending a battle-tested data model and real-time subscription pipeline without breaking any existing behavior. Every reaction pattern (dedup, optimistic UI, rate limiting, ban enforcement, subscription broadcast) has a direct analogue in the existing upvote system. The work is an extension, not a greenfield build. The recommended approach is to model reactions with flat per-emoji DynamoDB attributes on the Question/Reply item, extend the existing `SessionUpdate` subscription channel with a new `REACTION_UPDATED` event type, and reuse the established `checkNotBanned` + `checkRateLimit` + `useFingerprint` patterns from the upvote system without modification.

No surveyed competitor (Slido, Mentimeter, Pigeonhole, Zoom) attaches per-item reactions at individual Q&A question and reply granularity. Slido attaches reactions to poll answer options; Mentimeter and Pigeonhole use session-level ambient signals; Zoom reactions float at the meeting level. Nasqa Live's design — reactions pinned to specific questions and replies in a threaded Q&A — occupies a different and more actionable design space. This differentiator is already specified in the v1.2 design; no additional product work is needed to capture it. The six-emoji fixed palette (👍 ❤️ 🎉 😂 🤔 👀) is industry-standard, carries zero bundle cost as native OS emoji characters, and has no risk to the 80 kB JS budget constraint.

The primary risks are a DynamoDB data model decision and a rate limit namespace mistake that must be resolved before writing any resolver code. Storing per-emoji reactor fingerprint Sets on the Question/Reply item multiplies item size by 6x and risks hitting DynamoDB's hard 400 KB item limit at scale with active sessions. Using the same `RATELIMIT#${fingerprint}` key for reactions consumes the question-submission rate budget, causing reactions to block participants from asking questions. Both risks are straightforwardly avoided by the patterns prescribed in ARCHITECTURE.md. A secondary risk is subscription channel flooding under high reaction velocity, mitigated by frontend event debouncing and surgical TanStack Query cache updates.

## Key Findings

### Recommended Stack

The production stack is fully established and must not change for v1.2. All additions are pure extensions on already-installed dependencies. See `.planning/research/STACK.md` for the complete version inventory.

**Core technologies for reactions work:**

- **Next.js 16 + React 19**: Server Actions handle `reactAction`; `useOptimistic` enables <100 ms optimistic toggle with zero new libraries
- **AWS AppSync (via SST Ion 4.2.7)**: Extend the existing `onSessionUpdate` subscription by adding `react` to the `@aws_subscribe` mutations list — no new WebSocket channel; union-type event pattern already in production
- **AWS DynamoDB (via SST)**: Flat `rxn_<emoji>_count` + `rxn_<emoji>_reactors` attributes on Question/Reply items; atomic `ADD` operations on top-level attributes ensure race-free counter increments
- **TanStack Query 5.x**: Surgical `setQueryData` on `REACTION_UPDATED` events — never `invalidateQueries` for reactions
- **Zod 4.x**: Input validation on `emoji` argument against the fixed allowlist before any DynamoDB write
- **next-intl 4.x**: Required for i18n `aria-label` strings on reaction buttons (en/es/pt)

**No new dependencies are needed.** Reactions are implemented entirely within the existing installed stack.

### Expected Features

See `.planning/research/FEATURES.md` for full competitive analysis and prioritization matrix.

**Must have (P1 — table stakes, not shippable without these):**

- Fixed 6-emoji palette (👍 ❤️ 🎉 😂 🤔 👀) on every Question card and Reply card
- Toggle own reaction on/off (one reaction per emoji per device fingerprint)
- Real-time count propagation via existing AppSync subscription (new `REACTION_UPDATED` event)
- Inline count display ("👍 3") hidden when count is 0
- Rate limiting for reactions at 10/minute per device, separate namespace from question limit
- Ban enforcement: banned participants cannot react
- Optimistic UI: local toggle flips instantly, reconciled on subscription broadcast

**Should have (P2 — accessibility polish, add after P1 is confirmed working):**

- `aria-label="React with [emoji name]: [count] reactions"` + `aria-pressed` on all reaction buttons
- i18n aria-label strings in en/es/pt via next-intl translation keys

**Defer (v2+):**

- "Most reacted" secondary sort toggle — risks conflating sentiment with ranking; build only on explicit user demand
- Custom emoji palette per session — host UX complexity not warranted at v1.2 scale
- Floating emoji animations — violates 80 kB bundle budget; CSS `scale` pulse on click is the correct substitute
- Full emoji picker — ~100 kB bundle cost; fixed palette covers 95% of live Q&A sentiment expression

**Anti-features (explicitly excluded by design):**

- Reactions on Snippets — host-curated content should not be publicly rated
- Multiple same-emoji reactions from one user — undermines signal value for hosts
- Reactions influence sort order — upvote delta exclusively drives sort; 🤔 and ❤️ have opposite valences and cannot be averaged

### Architecture Approach

The implementation follows an 8-step build order flowing data-model-up to UI, mirroring the existing upvote system at every layer. See `.planning/research/ARCHITECTURE.md` for exact file-level change list, TypeScript interfaces, and code patterns.

**Major components:**

1. **`reactions.ts` Lambda resolver** — handles `react` mutation: ban check → rate limit → DynamoDB conditional ADD/DELETE on flat attributes → returns `REACTION_UPDATED` subscription event with authoritative count snapshot
2. **`reaction-bar.tsx` frontend component** — renders fixed 6-emoji palette with toggle state, count display (hidden at 0), ARIA attributes, and 44 px touch targets
3. **`use-reactions.ts` frontend hook** — orchestrates optimistic dispatch, localStorage gate, and Server Action call; uses `localDelta` strategy to avoid stale-count conflicts under concurrent reactions
4. **DynamoDB flat attributes** (`rxn_thumbsup_count`, `rxn_thumbsup_reactors`, etc. × 6) on existing Question/Reply items — chosen over a Map attribute because DynamoDB `ADD` is only atomic on top-level attributes, not nested Map values

**Key patterns to follow:**

- **Atomic Set-Based Dedup**: `ADD rxn_thumbsup_count :delta` + conditional `ADD/DELETE rxn_thumbsup_reactors :fpSet` — identical to existing `upvoteQuestion` resolver; battle-tested at production scale
- **Authoritative Snapshot in Subscription Payload**: send all 6 emoji counts per event (never a delta); reducer does full replacement ensuring convergence under out-of-order or missed events
- **Emoji Key Normalization**: UI displays glyph (👍), DynamoDB attributes and API arguments use ASCII key (`thumbsup`); mapping lives once in `EMOJI_PALETTE` constant — prevents ExpressionAttributeNames escaping issues with Unicode in DynamoDB expressions

### Critical Pitfalls

See `.planning/research/PITFALLS.md` for all 10 pitfalls with recovery strategies, warning signs, and phase assignments.

1. **Reactor fingerprint Sets on the Question/Reply item hit the 400 KB DynamoDB limit** — At 500 participants × 6 emojis, a single item accumulates 3,000 fingerprints (~18 KB for reactors alone). DynamoDB rejects writes silently with `ValidationException` when the item exceeds 400 KB. Solution: store only aggregate counts as flat number attributes on the Question/Reply item; use conditional `ConditionExpression: NOT contains(rxn_thumbsup_reactors, :fp)` — the reactors Set is bounded per-emoji (one fingerprint per user) not unbounded.

2. **Rate limit namespace collision with question submissions** — Using the same `RATELIMIT#${fingerprint}` key for reactions causes 10 rapid reactions to exhaust the 3-question/minute budget. Solution: use `RATELIMIT#REACTION#${fingerprint}` as the key; set the ceiling to 10/minute; do NOT apply rate limiting to toggle-off operations (removing a reaction should be free).

3. **Subscription channel flooding under high reaction velocity** — 500 users reacting generates 5,000 writes/minute, each broadcasting to all subscribers; UI thrashing and frame drops follow. Solution: frontend buffers `REACTION_UPDATED` events for 300 ms and applies only the latest count snapshot; `setQueryData` for surgical cache update rather than `invalidateQueries`.

4. **Optimistic UI stale counts during concurrent reactions** — Two users reacting simultaneously produce a visible count jump as the optimistic increment conflicts with the authoritative subscription broadcast. Solution: maintain `localDelta` per `(itemId, emoji)` pair; display `serverCount + localDelta` optimistically; subscription broadcast replaces base count while preserving any in-flight delta.

5. **Fingerprints in subscription payload** — Broadcasting the reactor `SS` Set exposes device fingerprints to all participants, enabling ban circumvention analysis and approaching AppSync's 240 KB message limit. Solution: payload contains only `{ targetId, targetType, emoji, counts: ReactionCounts }` — never include fingerprint arrays.

## Implications for Roadmap

The architecture research provides an explicit 8-step build order with clear dependencies. The natural phase boundary falls between backend (data model + resolver + schema) and frontend (state management + UI). Both phases have well-understood implementation patterns derived directly from the existing codebase.

### Phase 1: Data Model and Backend

**Rationale:** All frontend work depends on the GraphQL schema and Lambda resolver being in place. TypeScript strict mode propagates compile errors from `@nasqa/core` types through every downstream layer — these must exist first. The flat-attribute DynamoDB pattern must be locked before any resolver code is written because reversing it post-deployment requires a full table scan migration.

**Delivers:** Working `react` GraphQL mutation with DynamoDB persistence, real-time subscription broadcast, rate limiting, and ban enforcement. Testable via AppSync console or integration test before any UI exists.

**Addresses:** Rate limiting at 10/minute with separate namespace, ban enforcement, real-time count propagation, one-reaction-per-emoji-per-user dedup

**Avoids:** Pitfall 1 (400 KB item limit — flat attributes, not Sets-on-item), Pitfall 2 (rate limit namespace collision), Pitfall 5 (fingerprints in payload), Anti-Pattern 2 (separate subscription channel)

**Build sequence within this phase:**

1. Core types (`@nasqa/core/src/types.ts`) — `ReactionCounts` interface, `reactions` field on `Question`/`Reply`, `REACTION_UPDATED` in `SessionEventType` enum
2. GraphQL schema (`infra/schema.graphql`) — `ReactionCounts` type, `react` mutation, `REACTION_UPDATED` enum value, add `react` to `@aws_subscribe` list
3. Lambda resolver (`packages/functions/src/resolvers/reactions.ts`) — ban check, rate limit with separate namespace, DynamoDB flat-attribute ADD/DELETE, REACTION_UPDATED payload (counts only, no fingerprints)
4. Server Action (`packages/frontend/src/actions/reactions.ts`) — thin wrapper calling `appsyncMutation(REACT, args)`; REACT mutation string in `mutations.ts`

### Phase 2: Frontend State and UI

**Rationale:** Depends on Phase 1 schema and resolver being deployed. The optimistic update strategy (`localDelta`) must be designed into the reducer before any hook or component code is written — retrofitting it after the fact requires rewriting the entire frontend state layer.

**Delivers:** `ReactionBar` component integrated into `QuestionCard` and `ReplyCard` with optimistic toggle, real-time count updates, 300 ms subscription event debounce, ARIA labels with i18n, and 44 px mobile touch targets.

**Addresses:** Full P1 feature set — optimistic UI, per-item reactions on questions and replies, inline count display (hidden at 0), toggle on/off, mobile accessibility. P2 accessibility labels.

**Avoids:** Pitfall 3 (subscription flooding — 300 ms event debounce), Pitfall 4 (optimistic stale counts — `localDelta` strategy), Pitfall 7 (emoji library bundle violation — native emoji only), Pitfall 8 (missing ARIA — `aria-label` + `aria-pressed` from day one), Pitfall 9 (44 px touch targets — mobile-first sizing), Pitfall 10 (full-list re-render — `setQueryData` surgical update)

**Build sequence within this phase:** 5. State reducer (`use-session-state.ts`) — `ADD_REACTION_OPTIMISTIC` and `REACTION_UPDATED` action cases; `localDelta` pattern 6. `useFingerprint` extension + `useReactions` hook — localStorage gate with lazy per-item loading, optimistic dispatch, Server Action call 7. Subscription handler (`use-session-updates.ts`) — `REACTION_UPDATED` case with 300 ms debounce and `setQueryData` surgical update 8. `ReactionBar` component (`reaction-bar.tsx`) — fixed palette, toggle state display, ARIA labels with `aria-pressed`, `role="group"`, 44 px touch targets; integrate into `QuestionCard` and `ReplyCard`

### Phase Ordering Rationale

- **Phase 1 before Phase 2**: TypeScript strict mode means the frontend will not compile without the `@nasqa/core` type additions. The AppSync schema must be deployed for the Server Action to call a valid mutation.
- **Data model decision first within Phase 1**: The flat-attribute pattern is the single most consequential architectural choice in v1.2. Changing it post-deployment requires a DynamoDB migration scan. No code is written until this is settled.
- **Optimistic strategy before UI in Phase 2**: `useReactions` orchestrates `useFingerprint`, `useSessionState`, and the Server Action — it must be designed before the component that calls it. The `localDelta` pattern is an architectural decision that flows through the entire layer.
- **Accessibility from initial component (not bolted on)**: `aria-label` + `aria-pressed` + `role="group"` + 44 px touch targets must be in the `ReactionBar` from the first commit; retrofitting accessible semantics onto interactive emoji buttons creates rework and is error-prone.

### Research Flags

**Phases with well-documented patterns — skip additional research:**

- **Phase 1 (backend)**: Every pattern is a direct extension of the existing `upvoteQuestion` resolver. Resolver structure, DynamoDB expressions, AppSync schema conventions, and subscription wiring are established in the live codebase. No novel territory.
- **Phase 2 (frontend)**: TanStack Query surgical update patterns, React optimistic UI, and `useFingerprint` localStorage extension are thoroughly documented. Component structure mirrors existing `QuestionCard` patterns.

**No phases require `/gsd:research-phase` during planning.** ARCHITECTURE.md already provides exact file-level change lists, TypeScript interfaces, reducer cases, DynamoDB expressions, and build order. This is the most implementation-ready research output in the project's history.

## Confidence Assessment

| Area         | Confidence                                                                                                                                                                      | Notes                                                                                                                                                                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stack        | HIGH                                                                                                                                                                            | All versions verified from live `package.json` files. No version guessing. No new dependencies required.                                                                                                                                                      |
| Features     | MEDIUM (competitive UX) / HIGH (implementation specifics)                                                                                                                       | Competitive analysis via platform docs for Slido, Mentimeter, Pigeonhole, Zoom. No Context7 coverage for live Q&A reaction UX patterns. Implementation specifics (DynamoDB/AppSync patterns) are HIGH — mirrors existing upvote system already in production. |
| Architecture | HIGH                                                                                                                                                                            | All integration points derived from direct source code analysis of the existing codebase. Exact file paths, TypeScript interfaces, reducer cases, DynamoDB expressions, and build order provided.                                                             |
| Pitfalls     | HIGH for DynamoDB/AppSync limits (official docs verified); MEDIUM for rate-limiting edge cases and subscription debounce thresholds (community sources, multiple corroborating) |                                                                                                                                                                                                                                                               |

**Overall confidence:** HIGH

### Gaps to Address

- **Subscription debounce threshold**: 300 ms is the recommended frontend event buffer, but the right value depends on observed reaction velocity in real sessions. Treat as the starting point; tune after the first production session with >100 participants.
- **AppSync subscription cost at scale**: At 500 subscribers × 5,000 reactions/minute, AppSync charges ~$2.50/minute per session ($1.00/million messages). Acceptable for current target audience; monitor in CloudWatch if session sizes grow materially. Server-side coalescing (batch broadcasts per 500 ms window) is the mitigation if costs exceed expectations.
- **Toggle-off UX confirmation**: No surveyed competitor explicitly confirmed their toggle-off behavior for reactions. The "click active reaction to deactivate" model is assumed from GitHub/Slack/Discord patterns. If users in testing expect no toggle-off, the DynamoDB pattern supports both models — this is a UX decision, not an architecture change.
- **Touch target validation**: The 44 px minimum must be validated on real iOS and Android devices, not just browser DevTools mobile emulation. Plan one real-device test pass after Phase 2 completes.

## Sources

### Primary (HIGH confidence)

- Live codebase source code analysis — `packages/functions/src/resolvers/qa.ts`, `packages/frontend/src/hooks/use-fingerprint.ts`, `packages/frontend/src/hooks/use-session-updates.ts`, `infra/schema.graphql`
- DynamoDB UpdateExpression ADD atomicity — https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html#Expressions.UpdateExpressions.ADD
- DynamoDB item size constraints (400 KB limit) — https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Constraints.html
- AppSync real-time subscriptions — https://docs.aws.amazon.com/appsync/latest/devguide/aws-appsync-real-time-data.html
- AppSync subscription message size limit (240 KB) — https://aws.amazon.com/about-aws/whats-new/2024/04/aws-appsync-increases-service-quota-adds-subscription/
- TanStack Query optimistic updates — https://tanstack.com/query/v5/docs/react/guides/optimistic-updates
- WCAG 2.2 Target Size Minimum (2.5.8) — https://a11ypros.com/blog/mobile-accessibility-testing-checklist-2025-edition
- Emoji accessibility best practices — https://www.boia.org/blog/emojis-and-web-accessibility-best-practices

### Secondary (MEDIUM confidence)

- Slido emoji reactions (January 2026 launch) — https://community.slido.com/product-news-announcements-108/what-s-new-in-slido-january-2026-7498
- Mentimeter reactions help center — https://help.mentimeter.com/en/articles/8069507-reactions-from-the-audience
- Pigeonhole Live reactions feature page — https://pigeonholelive.com/features/reactions/
- Zoom webinar reactions — https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0059191
- DynamoDB one-to-many modeling — https://www.alexdebrie.com/posts/dynamodb-one-to-many/
- TanStack Query concurrent optimistic updates — https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query
- DynamoDB race conditions and conditional writes — https://awsfundamentals.com/blog/understanding-and-handling-race-conditions-at-dynamodb
- Ably: Emoji reactions for in-game chat with React — https://ably.com/blog/emojis-for-in-game-chat-with-react

---

_Research completed: 2026-03-15_
_Ready for roadmap: yes_
