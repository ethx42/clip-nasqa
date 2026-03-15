# Architecture Research: Emoji Reactions (v1.2)

**Domain:** Emoji reactions on Q&A items in an existing real-time Next.js + AppSync + DynamoDB app
**Researched:** 2026-03-15
**Confidence:** HIGH — all integration points derived directly from source code analysis of the existing codebase

---

## Context: What Already Exists

This document is integration-focused research for v1.2 reactions. It does not re-document the base architecture (see `.planning/codebase/ARCHITECTURE.md`). It answers: "What exactly changes, what exactly is new, and in what order do we build it?"

The existing system's reaction-adjacent pattern to mirror:

```
DynamoDB (Question item)
  voters       SS (String Set) — upvote dedup
  downvoters   SS (String Set) — downvote dedup
  upvoteCount  N
  downvoteCount N

Lambda resolver (upvoteQuestion)
  ADD upvoteCount :delta, voters :fpSet
  ConditionExpression: NOT contains(voters, :fp)

Frontend (useFingerprint hook)
  localStorage key: votes:{sessionSlug}     → JSON array of questionIds
  localStorage key: downvotes:{sessionSlug} → JSON array of questionIds

Frontend (useSessionState reducer)
  QUESTION_UPDATED action carries upvoteCount / downvoteCount

AppSync schema
  upvoteQuestion / downvoteQuestion mutations → QUESTION_UPDATED event
```

Reactions must slot into every layer of this exact pattern, with extensions for:

- Both Questions and Replies (votes are Questions-only today)
- 6 emoji slots instead of 1 binary vote
- Per-emoji counts surfaced to the UI (votes only surface a count total)

---

## System Overview: Reactions Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                   │
│                                                                   │
│  ReactionBar component (NEW)                                      │
│    ↓ onClick(emoji)                                               │
│  useReactions hook (NEW)                                          │
│    ↓ checks localStorage reacted:{sessionSlug}:{targetId}         │
│    ↓ dispatches ADD_REACTION_OPTIMISTIC to reducer                │
│    ↓ calls reactAction (Server Action, NEW)                       │
│                                                                   │
│  useSessionState reducer (MODIFIED)                               │
│    ADD_REACTION_OPTIMISTIC — immediate local update               │
│    REACTION_UPDATED        — authoritative update from sub        │
│                                                                   │
│  useSessionUpdates hook (MODIFIED)                                │
│    case "REACTION_UPDATED": dispatch REACTION_UPDATED             │
└──────────────────┬───────────────────────────────────────────────┘
                   │ Server Action HTTP POST
┌──────────────────▼───────────────────────────────────────────────┐
│                   NEXT.JS SERVER ACTION                           │
│  reactAction({ sessionSlug, targetId, targetType, emoji, fp })   │
│    → appsyncMutation(REACT, args)                                 │
└──────────────────┬───────────────────────────────────────────────┘
                   │ GraphQL mutation
┌──────────────────▼───────────────────────────────────────────────┐
│                   APPSYNC + LAMBDA                                │
│                                                                   │
│  react mutation → reactResolver Lambda                            │
│    checkNotBanned(sessionSlug, fingerprint)                       │
│    checkRateLimit(fingerprint, 10, 60)   ← 10 reactions/min      │
│    DynamoDB UpdateCommand:                                        │
│      ADD reactions.👍Count :delta                                  │
│      ADD/DELETE reactions.👍reactors :fpSet                        │
│    returns SessionUpdate {                                        │
│      eventType: REACTION_UPDATED,                                 │
│      payload: { targetId, targetType, emoji, counts, reacted }    │
│    }                                                              │
└──────────────────┬───────────────────────────────────────────────┘
                   │ AppSync subscription broadcast
┌──────────────────▼───────────────────────────────────────────────┐
│               ALL CONNECTED CLIENTS                               │
│  onSessionUpdate → REACTION_UPDATED event                         │
│    dispatch REACTION_UPDATED to reducer                           │
│    UI re-renders ReactionBar with new counts                      │
└──────────────────────────────────────────────────────────────────┘
```

---

## DynamoDB Storage Pattern

### Recommended: Flat Attribute Per Emoji (not a Map)

Two options exist. The flat attribute approach is recommended.

**Option A (recommended): Flat attributes per emoji on the item**

```
Question / Reply DynamoDB item gains these new attributes:

