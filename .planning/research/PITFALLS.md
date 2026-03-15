# Pitfalls Research

**Domain:** Emoji reactions on Q&A in real-time presentation tool — adding reactions to an existing Next.js + DynamoDB + AppSync system
**Researched:** 2026-03-15
**Confidence:** HIGH for DynamoDB and AppSync limits (official docs verified); HIGH for React optimistic update patterns (Context7/official docs verified); MEDIUM for rate-limiting edge cases and UX patterns (community sources, multiple corroborating)

---

## Critical Pitfalls

Mistakes that cause silent data corruption, item write failures, or subscription storms when bolting emoji reactions onto an existing real-time Q&A system.

---

### Pitfall 1: Storing Reactor Fingerprints on the Question/Reply Item Violates the 400KB DynamoDB Limit

**What goes wrong:**
The existing `upvoteQuestion` resolver stores voter deduplication in a `voters` SS (String Set) attribute directly on the Question item. Copying this pattern for reactions — adding a `reactor_<emoji>` SS attribute per emoji type — means each item accretes one fingerprint string per reactor per emoji. At 500 participants reacting with all 6 emojis, a single Question item could accumulate 3,000 fingerprint strings (~50-100 bytes each), pushing the item toward or past DynamoDB's hard 400KB item size limit. When the item exceeds 400KB, DynamoDB rejects the write with `ValidationException: Item size has exceeded the maximum allowed size`, causing all reaction mutations to silently fail for popular questions.

**Why it happens:**
The existing vote system stores `voters` as a Set on the item because the total voter deduplication set is bounded by connected participants (~500 max), and only one vote type exists. With 6 emoji types each maintaining a full Set of reactors, the multiplier blows the same budget. Developers copy the working vote pattern without accounting for the 6x amplification.

**How to avoid:**
Do NOT store reactor fingerprints per-emoji on the Question/Reply item itself. Use one of two patterns:

Option A (preferred — separate item per reaction): Model each reaction as a separate DynamoDB item with PK: `SESSION#slug`, SK: `REACTION#questionId#emoji#fingerprint`. The Question/Reply item only stores aggregate counts as a Map attribute: `reactionCounts: { "👍": 3, "❤️": 12 }`. Deduplication is enforced via the unique SK (a second PUT with the same SK is a no-op if the fingerprint already exists, or use a conditional expression).

Option B (acceptable for small scale): Keep one `reactors` SS on the item but scope it as a global dedup set (any reaction by fingerprint counts once). This caps item growth at max connected participants × 1 fingerprint, matching the vote pattern. Loses per-emoji dedup granularity.

For Nasqa Live's 50-500 participant scale, Option A is the right choice. It also makes it trivial to load aggregate counts without scanning reactor sets.

**Warning signs:**

- Popular questions stop accepting reactions silently (DynamoDB `ValidationException` swallowed in resolver error handler)
- `ReturnValues: "ALL_NEW"` on update returning smaller count than expected
- CloudWatch Lambda error logs showing `Item size has exceeded maximum allowed size`

**Phase to address:** Phase 1 (DynamoDB schema and resolver design) — the data model must be decided before writing any resolver code

---

### Pitfall 2: The Existing `voters` Set Will Conflict if Reaction Dedup Is Added to the Same Item

**What goes wrong:**
The existing `upvoteQuestion` mutation stores `voters` (a SS attribute) on the Question item. If the reactions implementation also attempts to add a `voters` or `reactors` Set to the same item, the two systems will share or collide on the same attribute namespace. Worse, if reaction dedup is added naively as a second attribute on the Question item alongside the upvote `voters` Set, any future migration that needs to separate them requires a full table scan to rewrite items. Additionally, the existing `upvoteQuestion` UpdateExpression uses `ADD ... DELETE voters :fpSet` — mixing Set operations across two different interaction types on the same item creates concurrent write contention (both vote and reaction mutations could be in-flight simultaneously on the same item, each attempting a conditional SET operation).

**Why it happens:**
Reactions feel like "another kind of vote" and developers reach for the same DynamoDB item as the natural home. The existing schema has no explicit separation between voting state and reaction state.

**How to avoid:**
Model reactions as entirely separate DynamoDB items (separate SK prefix: `REACTION#`). The Question item retains its existing `voters`, `upvoteCount`, `downvoteCount` attributes with zero modification. Reaction counts are a separate `reactionCounts` Map attribute OR are derived from separate REACTION# items. This ensures:

