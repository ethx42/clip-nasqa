# Phase 9: Reactions Data Model and Backend - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

The `react` GraphQL mutation is live — participants can add and toggle emoji reactions on Questions and Replies, counts are deduplicated per device fingerprint, rate limiting and ban enforcement are active, and reaction updates broadcast to all connected clients via the existing subscription channel. This phase covers data model, mutation resolver, dedup, rate limiting, ban check, and subscription broadcast. The UI (Phase 10) is out of scope.

</domain>

<decisions>
## Implementation Decisions

### Emoji palette identity

- The 6 emojis are final: thumbsup (👍), heart (❤️), party (🎉), laugh (😂), thinking (🤔), eyes (👀)
- Internal keys are short names: `thumbsup`, `heart`, `party`, `laugh`, `thinking`, `eyes`
- EMOJI_PALETTE constant in `@nasqa/core` exports an array of objects: `{ key: string, emoji: string, label: string }` — includes display metadata and accessibility labels
- Array order is canonical display order — Phase 10 renders in palette order, no separate ordering logic
- Zod schema validates emoji arguments against the palette keys

### Toggle & dedup behavior

- No cooldown between toggle-on and toggle-off — instant toggle, 30/min rate limit is sufficient abuse prevention
- Optimistic UI updates on the client side — the backend contract must support this (mutation response enables reconciliation)
- Multiple emojis per item allowed — a participant can react with both 👍 and 😂 on the same question (Slack-style, not Facebook-style)
- Mutation response returns full state: all 6 emoji counts for the item AND whether this fingerprint has reacted to each — client reconciles optimistic state from one response

### DynamoDB storage model

- Flat attributes on Question/Reply items: `rxn_<key>_count` (Number) and `rxn_<key>_reactors` (String Set of fingerprints)
- Atomic updates via DynamoDB update expressions (ADD for sets, SET for counts)
- Rate limit stored as a dedicated item in the same session table: `PK=session, SK=ratelimit#reaction#<fingerprint>` — consistent with existing question rate limit pattern
- Reactions persist through question/reply bans — if the item is hidden, reactions are hidden with it. No cleanup on ban.

### Subscription broadcast shape

- New event type `REACTION_UPDATED` on the existing SessionUpdate subscription channel — distinct from question/reply updates
- Payload includes ALL 6 emoji counts: `{ targetId, targetType, counts: { thumbsup: 5, heart: 2, ... } }`
- No `reactedByMe` field in broadcast — each client tracks its own reaction state locally from mutation responses
- Both toggle-on and toggle-off broadcast a REACTION_UPDATED event — all clients stay in sync

### Claude's Discretion

- Whether reaction data is included in initial question load or lazy-fetched (decide based on payload size and existing read patterns)
- Exact DynamoDB update expression patterns
- Lambda resolver internal structure and error handling patterns

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Follow existing Lambda resolver patterns established in Phase 7.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 09-reactions-data-model-and-backend_
_Context gathered: 2026-03-16_