reactions_👍_count    N   (atomic counter, default 0)
reactions_❤️_count    N
reactions_🎉_count    N
reactions_😂_count    N
reactions_🤔_count    N
reactions_👀_count    N
reactions_👍_reactors SS  (String Set of fingerprints)
reactions_❤️_reactors SS
reactions_🎉_reactors SS
reactions_😂_reactors SS
reactions_🤔_reactors SS
reactions_👀_reactors SS
```

**Option B (not recommended): DynamoDB Map attribute**

```
reactions: {
  M: {
    "👍": { M: { count: { N: "3" }, reactors: { SS: ["fp1", "fp2"] } } }
  }
}
```

**Why Option A over Option B:**

DynamoDB's `ADD` operation (used for atomic counter increments) works on top-level number attributes or elements of a Set. It does NOT work on nested Map values. Using a Map would require a `SET reactions.#emoji.#count = reactions.#emoji.#count + :delta` expression — which is NOT atomic; it's a read-modify-write that requires a ConditionExpression to be safe at scale.

Flat attributes allow the same `ADD reactions_👍_count :delta` + `ADD/DELETE reactions_👍_reactors :fpSet` pattern already proven in the existing `upvoteQuestion` resolver. This is a direct reuse of a battle-tested pattern.

**Attribute naming:** Use `reactions_[emoji]_count` and `reactions_[emoji]_reactors`. DynamoDB attribute names support Unicode, so `reactions_👍_count` is valid. However, because emoji in attribute names requires ExpressionAttributeNames escaping on every query, a safer convention is to use the emoji name: `reactions_thumbsup_count`, `reactions_heart_count`, etc. This avoids any edge cases with Unicode in DynamoDB expression tokenization.

**Recommended safe names:**

| Emoji | Count Attr           | Reactors Attr           |
| ----- | -------------------- | ----------------------- |
| 👍    | `rxn_thumbsup_count` | `rxn_thumbsup_reactors` |
| ❤️    | `rxn_heart_count`    | `rxn_heart_reactors`    |
| 🎉    | `rxn_party_count`    | `rxn_party_reactors`    |
| 😂    | `rxn_laugh_count`    | `rxn_laugh_reactors`    |
| 🤔    | `rxn_think_count`    | `rxn_think_reactors`    |
| 👀    | `rxn_eyes_count`     | `rxn_eyes_reactors`     |

**TTL:** Reactions live on Question and Reply items. They inherit the item's existing TTL — no new TTL management needed.

**Impact on initial load (`getSessionData` query):** The resolver currently projects all attributes. It must be updated to include the 12 new reaction attributes in the returned shape. Since DynamoDB returns all attributes by default (no ProjectionExpression is used in the current implementation), no query change is needed — the new attributes appear automatically. Only the TypeScript type definitions and GraphQL schema need updating.

### DynamoDB UpdateExpression Pattern (per emoji)

```typescript
// Adding a reaction (remove=false)
UpdateExpression: "ADD rxn_thumbsup_count :delta, rxn_thumbsup_reactors :fpSet"
ConditionExpression: "NOT contains(rxn_thumbsup_reactors, :fp) OR attribute_not_exists(rxn_thumbsup_reactors)"

// Removing a reaction (remove=true)
UpdateExpression: "ADD rxn_thumbsup_count :delta DELETE rxn_thumbsup_reactors :fpSet"
ConditionExpression: "contains(rxn_thumbsup_reactors, :fp)"

// Values
":delta": remove ? -1 : 1
":fp": fingerprint
":fpSet": new Set([fingerprint])
```

This is identical to `upvoteQuestion`. The only variable is the attribute name prefix (`rxn_thumbsup` vs `rxn_heart` etc.).

---

## GraphQL Schema Changes

### New Enum Values