- Zero risk of concurrent write contention between vote and reaction mutations on the same item
- Existing vote tests pass without modification
- Reaction data can be cleared, migrated, or extended independently

**Warning signs:**

- The reaction resolver touches the same DynamoDB Key (PK + SK) as `upvoteQuestion`
- `ConditionalCheckFailedException` rate rising on upvote mutations after reactions are deployed
- Unit tests for upvoteQuestion starting to fail after reaction code merges

**Phase to address:** Phase 1 (schema design review) — the resolver must never write to the same item key as an existing mutation without explicit coordination

---

### Pitfall 3: Reaction Updates Flood the AppSync Subscription Channel

**What goes wrong:**
The existing `onSessionUpdate` subscription fires for every mutation listed in the `@aws_subscribe` directive. If `reactToItem` is added to that list, each reaction click by any participant triggers a WebSocket broadcast to all 50-500 connected clients. A session with 200 participants where each reacts to a popular question generates 200 subscription messages in rapid succession, each containing the full `SessionUpdate` payload. AppSync charges per 5KB of outbound subscription data and has a default limit of 1,000 outbound messages per second per API. In practice, the problem is UI thrashing: every client's React tree re-renders on each incoming subscription event, causing jank and dropped frames in the question feed when reaction events flood in.

**Why it happens:**
The union-type single-channel subscription is an intentional architecture decision for simplicity, and it works well for low-frequency events (snippets, questions, replies). Reactions are fundamentally higher frequency — they are designed to be clicked repeatedly and quickly. Treating them identically to "QUESTION_ADDED" events mismatches the frequency assumption of the subscription design.

**How to avoid:**

- Keep reaction mutations on the subscription channel (it is the right channel) but debounce the broadcast on the server side: the reaction resolver should coalesce rapid reaction updates for the same `(questionId, emoji)` pair within a 500ms window before publishing the subscription event. The Lambda resolver can use DynamoDB's `UpdateItem` with `ReturnValues: "ALL_NEW"` to get the latest aggregate count after any number of updates, then publish only one subscription event per debounce window. (Note: debouncing in Lambda requires a short-lived cache or conditional TTL logic — simplest approach is: only broadcast if the count changed by >= 1 and at least 500ms has passed since the last broadcast for that item.)
- Alternatively, on the frontend, debounce subscription event processing for `REACTION_UPDATED` events specifically: buffer incoming events for 300ms and apply only the latest count, rather than re-rendering on every event.
- Keep the `payload` for reaction events minimal: only `{ questionId, replyId, emoji, count }` — never include the full reactor fingerprint list.

**Warning signs:**

- React DevTools Profiler showing dozens of re-renders per second during a reaction burst
- AppSync subscription message count in CloudWatch spiking 10x above baseline when reactions are added
- UI frame rate dropping below 30fps during reaction activity in Chrome Performance tab

**Phase to address:** Phase 1 (resolver design) and Phase 2 (frontend subscription handler) — the payload shape must be defined before frontend integration

---

### Pitfall 4: Optimistic UI Produces Stale Counts When Two Users React Simultaneously

**What goes wrong:**
The existing vote system applies optimistic UI by immediately incrementing a local counter and rolling back on error. For reactions, this pattern has a subtle flaw: if User A and User B both react with "👍" at the same moment, User A's optimistic state shows count=1, the server resolves both reactions atomically to count=2, and the subscription broadcast delivers count=2 to both clients. User A's TanStack Query cache holds the optimistic count=1. When the query invalidation triggers a refetch, the cache snaps from 1 to 2 — this is a visible count jump that contradicts the optimistic update. For the vote system this is acceptable because votes are rare. For reactions in a popular session this can happen dozens of times per minute.

**Why it happens:**
Optimistic updates assume the local state IS the server state until confirmed. In a multi-user real-time system, the server state is being mutated by other clients concurrently. The optimistic update correctly reflects the local user's action, but the subscription channel continuously delivers ground truth that conflicts with it.

**How to avoid:**
Use a "last-write-wins with subscription merge" strategy:

- On the frontend, maintain a `localDelta` for each `(itemId, emoji)` pair rather than an absolute count. Display `serverCount + localDelta` optimistically.
- When a `REACTION_UPDATED` subscription event arrives, apply `serverCount` from the event to the base count and reset `localDelta` to 0 (if the mutation has completed) or keep `localDelta` intact (if the mutation is still in-flight).
- Never revert the subscription-delivered count to the pre-reaction state during rollback — only revert the `localDelta`.

TanStack Query's `cancelQueries` + `setQueryData` pattern from the existing vote system is correct for the "prevent stale override" part, but the subscription handler must be aware of in-flight mutations and not overwrite optimistic state with a subscription event that arrived before the mutation resolved.

**Warning signs:**

- Reaction counts visibly "jumping" during active sessions (up 1 then down 1 then up 2)
- TanStack Query devtools showing frequent cache invalidations for reaction-bearing items during load testing
- User reports that their reaction "disappeared" and then "came back" in the UI

**Phase to address:** Phase 2 (frontend optimistic update implementation) — requires a deliberate state merging strategy before any optimistic code is written

---

### Pitfall 5: Rate Limiting Reactions Using the Same Bucket as Questions Creates Unintended Cross-Throttling

**What goes wrong:**
The existing `checkRateLimit` function keys its DynamoDB bucket on the fingerprint alone: `RATELIMIT#${fingerprint}` + `BUCKET#${bucket}`. If reaction mutations are added to the same rate limiter with the same key pattern, a participant who reacts quickly (6 emojis in 6 seconds) consumes rate limit budget shared with their ability to ask questions. The inverse is also true: a participant who asks 3 questions in a minute (hitting the 3/min question limit) cannot react to anything for the rest of that minute. This is not the intended behavior — reactions should have an independent, higher-frequency rate limit.

Additionally, the existing rate limiter is a "count per window" bucket. For toggle behavior (react + unreact), an attacker can rapidly toggle a reaction on/off to inflate the subscription broadcast count without actually consuming rate limit budget (toggle-off is a remove, which the current logic counts the same as a toggle-on). 10 rapid toggles = 10 subscription events to all connected clients.

**Why it happens:**
Reactions look like another action by the participant, so developers pass `fingerprint` as the rate limit key and reuse `checkRateLimit`. The semantic difference (reactions are higher-frequency, toggleable, and have different abuse profiles) is not obvious until load testing.

**How to avoid:**

- Use a separate rate limit key namespace for reactions: `RATELIMIT#REACTION#${fingerprint}` instead of `RATELIMIT#${fingerprint}`.
- Set a higher limit for reactions (e.g., 30 reactions/minute vs 3 questions/minute).
- For toggle-off (unreact) operations: do NOT call `checkRateLimit` at all — removing a reaction should be free. Only rate-limit adding reactions.
- Add a short per-item cooldown: a participant cannot react to the same `(itemId, emoji)` more than once per 10 seconds. This prevents rapid-toggle abuse without penalizing normal use. Enforce via a conditional DynamoDB expression on the REACTION# item's `createdAt` timestamp.

**Warning signs:**

- Users reporting "can't ask questions" after reacting to several items in quick succession
- Rate limit errors appearing in the console during normal reaction use
- Load test showing that 6 rapid reactions blocks the question submission UI

**Phase to address:** Phase 1 (resolver design) — the rate limit key and logic must be defined before the resolver is written

---

### Pitfall 6: Reaction Subscription Events Contain the Full `payload` JSON Including Fingerprints — Privacy and Size Issue

**What goes wrong:**
The existing `upvoteQuestion` resolver returns `payload: JSON.stringify({ questionId, upvoteCount: newUpvoteCount })` — only aggregate counts, no fingerprints. If a reaction resolver naively returns `payload: JSON.stringify({ questionId, emoji, reactors: [...fingerprints] })` to let clients derive counts from the Set, every subscriber receives every reactor's fingerprint. In a session context, fingerprints are the only identity token participants have — broadcasting them in subscription events means any participant can harvest all other participants' device fingerprints from WebSocket frames, enabling targeted ban circumvention analysis and privacy violation.

Even ignoring privacy: at 500 participants each with a 36-character fingerprint UUID, the reactors array alone is 18KB per emoji type × 6 emojis = 108KB per payload. AppSync's documented maximum outbound message size is 240KB (raised from 128KB in 2024). A full reactor-list payload approaches that limit.

**Why it happens:**
Developers want clients to be able to compute counts AND dedup state locally without a refetch. Sending the full reactor set seems efficient. The privacy implication of broadcasting device fingerprints is non-obvious.

**How to avoid:**

- Reaction subscription payloads MUST only contain aggregate counts: `{ questionId, replyId, emoji, count, userHasReacted: boolean }`.
- The `userHasReacted` boolean is computed server-side per subscriber (if using AppSync enhanced subscription filters with Lambda resolvers) OR derived client-side from localStorage (if the client tracks its own reactions).
- For Nasqa Live: the client tracks its own reactions in localStorage (same pattern as upvotes). The payload only needs `{ itemId, emoji, count }`.
- Never put fingerprints in the subscription payload.