```graphql
enum SessionEventType {
  # ... existing values unchanged ...
  SNIPPET_ADDED
  SNIPPET_DELETED
  CLIPBOARD_CLEARED
  QUESTION_ADDED
  QUESTION_UPDATED
  REPLY_ADDED
  PARTICIPANT_BANNED
  REACTION_UPDATED # NEW
}
```

### Reaction Counts Type

```graphql
type ReactionCounts {
  thumbsup: Int!
  heart: Int!
  party: Int!
  laugh: Int!
  think: Int!
  eyes: Int!
}
```

### Question and Reply Type Extensions

```graphql
type Question {
  # ... existing fields unchanged ...
  reactions: ReactionCounts! # NEW — defaults to all zeros
}

type Reply {
  # ... existing fields unchanged ...
  reactions: ReactionCounts! # NEW — defaults to all zeros
}
```

### New Mutation

```graphql
type Mutation {
  # ... existing mutations unchanged ...
  react(
    sessionSlug: String!
    targetId: String!
    targetType: String! # "question" | "reply"
    emoji: String! # "thumbsup" | "heart" | "party" | "laugh" | "think" | "eyes"
    fingerprint: String!
    remove: Boolean
  ): SessionUpdate!
}
```

### Subscription Extension

```graphql
type Subscription {
  onSessionUpdate(sessionSlug: String!): SessionUpdate
    @aws_subscribe(
      mutations: [
        # ... existing mutations ...
        "react" # NEW — add to the list
      ]
    )
}
```

No new subscription channel is needed. `REACTION_UPDATED` is a new event type on the existing channel.

---

## Component Boundaries

### New vs. Modified — Explicit List

**NEW files:**

| File                                                        | Package   | Purpose                                              |
| ----------------------------------------------------------- | --------- | ---------------------------------------------------- |
| `packages/functions/src/resolvers/reactions.ts`             | functions | Lambda resolver for `react` mutation                 |
| `packages/frontend/src/actions/reactions.ts`                | frontend  | Server Action wrapping `react` mutation              |
| `packages/frontend/src/components/session/reaction-bar.tsx` | frontend  | ReactionBar UI component for Questions and Replies   |
| `packages/frontend/src/hooks/use-reactions.ts`              | frontend  | localStorage reaction tracking + optimistic dispatch |
| `packages/frontend/src/lib/graphql/mutations.ts` additions  | frontend  | `REACT` mutation string (added to existing file)     |

**MODIFIED files:**

| File                                                 | Package   | What Changes                                                                                                                                                                                      |
| ---------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `infra/schema.graphql`                               | infra     | Add `ReactionCounts` type, `reactions` field to `Question`/`Reply`, `react` mutation, `REACTION_UPDATED` enum value, `react` to subscription list                                                 |
| `packages/core/src/types.ts`                         | core      | Add `ReactionCounts` interface, `reactions` field to `Question`/`Reply`/`QuestionItem`/`ReplyItem` interfaces, `ReactArgs` mutation args interface, `REACTION_UPDATED` to `SessionEventType` enum |
| `packages/functions/src/resolvers/index.ts`          | functions | Export `reactHandler` from new `reactions.ts`                                                                                                                                                     |
| `packages/frontend/src/hooks/use-session-state.ts`   | frontend  | Add `REACTION_UPDATED` action type; add reaction update handler to reducer; extend `SessionAction` union                                                                                          |
| `packages/frontend/src/hooks/use-session-updates.ts` | frontend  | Add `case "REACTION_UPDATED"` to the subscription event switch                                                                                                                                    |
| `packages/frontend/src/hooks/use-fingerprint.ts`     | frontend  | Add reaction tracking: `reactedIds` map, `addReaction`, `removeReaction` functions with localStorage persistence                                                                                  |
| `packages/frontend/src/lib/graphql/mutations.ts`     | frontend  | Add `REACT` mutation constant                                                                                                                                                                     |
| `sst.config.ts`                                      | infra     | Wire `reactHandler` Lambda to `react` AppSync resolver                                                                                                                                            |