**Warning signs:**

- Subscription payload JSON containing a `reactors` or `fingerprints` array
- Browser Network tab showing WebSocket frames > 10KB for reaction events
- Privacy audit flagging device fingerprint exposure in subscription channel

**Phase to address:** Phase 1 (resolver design) — the payload schema is defined when the resolver is written

---

### Pitfall 7: Emoji Rendering Bundle Budget Violation

**What goes wrong:**
The project has a hard constraint: initial JS payload < 80KB gzipped. The 6-emoji fixed palette uses native OS emoji (rendered by the browser as text). This is zero bundle cost. However, if any developer adds an emoji rendering library (twemoji, emoji-mart, EmojiButton, etc.) to "ensure consistent cross-platform appearance," the bundle cost is immediate and severe: twemoji adds ~30-80KB gzipped, emoji-mart adds ~100-200KB gzipped. Either addition would push the page over the 80KB budget.

Cross-platform emoji inconsistency (Android vs iOS vs Windows renders the same emoji differently) is a real concern that makes these libraries tempting. The constraint must be documented as a deliberate decision or the library will appear in a PR.

**Why it happens:**
Native emoji rendering produces visually inconsistent output across platforms. Developers see this inconsistency during testing on different devices and reach for an image-based emoji library to normalize appearance. The bundle impact is not checked until CI runs the bundle analyzer.

**How to avoid:**

- Explicitly document that native emoji rendering is required. No emoji libraries. No SVG sprite sheets for emoji.
- Use native emoji characters as `button` content with an `aria-label` attribute describing the reaction. The visual rendering is intentionally platform-native.
- Add a bundle size CI check (already planned in v1.1) that fails if the initial JS payload exceeds 80KB gzipped. This is the enforcement mechanism.
- If visual consistency becomes a product requirement in a future milestone, the correct approach is a self-hosted SVG sprite (not a library), with per-emoji SVGs of the specific emojis only (~2-3KB total for 6 emojis at ~400-500 bytes each compressed).

**Warning signs:**

- `import { Emoji } from 'emoji-mart'` or `import twemoji` appearing in any component file
- Bundle size increasing by > 5KB for a "small" reactions feature
- CI bundle check failing after the reactions PR merges

**Phase to address:** Phase 2 (frontend component implementation) — the constraint must be in the component design brief before any code is written

---

### Pitfall 8: `aria-label` Missing or Wrong on Reaction Buttons — Screen Readers Read Raw Emoji Characters

**What goes wrong:**
Reaction buttons that render as `<button>👍</button>` with no `aria-label` cause screen readers to announce the emoji's Unicode description ("thumbs up sign") or nothing at all depending on the OS and screen reader version. The button's purpose is "React with thumbs up (3 reactions)" — the count is the critical missing piece. Additionally, after a user reacts, the button state changes (active/toggled) but if `aria-pressed` is not set, screen readers have no way to convey the "you have reacted" state. This renders the entire reaction system inaccessible to keyboard and screen reader users.

**Why it happens:**
Emoji buttons look "obviously" meaningful visually. The accessible name and state management for interactive emoji elements is a non-trivial concern that is addressed post-implementation or not at all.

**How to avoid:**

- Every reaction button must have: `aria-label="React with [emoji name]: [count] reactions"` and `aria-pressed={userHasReacted}`.
- Update `aria-label` dynamically when count changes: `aria-label="React with thumbs up: 4 reactions"`.
- The reaction count span should be `aria-hidden="true"` (it is redundant with `aria-label`).
- Group the 6 reaction buttons in a `role="group"` with `aria-label="Reactions"` to give screen reader users context.
- All 6 buttons must be keyboard-reachable via Tab and activatable via Enter/Space.
- Use `next-intl` translation keys for the `aria-label` format string so all three locales (en, es, pt) have correct labels.

**Warning signs:**

- `axe-core` or `eslint-plugin-jsx-a11y` flagging empty accessible name on button elements
- Screen reader announcing "Button, 3" (just the count) instead of the full label
- Keyboard Tab navigation skipping over reaction buttons because `<button>` content is only emoji with no accessible name

**Phase to address:** Phase 2 (frontend component implementation) — ARIA attributes must be in the initial component, not bolted on afterward

---

### Pitfall 9: Mobile Touch Targets for Reaction Buttons Are Too Small