**NOT modified:**

| File                                                                    | Why untouched                                                                                    |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `packages/functions/src/resolvers/rate-limit.ts`                        | `checkRateLimit` and `checkNotBanned` are already reusable — called directly from `reactions.ts` |
| `packages/frontend/src/hooks/use-session-updates.ts` subscription setup | Only the switch block changes, not the subscription wiring                                       |
| `packages/frontend/src/lib/appsync-server.ts`                           | Generic `appsyncMutation` helper is already parameterized                                        |
| All other existing resolvers                                            | No interaction with reaction data                                                                |

---

## Data Flow Details

### Add Reaction — Happy Path

```
1. User clicks 👍 on QuestionCard
2. ReactionBar calls useReactions.addReaction("thumbsup", questionId)
3. useReactions checks localStorage: reacted:{sessionSlug}:{questionId}
   → { thumbsup: false, heart: false, ... }
   → thumbsup is false, proceed
4. useReactions dispatches ADD_REACTION_OPTIMISTIC to reducer
   → Question.reactions.thumbsup += 1 immediately in local state
5. useReactions persists to localStorage: thumbsup: true for this questionId
6. useReactions calls reactAction({ sessionSlug, targetId: questionId,
     targetType: "question", emoji: "thumbsup", fingerprint, remove: false })
7. reactAction calls appsyncMutation(REACT, args)
8. Lambda reactResolver:
   a. checkNotBanned(sessionSlug, fingerprint)
   b. checkRateLimit(fingerprint, 10, 60)
   c. DynamoDB UpdateCommand (conditional: NOT contains reactors)
   d. Returns REACTION_UPDATED with authoritative counts
9. AppSync broadcasts REACTION_UPDATED to all subscribers
10. useSessionUpdates receives REACTION_UPDATED
    → dispatches REACTION_UPDATED to reducer
    → reducer replaces optimistic count with authoritative count
    → ReactionBar re-renders with authoritative count
```

### Reaction Conflict — Double-Click

```
1. User clicks 👍 twice rapidly
2. First click: optimistic update + Server Action call in flight
3. Second click: localStorage already shows thumbsup: true → block UI
   (same pattern as votedIds check in useFingerprint today)
4. If Server Action returns VOTE_CONFLICT (ConditionalCheckFailedException):
   → reactAction returns { ok: false, error: "REACTION_CONFLICT" }
   → useReactions rolls back optimistic update
   → localStorage reverts thumbsup: false
```

### Remove Reaction (Toggle)

```
1. User clicks 👍 again on a question they already reacted to
2. ReactionBar detects: reactedEmojis.has("thumbsup") === true → this is a remove
3. Same flow as add, but remove: true passed to reactAction
4. Optimistic: reactions.thumbsup -= 1, localStorage thumbsup: false
5. DynamoDB: ADD rxn_thumbsup_count -1 DELETE rxn_thumbsup_reactors :fpSet
```

---

## Frontend State Changes

### SessionAction Union Extension

```typescript
// packages/frontend/src/hooks/use-session-state.ts

// NEW action types to add to SessionAction union:
| {
    type: "REACTION_UPDATED";
    payload: {
      targetId: string;
      targetType: "question" | "reply";
      emoji: string;
      counts: ReactionCounts;  // authoritative counts from server
    };
  }
| {
    type: "ADD_REACTION_OPTIMISTIC";
    payload: {
      targetId: string;
      targetType: "question" | "reply";
      emoji: keyof ReactionCounts;
      delta: 1 | -1;
    };
  }
```

### Reducer Cases

```typescript
case "ADD_REACTION_OPTIMISTIC": {
  const { targetId, targetType, emoji, delta } = action.payload;
  if (targetType === "question") {
    return {
      ...state,
      questions: state.questions.map((q) =>
        q.id !== targetId ? q : {
          ...q,
          reactions: { ...q.reactions, [emoji]: q.reactions[emoji] + delta },
        }
      ),
    };
  }
  // targetType === "reply"
  return {
    ...state,
    replies: state.replies.map((r) =>
      r.id !== targetId ? r : {
        ...r,
        reactions: { ...r.reactions, [emoji]: r.reactions[emoji] + delta },
      }
    ),
  };
}

case "REACTION_UPDATED": {
  const { targetId, targetType, counts } = action.payload;
  if (targetType === "question") {
    return {
      ...state,
      questions: state.questions.map((q) =>
        q.id !== targetId ? q : { ...q, reactions: counts }
      ),
    };
  }
  return {
    ...state,
    replies: state.replies.map((r) =>
      r.id !== targetId ? r : { ...r, reactions: counts }
    ),
  };
}
```

### SessionState Shape Change

```typescript
// No change to the SessionState interface shape itself.
// The reactions field is added to Question and Reply types in @nasqa/core.
// The reducer handles it via those extended types automatically.
```

### useFingerprint Extension

```typescript
// packages/frontend/src/hooks/use-fingerprint.ts
// New localStorage key pattern:
function reactionsKey(sessionSlug: string, targetId: string): string {
  return `reactions:${sessionSlug}:${targetId}`;
}
// Value: JSON object { thumbsup: boolean, heart: boolean, ... }

// New return values added to FingerprintResult:
reactedMap: Map<string, Set<string>>;  // targetId → Set of emoji names reacted
addReaction: (targetId: string, emoji: string) => void;
removeReaction: (targetId: string, emoji: string) => void;
hasReacted: (targetId: string, emoji: string) => boolean;
```

The `reactedMap` initializes from localStorage on mount for the current session. Each `addReaction` / `removeReaction` persists to the corresponding key.

---

## localStorage Tracking Design

**Key:** `reactions:{sessionSlug}:{targetId}`
**Value:** JSON object: `{ "thumbsup": true, "heart": false, "party": true, ... }`

This matches the existing `votes:{sessionSlug}` pattern but scoped to each individual target (Question or Reply). This is more specific than a session-wide set because a user can react to multiple items.

**Why per-item keys over a session-wide map:**

The existing vote tracking uses a flat array of IDs (`votes:{sessionSlug}` = `["q1", "q2"]`). For reactions, each item has 6 independent booleans. Storing as `reactions:{sessionSlug}:{id}` keeps each item's state isolated and avoids deserializing the entire session's reaction history on every reaction check.

**Initialization:** On mount, `useFingerprint` does not pre-load all reaction keys (there could be hundreds of items). Instead, `hasReacted(targetId, emoji)` reads and caches lazily on first access per targetId.

---

## Subscription Event Payload Design

The `REACTION_UPDATED` event payload is:

```json
{
  "targetId": "01HXYZ...",
  "targetType": "question",
  "emoji": "thumbsup",
  "counts": {
    "thumbsup": 5,
    "heart": 2,
    "party": 0,
    "laugh": 1,
    "think": 0,
    "eyes": 3
  }
}
```

**Why send all counts, not just the changed emoji's count:**

The reducer replaces the entire `reactions` object (`{ ...q, reactions: counts }`). Sending the full counts snapshot eliminates the need for per-emoji delta logic in the reducer and ensures all clients converge on the same state even if events arrive out of order or are missed.

This is the same philosophy as `QUESTION_UPDATED` sending `upvoteCount` (the absolute value) rather than a delta.

---

## Rate Limiting for Reactions

Reactions reuse `checkRateLimit` from `packages/functions/src/resolvers/rate-limit.ts` without modification.

**Recommended limit:** 10 reactions/minute per fingerprint. Rationale:

- 3 questions/minute is the current public write limit
- Reactions are lighter-weight (no text content), so a higher limit is appropriate
- 10/minute prevents reaction spam (rapid-fire clicking across many items) while supporting genuine engagement

The `react` mutation does NOT check rate limits for host users — same as the existing host mutations (snippet push, focus, ban) skip public rate limits.

Ban enforcement: `checkNotBanned` is called before any reaction write. A banned participant cannot react.

---

## ReactionBar Component

### Props