**What goes wrong:**
Six emoji reaction buttons displayed in a horizontal row on a question card must each be at least 44×44px to meet WCAG 2.2 success criterion 2.5.8 (Target Size Minimum). In a typical compact Q&A feed layout, reaction buttons are rendered small (24px emoji with 4px padding = ~32×32px) to avoid dominating the card UI. On mobile, participants miss the intended target and accidentally trigger adjacent reactions. The error rate for small touch targets on touch screens is documented; the 44px minimum is specifically for mobile interaction.

**Why it happens:**
Designers size buttons for visual proportion, not touch ergonomics. The buttons look fine on desktop. Mobile testing with touch is often deferred.

**How to avoid:**

- Each reaction button: minimum `min-h-[44px] min-w-[44px]` with `flex items-center justify-center`. Use padding to expand the hit area without enlarging the visual emoji size.
- Alternatively, use a transparent pseudo-element or CSS `::after` to expand the touch target without changing layout.
- Test on a real iOS and Android device, not just browser DevTools mobile emulation. Browser emulation does not replicate touch accuracy.
- Run axe-core in mobile testing mode to flag target size violations.

**Warning signs:**

- Reaction buttons with `h-8 w-8` (32px) or smaller Tailwind classes
- Repeated accidental reactions reported in user testing
- axe-core reporting "Target Size" WCAG 2.5.8 violations

**Phase to address:** Phase 2 (frontend component implementation) — minimum touch target size is a design constraint, not a post-ship fix

---

### Pitfall 10: Reaction Counts Re-render All Questions on Every Subscription Event

**What goes wrong:**
In the current architecture, `getSessionData` returns all questions and replies in a single query. The TanStack Query cache key is likely `['sessionData', sessionSlug]`. When a reaction subscription event arrives, if the handler invalidates the entire `sessionData` cache key, all questions and replies re-render simultaneously — including items with no reaction activity. In a session with 100 questions and 500 participants reacting actively, this means 100 question components re-rendering on every reaction event.

**Why it happens:**
The single-query `getSessionData` pattern is simple and efficient for initial load. It becomes a liability when fine-grained real-time updates need to avoid full-list re-renders. The existing vote system has this same problem, but upvotes are low-frequency (one per participant). Reactions are high-frequency (multiple per participant per item).

**How to avoid:**

- Handle `REACTION_UPDATED` subscription events with surgical cache updates, NOT cache invalidation. Use TanStack Query's `queryClient.setQueryData` to update only the specific item in the cached list:
  ```typescript
  queryClient.setQueryData(["sessionData", sessionSlug], (old) => ({
    ...old,
    questions: old.questions.map((q) =>
      q.id === questionId
        ? { ...q, reactionCounts: { ...q.reactionCounts, [emoji]: newCount } }
        : q,
    ),
  }));
  ```