```typescript
interface ReactionBarProps {
  targetId: string;
  targetType: "question" | "reply";
  reactions: ReactionCounts; // from Question or Reply
  sessionSlug: string;
  fingerprint: string;
  disabled?: boolean; // true when participant is banned
}
```

### Emoji Palette (fixed 6, no picker)

```typescript
const EMOJI_PALETTE = [
  { key: "thumbsup", glyph: "👍" },
  { key: "heart", glyph: "❤️" },
  { key: "party", glyph: "🎉" },
  { key: "laugh", glyph: "😂" },
  { key: "think", glyph: "🤔" },
  { key: "eyes", glyph: "👀" },
] as const;
```

The glyph is display-only. The `key` is what's stored in DynamoDB and localStorage.

### Bundle Considerations

The 6 emoji glyphs are Unicode characters rendered by the OS emoji font — zero bundle cost. No emoji library needed. This was explicitly called out in PROJECT.md ("no emoji picker — bundle budget").

---

## Build Order

Dependencies flow from data layer up to UI. Each step unblocks the next.

```
STEP 1: Core types (@nasqa/core)
  Add ReactionCounts interface, reactions field to Question/Reply/
  QuestionItem/ReplyItem, ReactArgs interface, REACTION_UPDATED to
  SessionEventType enum.
  Why first: All other layers import from @nasqa/core. TypeScript
  compile errors in subsequent steps require this to exist.
  Files: packages/core/src/types.ts

STEP 2: GraphQL schema (infra)
  Add ReactionCounts type, reactions to Question/Reply, react mutation,
  REACTION_UPDATED enum value, react to subscription list.
  Why second: Lambda resolver and frontend mutations depend on the schema.
  AppSync will reject mutations that aren't in the schema.
  Files: infra/schema.graphql

STEP 3: Lambda resolver (functions)
  Implement reactResolver in packages/functions/src/resolvers/reactions.ts.
  Wire to sst.config.ts.
  Why third: Testable independently. Subscription events don't flow until
  this exists.
  Files: packages/functions/src/resolvers/reactions.ts
         packages/functions/src/resolvers/index.ts (add export)
         sst.config.ts (wire resolver)

STEP 4: Server Action (frontend)
  Add reactAction in packages/frontend/src/actions/reactions.ts.
  Add REACT mutation string to packages/frontend/src/lib/graphql/mutations.ts.
  Why fourth: Depends on schema (step 2) and resolver (step 3).
  Files: packages/frontend/src/actions/reactions.ts
         packages/frontend/src/lib/graphql/mutations.ts

STEP 5: State reducer (frontend)
  Add REACTION_UPDATED and ADD_REACTION_OPTIMISTIC cases to
  useSessionState reducer. Extend SessionAction union type.
  Why fifth: useReactions hook (step 6) and subscription handler (step 7)
  dispatch to this reducer.
  Files: packages/frontend/src/hooks/use-session-state.ts

STEP 6: useFingerprint extension + useReactions hook (frontend)
  Extend useFingerprint with reaction localStorage tracking.
  Create useReactions hook that orchestrates optimistic dispatch,
  localStorage gate, and Server Action call.
  Why sixth: Depends on reducer (step 5) and Server Action (step 4).
  Files: packages/frontend/src/hooks/use-fingerprint.ts
         packages/frontend/src/hooks/use-reactions.ts

STEP 7: Subscription handler (frontend)
  Add REACTION_UPDATED case to useSessionUpdates switch.
  Why seventh: By now the reducer handles the action correctly.
  Files: packages/frontend/src/hooks/use-session-updates.ts

STEP 8: ReactionBar UI component (frontend)
  Build ReactionBar component using useReactions hook.
  Integrate into QuestionCard and ReplyCard.
  Why last: Depends on all layers being in place. UI work proceeds
  once data flows correctly end-to-end.
  Files: packages/frontend/src/components/session/reaction-bar.tsx
         (modify QuestionCard and ReplyCard to accept + render ReactionBar)
```

---

## Architectural Patterns

### Pattern 1: Atomic Set-Based Dedup (reuse from votes)

**What:** Use DynamoDB String Sets with conditional `ADD`/`DELETE` expressions to enforce per-user dedup atomically at the database layer. The frontend localStorage provides a client-side gate that prevents redundant API calls, but the database is authoritative.

**When to use:** Any boolean per-user state on an item (voted, reacted, flagged). The Set stores which fingerprints have taken the action; the counter is the Set's cardinality derived by the atomic ADD.

**Trade-offs:** 12 new attributes per Question/Reply item. At 500 participants reacting to 50 questions, each reactions\_\*\_reactors Set could hold up to 500 fingerprints (36-char UUIDs). That is ~18KB per question item for reactors alone. DynamoDB item limit is 400KB — this is not a concern at the target scale (50-500 participants).

### Pattern 2: Authoritative Snapshot in Subscription Payload

**What:** The subscription event payload includes the full `counts` object (all 6 emoji counts), not just the emoji that changed. The reducer performs a full replacement: `reactions: counts`.

**When to use:** When multiple fast events (e.g., rapid reactions during a talk) could cause count drift if only deltas are sent. Full snapshot ensures convergence.

**Trade-offs:** Slightly larger payload (~100 bytes per event vs ~30 bytes for delta). Acceptable given AppSync WebSocket overhead and the 50-500 participant target.

### Pattern 3: Emoji Key Normalization (glyph in UI, key in storage)

**What:** The UI displays the emoji glyph (Unicode character). The database, API, and localStorage use a normalized ASCII key (`thumbsup`, `heart`, etc.). Mapping is defined once in a constant (`EMOJI_PALETTE`) and used throughout.

**When to use:** Any time emoji need to appear in DynamoDB attribute names, JSON keys, or URL parameters.

**Trade-offs:** Requires one mapping layer. The EMOJI_PALETTE constant in `reaction-bar.tsx` (or a shared `packages/core/src/reactions.ts` module) is the single source of truth.

---

## Anti-Patterns

### Anti-Pattern 1: DynamoDB Map for Reaction Counts

**What people do:** Store reactions as `{ M: { "👍": { count: 3, reactors: [...] } } }` thinking it's more "structured."

**Why it's wrong:** DynamoDB `ADD` does not work on nested Map values. Incrementing a nested counter requires `SET reactions.thumbsup.count = reactions.thumbsup.count + :delta` — which is NOT atomic. Under concurrent writes (many users reacting simultaneously), this pattern produces incorrect counts.

**Do this instead:** Flat top-level attributes (`rxn_thumbsup_count`, `rxn_thumbsup_reactors`). The `ADD` operation on top-level attributes IS atomic.

### Anti-Pattern 2: Separate Subscription Channel for Reactions

**What people do:** Add a new `onReactionUpdate` subscription to avoid "polluting" the existing `onSessionUpdate` channel.

**Why it's wrong:** Each AppSync subscription is a separate WebSocket connection. Adding a second subscription doubles connection overhead per client. The existing union-type pattern (one channel, typed payloads) was chosen specifically to avoid this. `REACTION_UPDATED` is a new event type on the existing channel.

**Do this instead:** Add `REACTION_UPDATED` to `SessionEventType` and `react` to the `@aws_subscribe` list. Zero new subscription infrastructure.

### Anti-Pattern 3: Storing Emoji Glyphs as DynamoDB Attribute Names

**What people do:** Name attributes `reactions_👍_count` because it matches the UI directly.

**Why it's wrong:** While DynamoDB supports Unicode attribute names, they require `ExpressionAttributeNames` escaping in every UpdateExpression, GetItem, and Query that references them. This makes every query more verbose and error-prone.

**Do this instead:** Use ASCII normalized keys (`rxn_thumbsup_count`). Map to glyphs in the UI layer only.

### Anti-Pattern 4: Loading All Reaction States on Mount

**What people do:** In `useFingerprint`, iterate all `reactions:{sessionSlug}:*` localStorage keys on mount to pre-populate the full reaction state map.

**Why it's wrong:** There is no efficient way to enumerate keys by prefix in localStorage. `localStorage.length` + iterating all keys is O(n) on total localStorage size, and a session with 100 questions × 6 emojis = 600 potential keys would be slow.