- Use React `memo` on `QuestionCard` and `ReplyCard` components with a stable props equality check, so only the single updated item re-renders.
- Keep reaction counts as a `Map` attribute on the item (or derived from REACTION# items on initial load) so the data shape supports surgical updates.

**Warning signs:**

- React DevTools Profiler showing all `QuestionCard` components re-rendering when a single reaction fires
- Frame drops visible in the browser when reacting during a session with > 20 questions
- TanStack Query devtools showing full `sessionData` invalidation on every `REACTION_UPDATED` event

**Phase to address:** Phase 2 (frontend subscription handler) — the cache update strategy must be designed before the subscription handler is written

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut                                                            | Immediate Benefit                            | Long-term Cost                                                                 | When Acceptable                                |
| ------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------- |
| Storing reactor fingerprints as a Set on the Question item          | Matches existing vote pattern, simple        | 400KB item limit hit at ~1,000 reactors across 6 emoji types                   | Never — separate REACTION# items from day one  |
| Reusing the same `RATELIMIT#${fingerprint}` key for reactions       | No new code                                  | Questions and reactions share rate budget; reactions block question submission | Never — reactions need their own namespace     |
| Sending full reactor fingerprint list in subscription payload       | Client can compute counts and state locally  | Privacy exposure, payload bloat approaching AppSync 240KB limit                | Never — always send only aggregate counts      |
| Using an emoji library (twemoji, emoji-mart) for visual consistency | Consistent emoji appearance across platforms | Bundle budget violated immediately; breaks 80KB gzip constraint                | Never in v1.2 — native emoji only              |
| Invalidating full `sessionData` cache on reaction events            | Simple, consistent with existing patterns    | All 100 questions re-render on every reaction; frame drops in active sessions  | Only acceptable with < 10 questions in session |
| Skipping `aria-label` and `aria-pressed` on emoji buttons           | Faster initial implementation                | Reaction UI inaccessible to screen reader users; violates WCAG 2.2 AA          | Never — ARIA attributes are not optional       |

---

## Integration Gotchas

Common mistakes when wiring reactions into the existing stack.

| Integration                          | Common Mistake                                                                             | Correct Approach                                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| DynamoDB + reaction dedup            | Adding `reactor_👍` SS attribute on Question item                                          | Separate REACTION# SK items; aggregate counts stored as Map on Question item                                              |
| AppSync schema + reactions           | Adding `reactToItem` to existing `@aws_subscribe` list without testing broadcast frequency | Add to subscription list but implement server-side coalescing or frontend event debouncing                                |
| GraphQL schema + `SessionUpdate`     | Adding a new `eventType` value (`REACTION_UPDATED`) without updating the union enum        | Add `REACTION_UPDATED` to `SessionEventType` enum in `schema.graphql` AND in `@nasqa/core` types before any resolver code |
| Rate limiter + reactions             | Calling `checkRateLimit(fingerprint, 30, 60)` with the existing key pattern                | Use `checkRateLimit('REACTION#' + fingerprint, 30, 60)` — separate namespace                                              |
| TanStack Query + subscription events | `queryClient.invalidateQueries(['sessionData'])` on every reaction event                   | `queryClient.setQueryData` surgical update — never invalidate the full session list for reaction events                   |
| next-intl + reaction `aria-label`    | Hardcoding English strings in `aria-label`                                                 | Define i18n keys for all 6 reaction labels in `@nasqa/core/i18n.ts` and use `useTranslations()`                           |
| Subscription handler + optimistic UI | `setQueryData` from subscription overwriting in-flight optimistic state                    | Check for in-flight mutations before applying subscription updates; use `isMutating` from TanStack Query                  |

---

## Performance Traps

Patterns that work locally but degrade at session load.

| Trap                                                                 | Symptoms                                                                    | Prevention                                                                                        | When It Breaks                                                |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Invalidating full `sessionData` cache on reaction events             | All questions re-render simultaneously; visible frame drops                 | Surgical `setQueryData` for reaction-bearing items only                                           | At > 20 questions + > 50 concurrent reactors                  |
| No debounce on subscription event processing for reactions           | UI re-renders at the rate of incoming WebSocket events (potentially 50/sec) | Buffer `REACTION_UPDATED` events for 200-300ms and apply latest count                             | At > 10 concurrent participants reacting simultaneously       |
| DynamoDB GET to verify fingerprint dedup on every reaction           | Latency doubles for reaction mutations; Lambda timeout risk at scale        | Use conditional PutItem on REACTION# item (fails if duplicate) instead of a GET + conditional PUT | At > 200 reactions/minute on a single session                 |
| Reactor fingerprint Set on Question item growing unbounded           | DynamoDB `ValidationException` on reaction mutations for popular questions  | Separate REACTION# items with dedup enforced by SK uniqueness                                     | At ~1,000 total reactions per question across all emoji types |
| Rendering 6 reaction buttons per question × 100 questions with state | React tree has 600 interactive buttons; initial render slow                 | Defer rendering reaction buttons until a question card is in viewport (Intersection Observer)     | At > 50 questions in the feed                                 |

---

## Security Mistakes

Domain-specific security issues in the reactions feature.

| Mistake                                                   | Risk                                                                                                                    | Prevention                                                                                                                     |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Broadcasting reactor fingerprints in subscription payload | Any participant can harvest all other participants' device fingerprints; enables ban circumvention analysis             | Payload contains only `{ itemId, emoji, count }` — never fingerprints                                                          |
| Not enforcing ban check on reaction mutations             | Banned participants can still react, cluttering the feed and bypassing moderation intent                                | Call `checkNotBanned(sessionSlug, fingerprint)` at the start of the reaction resolver, same as `addQuestion`                   |
| No input validation on emoji type in reaction resolver    | Arbitrary emoji injection into DynamoDB; storage of unexpected characters                                               | Validate `emoji` argument against the fixed allowlist `['👍', '❤️', '🎉', '😂', '🤔', '👀']` using Zod before any DB operation |
| Rate limit toggle abuse (rapid react/unreact)             | 100 toggle events = 100 subscription broadcasts to all clients with no rate limit consumed                              | Apply rate limit to toggle-on only; add per-item cooldown of 10s for re-reaction after toggle-off                              |
| hostSecret not required for reactions                     | No attack vector since reactions are public, but the convention for public mutations is consistent fingerprint tracking | Use fingerprint + ban check as the auth pattern; hostSecret is not needed for reactions                                        |

---

## UX Pitfalls

User experience mistakes specific to reactions in a live session Q&A context.

| Pitfall                                                               | User Impact                                                                                                     | Better Approach                                                                                                                 |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| No visual distinction between "you reacted" vs "others reacted"       | Users cannot tell if they already reacted; double-tap causes confused toggle                                    | Highlighted/filled button state when `userHasReacted === true`; persist per `(fingerprint, itemId, emoji)` in localStorage      |
| Reaction counts updating too aggressively (every event)               | Numbers flickering rapidly during popular sessions; visually distracting                                        | Debounce count display updates by 300ms — show the latest count after a brief quiet period                                      |
| Reaction buttons visible but disabled during session load             | Users click reactions before WebSocket is connected; mutation fires but subscription confirmation never arrives | Show reaction buttons only after subscription connection is confirmed; use connection state from the existing WebSocket context |
| `aria-live` announcing every count increment during a popular session | Screen reader reads "4 reactions, 5 reactions, 6 reactions" continuously                                        | Debounce `aria-live` announcements for reaction counts; announce at most once per 2 seconds per item                            |
| No i18n for reaction tooltip/aria-label format                        | en/es/pt users see English-only accessible labels                                                               | Add i18n keys `reactions.thumbsUp`, `reactions.heart`, etc. in `@nasqa/core/i18n.ts`; use in `aria-label` format string         |
| Reactions allowed on banned/hidden questions                          | Audiences react to content that is community-moderated as problematic                                           | Hide reaction buttons on `isHidden === true` and `isBanned === true` items; do not render the interaction affordance at all     |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces — specific to reactions integration.

- [ ] **DynamoDB schema:** Reaction REACTION# items created but aggregate `reactionCounts` Map not backfilled on Question/Reply items — `getSessionData` returns items with no `reactionCounts` key, causing undefined errors in the frontend count display.
- [ ] **GraphQL schema:** `REACTION_UPDATED` event type added to `schema.graphql` but NOT added to `SessionEventType` enum in `@nasqa/core/src/types.ts` — TypeScript compile passes but runtime events are `unknown` type.
- [ ] **Subscription list:** `reactToItem` mutation added to `@aws_subscribe(mutations: [...])` in the schema but the mutation was not actually deployed via `sst deploy` — subscription silently ignores reaction events.
- [ ] **Rate limiting:** Reaction resolver calls `checkRateLimit` but does NOT call `checkNotBanned` — banned participants can still flood reactions.
- [ ] **Optimistic UI:** Reaction buttons show optimistic count but do NOT persist `userHasReacted` to localStorage — page refresh causes the button to show "not reacted" even though the server has the reaction recorded.
- [ ] **Emoji validation:** Resolver accepts any string as `emoji` argument — Zod validation not added, allowing arbitrary character injection.
- [ ] **Touch targets:** Reaction button renders correctly on desktop but is 32×32px on mobile — the 44px minimum was not applied to the mobile breakpoint.
- [ ] **aria-label:** `aria-label` is static ("React with thumbs up") but does not include the current count or the user's reaction state — screen readers cannot convey reaction totals or toggle state.
- [ ] **i18n:** `aria-label` strings hardcoded in English in the component — es/pt locales receive English labels.
- [ ] **Reactions on hidden items:** Reaction buttons render on `isHidden === true` questions — the conditional render guard was not added.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall                                                               | Recovery Cost | Recovery Steps                                                                                                                                                                                     |
| --------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reactor fingerprints stored on Question item, approaching 400KB limit | HIGH          | Write a DynamoDB migration script to extract fingerprints from Question items into separate REACTION# items; update resolvers; backfill aggregate counts; requires downtime or double-write period |
| Rate limit namespace collision with questions                         | LOW           | Deploy updated resolver with separate `RATELIMIT#REACTION#` key; existing rate limit counters expire naturally within 1 minute                                                                     |
| Subscription flooding all clients with reaction events                | MEDIUM        | Add debounce logic in Lambda resolver; redeploy; optionally add frontend event buffer as immediate mitigation before resolver deploy                                                               |
| Full `sessionData` cache invalidation causing re-renders              | LOW           | Update subscription handler to use `setQueryData` surgical update; deploy frontend update                                                                                                          |
| Emoji library accidentally added, bundle size exceeded                | MEDIUM        | Remove library, replace with native emoji, adjust styling; re-run bundle analysis to confirm budget compliance                                                                                     |
| Fingerprints exposed in subscription payload                          | HIGH          | Hotfix resolver to strip fingerprints from payload; rotate fingerprint tokens for affected sessions (sessions are 24h TTL — natural expiry limits blast radius)                                    |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall                                                                    | Prevention Phase                                      | Verification                                                                                                            |
| -------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Reactor fingerprints on Question item violate 400KB limit (Pitfall 1)      | Phase 1: DynamoDB schema design                       | Write a test that simulates 500 participants reacting with all 6 emojis; confirm Question item size stays under 50KB    |
| Reaction dedup collides with existing `voters` Set (Pitfall 2)             | Phase 1: Resolver design review                       | Confirm reaction resolver NEVER touches the same DynamoDB Key as `upvoteQuestion`; unit test both resolvers in parallel |
| Reaction subscription events flood the channel (Pitfall 3)                 | Phase 1 (payload shape) + Phase 2 (frontend debounce) | Load test with 100 concurrent reactors; measure subscription message rate in CloudWatch                                 |
| Optimistic UI stale counts from concurrent reactions (Pitfall 4)           | Phase 2: Frontend subscription handler design         | Test with two browser windows reacting simultaneously; counts must converge without visible flicker                     |
| Rate limit namespace collision between questions and reactions (Pitfall 5) | Phase 1: Resolver implementation                      | Verify reacting 30 times does not trigger RATE_LIMIT_EXCEEDED on question submission                                    |
| Fingerprints in subscription payload (Pitfall 6)                           | Phase 1: Resolver payload schema                      | Assert in resolver unit tests that `payload` JSON never contains a `fingerprint`, `reactors`, or `voters` key           |
| Emoji library violating 80KB bundle budget (Pitfall 7)                     | Phase 2: Frontend component PR review                 | Bundle size CI check must pass; no emoji library imports permitted                                                      |
| Missing ARIA on reaction buttons (Pitfall 8)                               | Phase 2: Frontend component implementation            | axe-core scan returns zero violations for reaction button elements; keyboard navigation test passes                     |
| Mobile touch targets too small (Pitfall 9)                                 | Phase 2: Frontend component implementation            | Real device test on iOS and Android; all 6 buttons must have >= 44px hit area                                           |
| Full session re-render on reaction events (Pitfall 10)                     | Phase 2: Subscription handler                         | React Profiler during load test; only the reacted item's component should highlight as re-rendered                      |

---

## Sources

- DynamoDB item size constraints — 400KB limit including attribute names (verified, HIGH confidence): https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Constraints.html
- DynamoDB limits overview — practical implications of the 400KB limit (MEDIUM confidence): https://www.alexdebrie.com/posts/dynamodb-limits/
- DynamoDB one-to-many modeling — separate items vs. nested Sets for unbounded relationships (HIGH confidence): https://www.alexdebrie.com/posts/dynamodb-one-to-many/
- AppSync subscription message size limit — 240KB maximum outbound payload per message (verified, MEDIUM confidence): https://aws.amazon.com/about-aws/whats-new/2024/04/aws-appsync-increases-service-quota-adds-subscription/
- AppSync real-time subscriptions documentation — connection and throughput limits (HIGH confidence): https://docs.aws.amazon.com/appsync/latest/devguide/aws-appsync-real-time-data.html
- TanStack Query optimistic updates — concurrent mutation handling and `setQueryData` (HIGH confidence): https://tanstack.com/query/v5/docs/react/guides/optimistic-updates
- TanStack Query concurrent optimistic updates blog (MEDIUM confidence): https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query
- DynamoDB race conditions and conditional writes (MEDIUM confidence): https://awsfundamentals.com/blog/understanding-and-handling-race-conditions-at-dynamodb
- Emoji accessibility best practices — `aria-label` requirements for emoji buttons (HIGH confidence): https://www.boia.org/blog/emojis-and-web-accessibility-best-practices
- WCAG 2.2 Target Size Minimum (2.5.8) — 44×44px mobile touch target requirement (HIGH confidence): https://a11ypros.com/blog/mobile-accessibility-testing-checklist-2025-edition
- AppSync enhanced subscription filtering — limits and field restrictions (HIGH confidence): https://docs.aws.amazon.com/appsync/latest/devguide/aws-appsync-real-time-enhanced-filtering.html

---

_Pitfalls research for: emoji reactions on Q&A in a real-time Next.js + DynamoDB + AppSync presentation session tool_
_Researched: 2026-03-15_