**Do this instead:** Load lazily. `hasReacted(targetId, emoji)` reads and caches the per-item key on first access. Only items visible in the viewport will be accessed.

---

## Integration Points

### Internal Boundaries

| Boundary                                        | Communication                                 | Notes                                                      |
| ----------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------- |
| `reaction-bar.tsx` ↔ `use-reactions.ts`         | Direct hook call                              | `useReactions` returns `{ counts, reactedEmojis, toggle }` |
| `use-reactions.ts` ↔ `use-session-state.ts`     | `dispatch(ADD_REACTION_OPTIMISTIC)`           | Same reducer dispatch pattern as vote system               |
| `use-reactions.ts` ↔ `use-fingerprint.ts`       | `hasReacted`, `addReaction`, `removeReaction` | Extended from existing fingerprint hook                    |
| `use-reactions.ts` ↔ `actions/reactions.ts`     | Server Action call                            | Same `{ ok, error }` return pattern                        |
| `actions/reactions.ts` ↔ AppSync                | `appsyncMutation(REACT, args)`                | Reuses existing `appsync-server.ts` helper                 |
| `reactions.ts` resolver ↔ `rate-limit.ts`       | `checkNotBanned`, `checkRateLimit`            | No modification to rate-limit.ts needed                    |
| `reactions.ts` resolver ↔ DynamoDB              | Flat attribute `ADD` + conditional            | Same pattern as `upvoteQuestion`                           |
| `use-session-updates.ts` ↔ AppSync subscription | New case in existing switch                   | No new subscription wiring                                 |

### External Services

| Service  | Impact                           | Notes                                                                           |
| -------- | -------------------------------- | ------------------------------------------------------------------------------- |
| AppSync  | Schema change required           | Add type, mutation, enum value, subscription list entry                         |
| DynamoDB | New attributes on existing items | No table redesign; new attributes are sparse (added on first reaction)          |
| Lambda   | New function (reactResolver)     | Wire in sst.config.ts; reuses existing DynamoDB client and rate-limit utilities |

---

## Scaling Considerations

| Concern                       | At current target (50-500 participants)                             | Notes                                                                                                                                |
| ----------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| DynamoDB item size            | ~18KB worst case per item                                           | Well under 400KB limit                                                                                                               |
| Reaction write throughput     | 500 users × 10 reactions/min = 5,000 writes/min per session         | DynamoDB on-demand handles this without configuration                                                                                |
| Subscription broadcast volume | 1 REACTION_UPDATED event per reaction, broadcast to all subscribers | At 500 subscribers × 5,000 events/min = 2.5M messages/min. AppSync charges per million messages ($1.00). Monitor cost at this scale. |
| localStorage key count        | 100 questions × 1 key per item = 100 new keys per session           | Negligible                                                                                                                           |

---

## Sources

All findings are HIGH confidence — derived from direct source code analysis of the existing codebase, DynamoDB official documentation on atomic operations, and AppSync subscription patterns already in production in this project.

- DynamoDB `ADD` operation atomicity — https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html#Expressions.UpdateExpressions.ADD (confirmed: ADD is atomic for numbers and sets at the top-level attribute scope only)
- DynamoDB String Set operations — https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html (confirmed: Unicode attribute names valid but require ExpressionAttributeNames escaping)
- Existing `upvoteQuestion` resolver — `packages/functions/src/resolvers/qa.ts` (direct code analysis — the atomic Set pattern to mirror)
- Existing `useFingerprint` hook — `packages/frontend/src/hooks/use-fingerprint.ts` (direct code analysis — the localStorage pattern to extend)
- Existing subscription handler — `packages/frontend/src/hooks/use-session-updates.ts` (direct code analysis — the event switch to extend)
- AppSync subscription `@aws_subscribe` — `infra/schema.graphql` (existing pattern to extend by adding `react` to the list)

---

_Architecture research for: emoji reactions — Nasqa Live v1.2_
_Researched: 2026-03-15_
