# Phase 4: Moderation, Identity, and Polish - Research

**Researched:** 2026-03-14
**Domain:** Community moderation, device identity, i18n (next-intl), server-side rate limiting
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Moderation UX**
- Inline ban/delete icons on question cards — appear on hover (desktop), always visible for host (mobile)
- No separate moderation panel; all actions are contextual and inline
- When host bans a question: replaced with "This question was removed" placeholder for all participants
- When host bans a participant (by fingerprint): confirmation dialog before executing
- No confirmation needed for hiding a single question (speed over safety for individual actions)
- Banned participant sees explicit message: "You've been blocked from posting in this session" with input disabled

**Community Downvoting**
- Separate thumbs-down button alongside existing upvote — both counts visible to everyone
- Both upvote and downvote are toggles (click again to retract) — this changes current upvote behavior to also be retractable
- Upvote and downvote are mutually exclusive per question (clicking one removes the other, like Reddit)
- Auto-hide threshold: 50% of participants who voted on that specific question (not total connected audience)
- Auto-hidden questions show as collapsed: "Hidden by community" with a [show] expand option
- Host can restore community-hidden questions (override the auto-hide)

**Optional Identity**
- Join screen with optional name + email fields and a "Skip" button — shown when participant first enters a session
- Display name replaces "Anonymous" label on questions and replies — no avatar, just the name text
- Profile icon in session header allows editing name/email mid-session
- Name and email persist in localStorage across sessions — join screen pre-fills with saved values
- Email is stored but never displayed publicly (per IDENT-03)

**i18n**
- Browser-detected locale with manual language switcher dropdown in the header (EN | ES | PT)
- Everything translated: marketing/landing page and in-session UI
- Claude generates es.json and pt.json translations during implementation (good enough for v1)
- Language preference persists in localStorage — overrides browser detection on subsequent visits
- Translation covers UI chrome only, not user-generated content (per I18N-04)

### Claude's Discretion
- Rate limiting implementation details (INFRA-05: 10 snippets/min host, 3 questions/min participant)
- Device fingerprint (localStorage UUID) implementation for ban enforcement
- Auto-ban logic after 3 banned posts (MOD-06)
- Animation/transition details for moderation actions
- Language switcher exact placement and styling
- Join screen layout and skip flow design

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MOD-01 | Each participant assigned device fingerprint (localStorage UUIDv4) on first visit | Already implemented in `use-fingerprint.ts` — extend with downvote/ban tracking |
| MOD-02 | Host can instantly ban any question or comment (content hidden for all) | New `banQuestion` mutation + QUESTION_UPDATED event; `isBanned` field exists in schema |
| MOD-03 | Host can permanently ban a participant by fingerprint (blocked from posting) | New `banParticipant` mutation + DynamoDB `BAN#fingerprint` item; check in addQuestion/addReply |
| MOD-04 | Participants can thumbs-down a question/comment | New `downvoteQuestion` mutation; `downvoteCount` field exists in schema and DynamoDB |
| MOD-05 | Content receiving thumbs-down >= 50% of voters on that question auto-hidden | Auto-hide in downvote resolver: if downvotes >= upvotes+downvotes × 0.5 (voter count), set isHidden |
| MOD-06 | Participant with 3 banned posts auto-blocked from posting | Track `bannedPostCount` on BAN item in DynamoDB; check and auto-ban in banQuestion resolver |
| IDENT-01 | Participants can optionally provide display name and email | Join modal component with localStorage persistence; new `nasqa_identity` key |
| IDENT-02 | Display name appears next to participant's questions and comments | Pass `authorName` through addQuestion/addReply; `authorName` field exists in schema and types |
| IDENT-03 | Email stored but never displayed publicly | Email stays in localStorage only; never sent to server or stored in DynamoDB |
| I18N-01 | UI labels translated using next-intl (en, es, pt) | next-intl 4.8.3 already installed and routing active; es.json/pt.json exist but incomplete |
| I18N-02 | Locale-based routing via middleware (e.g., /en/live/myslug) | Middleware already configured with `locales: ['en', 'es', 'pt']` and `localeDetection: true` |
| I18N-03 | Default locale browser-detected, falling back to en | Already implemented via `localeDetection: true` in createMiddleware |
| I18N-04 | Translation covers UI chrome only, not user-generated content | Architectural constraint only — no library needed |
| I18N-05 | All translation keys reside in /messages/*.json | `/messages/en.json`, `es.json`, `pt.json` already exist — expand keys |
| INFRA-05 | Rate limiting: host 10 snippets/min, public 3 questions/min | DynamoDB minute-bucket pattern in Lambda resolvers — no external library needed |
</phase_requirements>

---

## Summary

Phase 4 is largely additive to an already well-structured codebase. The GraphQL schema, DynamoDB types, and core application interfaces are fully pre-wired with the moderation fields (`downvoteCount`, `isHidden`, `isBanned`, `authorName`, `PARTICIPANT_BANNED` event type). The device fingerprint hook (`use-fingerprint.ts`) already exists and generates a stable localStorage UUID. The next-intl routing infrastructure is live with all three locales and the message files are partially populated.

The primary work splits into three clean tracks: (1) **Moderation** — adding new GraphQL mutations (`banQuestion`, `banParticipant`, `downvoteQuestion`) with Lambda resolver logic and wiring into the UI; (2) **Identity** — a join modal with localStorage persistence and threading `authorName` through question/reply submission; (3) **i18n completion + rate limiting** — expanding message files to full coverage, adding a language switcher dropdown, and implementing DynamoDB minute-bucket rate limiting in the Lambda resolver.

The one design decision noted as LOW confidence in STATE.md — using connected audience count for the 50% downvote threshold — has been resolved by the user's CONTEXT.md decision: use **voters on that specific question** (upvotes + downvotes cast), not total connected users. This eliminates the AppSync connection-count tracking problem entirely.

**Primary recommendation:** Work in three sequential plans: (1) moderation backend + UI, (2) identity join flow, (3) i18n completion + rate limiting. All tracks are independent and low-risk given the pre-wired schema.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next-intl | 4.8.3 (installed) | i18n routing, translations, locale detection | Already integrated with App Router, middleware, and message files |
| @aws-sdk/lib-dynamodb | 3.1009.0 (installed) | DynamoDB access for rate limiting and ban storage | Already used for all DynamoDB operations |
| lucide-react | 0.577.0 (installed) | ThumbsDown, Ban, User icons for moderation/identity UI | Already used throughout codebase |
| framer-motion | 12.36.0 (installed) | Collapse/expand transitions for hidden content | Already used in the codebase |
| sonner | 2.0.7 (installed) | Toast notifications for moderation feedback | Already used in the codebase |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @base-ui/react | 1.3.0 (installed) | Dialog/Modal primitive for join screen and ban confirmation | Already in stack — use for join modal and confirm dialog |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| DynamoDB minute-bucket rate limiting | Redis/ElastiCache | Redis is faster but adds cost and infra; DynamoDB is sufficient for 10/min, 3/min rates |
| DynamoDB minute-bucket rate limiting | API Gateway usage plans | Requires API Gateway layer; project uses AppSync directly — not applicable |
| next-intl NEXT_LOCALE cookie | localStorage for locale | User decision specifies localStorage; next-intl cookie is the default but can be bypassed by reading cookie in middleware from a custom localStorage-backed approach; simplest implementation: write to `NEXT_LOCALE` cookie on language switch (mirrors what next-intl does natively when `router.replace` is called with locale) |

**Installation:** No new packages required. All dependencies are already installed.

---

## Architecture Patterns

### Recommended Project Structure (additions to existing)

```
packages/frontend/src/
├── components/session/
│   ├── join-modal.tsx          # IDENT-01: optional identity on session entry
│   ├── identity-editor.tsx     # IDENT-01: mid-session name/email edit
│   └── language-switcher.tsx   # I18N-01: EN|ES|PT dropdown in header
├── hooks/
│   └── use-identity.ts         # localStorage identity (name, email, fingerprint)
├── actions/
│   └── moderation.ts           # banQuestion, banParticipant, downvoteQuestion Server Actions
packages/functions/src/resolvers/
│   └── moderation.ts           # banQuestion, banParticipant, downvoteQuestion resolver fns
packages/frontend/messages/
│   ├── en.json                 # Expand with moderation/identity keys
│   ├── es.json                 # Expand with all missing keys
│   └── pt.json                 # Expand with all missing keys
```

### Pattern 1: DynamoDB Minute-Bucket Rate Limiting

**What:** Each rate-limited action stores a counter at `PK=RATELIMIT#fingerprint_or_hosthash, SK=BUCKET#YYYYMMDDHHMI`. On each request, conditionally increment the counter. If it exceeds the limit, throw an error. Set TTL on the item to auto-expire.

**When to use:** `addQuestion` (participant 3/min), `pushSnippet` (host 10/min)

```typescript
// packages/functions/src/resolvers/rate-limit.ts
async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number = 60
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / windowSeconds) * windowSeconds; // floor to minute boundary
  const ttl = bucket + windowSeconds * 2; // expire after 2 windows

  try {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: tableName(),
        Key: {
          PK: `RATELIMIT#${key}`,
          SK: `BUCKET#${bucket}`,
        },
        UpdateExpression: 'ADD #count :one SET #ttl = if_not_exists(#ttl, :ttl)',
        ConditionExpression: 'attribute_not_exists(#count) OR #count < :limit',
        ExpressionAttributeNames: {
          '#count': 'count',
          '#ttl': 'TTL',
        },
        ExpressionAttributeValues: {
          ':one': 1,
          ':limit': limit,
          ':ttl': ttl,
        },
      })
    );
    void result;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      throw new Error('RATE_LIMIT_EXCEEDED');
    }
    throw err;
  }
}
```

**Important:** The ConditionExpression `#count < :limit` runs atomically. No race condition.

### Pattern 2: DynamoDB Ban Storage

**What:** Bans are stored as items with `PK=SESSION#slug, SK=BAN#fingerprint`. The item contains `bannedPostCount` (auto-incremented per ban action) and `isBanned: true`. On `addQuestion` and `addReply`, check for existence of this item before proceeding.

```typescript
// Check ban before adding question/reply
async function checkNotBanned(sessionSlug: string, fingerprint: string): Promise<void> {
  const result = await docClient.send(
    new GetCommand({
      TableName: tableName(),
      Key: {
        PK: `SESSION#${sessionSlug}`,
        SK: `BAN#${fingerprint}`,
      },
    })
  );
  if (result.Item?.isBanned) {
    throw new Error('PARTICIPANT_BANNED');
  }
}
```

**Auto-ban on 3rd strike (MOD-06):** In `banQuestion` resolver, after banning the content, increment `bannedPostCount` on the BAN item. Use a conditional `SET isBanned = :true` when count reaches 3:

```typescript
const banResult = await docClient.send(
  new UpdateCommand({
    TableName: tableName(),
    Key: { PK: `SESSION#${sessionSlug}`, SK: `BAN#${fingerprint}` },
    UpdateExpression: 'ADD bannedPostCount :one SET isBanned = if_not_exists(isBanned, :false)',
    ExpressionAttributeValues: { ':one': 1, ':false': false },
    ReturnValues: 'ALL_NEW',
  })
);
// If bannedPostCount reaches 3, set isBanned = true
if ((banResult.Attributes?.bannedPostCount as number) >= 3) {
  await docClient.send(new UpdateCommand({
    TableName: tableName(),
    Key: { PK: `SESSION#${sessionSlug}`, SK: `BAN#${fingerprint}` },
    UpdateExpression: 'SET isBanned = :true',
    ExpressionAttributeValues: { ':true': true },
  }));
}
```

### Pattern 3: Downvote with Auto-Hide (MOD-04, MOD-05)

**What:** `downvoteQuestion` resolver uses a DynamoDB Set (`downvoters`) mirroring the existing `voters` Set for upvotes. After updating, compute whether `downvoteCount >= (upvoteCount + downvoteCount) * 0.5` (i.e., downvotes are 50%+ of all votes cast). If yes, set `isHidden = true`. The resolver broadcasts `QUESTION_UPDATED` with the new `isHidden` and `downvoteCount`.

**Upvote/Downvote mutual exclusivity:** When a downvote is added, remove the upvote if present (and vice versa). This requires updating both `voters` and `downvoters` sets atomically in one `UpdateCommand`.

```typescript
// Downvote: add to downvoters, remove from voters (upvoters) if present
const updateExpression = remove
  ? 'ADD downvoteCount :negOne DELETE downvoters :fpSet'
  : 'ADD downvoteCount :one DELETE voters :fpSet SET isHidden = :wasHidden';
// Then check auto-hide threshold after update
const newDownvote = result.Attributes?.downvoteCount as number ?? 0;
const newUpvote = result.Attributes?.upvoteCount as number ?? 0;
const totalVotes = newDownvote + newUpvote;
const shouldHide = totalVotes > 0 && newDownvote / totalVotes >= 0.5;
if (shouldHide !== result.Attributes?.isHidden) {
  await docClient.send(new UpdateCommand({
    // ... SET isHidden = :shouldHide
  }));
}
```

**Note:** The two-step update (downvote then conditional hide) is fine here because auto-hide is not security-critical. A single-step approach would require a transaction (`TransactWriteCommand`) but adds complexity.

### Pattern 4: Ban Question (MOD-02)

The `banQuestion` resolver sets `isBanned = true` and `isHidden = true` on the question item. It broadcasts `QUESTION_UPDATED` with both flags. Client-side, when `isBanned` is true, `QuestionCard` renders a "This question was removed" tombstone instead of the content — visible to all participants via subscription.

### Pattern 5: Host Ban Participant (MOD-03)

`banParticipant` resolver creates/updates the `BAN#fingerprint` item with `isBanned = true`, then broadcasts `PARTICIPANT_BANNED` event with `{ fingerprint }` payload. Client-side, `useSessionUpdates` handles `PARTICIPANT_BANNED` by storing the fingerprint in a `bannedFingerprints` Set in session state. `QAInput` receives `isBanned` prop derived from `fingerprint in bannedFingerprints` and disables submission with the explicit message.

### Pattern 6: Optional Identity (IDENT-01/02/03)

A `useIdentity` hook manages `nasqa_identity` in localStorage: `{ name?: string, email?: string }`. On session entry, if `name` is absent, show `JoinModal`. The modal has optional name + email + Skip. Name/email are passed as `authorName` to `addQuestionAction` and `addReplyAction` (already in the action signatures via the `@nasqa/core` types — `authorName` exists on the `Question` type). Email is **never** sent to the server.

The `authorName` field already exists on `QuestionItem`, `Question`, and the GraphQL `Question` type. The `addQuestion` mutation already has `authorName` as an optional field in the resolver's DynamoDB write — it just needs to be plumbed through the GraphQL mutation argument and resolver.

### Pattern 7: Language Switcher (I18N-01/03)

next-intl's `useRouter` (from `@/i18n/navigation`) + `useLocale` provide the current locale and navigation. The language switcher calls `router.replace(pathname, { locale: newLocale })`. next-intl middleware automatically sets the `NEXT_LOCALE` cookie on the response, providing persistence across page loads.

**Note on user decision "localStorage overrides browser detection":** next-intl natively uses a `NEXT_LOCALE` cookie (not localStorage) for this purpose. The cookie approach is functionally equivalent — it persists across sessions when `maxAge` is set and works server-side (unlike localStorage). The middleware should be updated to configure `localeCookie: { maxAge: 365 * 24 * 60 * 60 }` to make it persistent. This achieves the user's intent (manual preference outlasts browser session) without the complexity of syncing localStorage with middleware.

```typescript
// src/middleware.ts — updated
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);
// src/i18n/routing.ts — centralized routing config
import { defineRouting } from 'next-intl/routing';
export const routing = defineRouting({
  locales: ['en', 'es', 'pt'],
  defaultLocale: 'en',
  localeDetection: true,
  localeCookie: { maxAge: 365 * 24 * 60 * 60 }, // 1 year persistent
});
```

### Pattern 8: GraphQL Schema Extensions

New mutations to add to `infra/schema.graphql`:

```graphql
type Mutation {
  # ... existing mutations ...
  banQuestion(sessionSlug: String!, hostSecretHash: String!, questionId: String!): SessionUpdate!
  banParticipant(sessionSlug: String!, hostSecretHash: String!, fingerprint: String!): SessionUpdate!
  downvoteQuestion(sessionSlug: String!, questionId: String!, fingerprint: String!, remove: Boolean): SessionUpdate!
}
```

The `PARTICIPANT_BANNED` event type is already in the `SessionEventType` enum — no schema change needed there.

New mutations must also be added to:
1. `@aws_subscribe(mutations: [...])` list in `Subscription onSessionUpdate`
2. `sst.config.ts` resolver registrations
3. `mutations.ts` GraphQL constants
4. `moderation.ts` Server Actions

### Anti-Patterns to Avoid

- **Storing email on the server:** Email must stay in localStorage only (IDENT-03). Never add it to `addQuestion`/`addReply` mutation arguments.
- **Using connected audience count for 50% threshold:** The user's decision is to use voters-on-question (upvoteCount + downvoteCount). Do not attempt AppSync connection tracking.
- **Client-side-only ban enforcement:** Banned state must be enforced server-side in Lambda resolver (check BAN# item in addQuestion/addReply). Client-side is UX only.
- **Separate moderation panel:** All moderation is inline. Do not create a `/host/moderation` route.
- **Importing next-intl navigation from `next-intl` directly:** Import from `@/i18n/navigation` (the project's custom wrapper) so createNavigation routing config is applied.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Locale routing | Custom middleware | next-intl middleware (already installed) | Handles accept-language header, cookie, prefix routing, edge cases |
| Translation loading | Custom JSON reader | next-intl `getMessages()` + `NextIntlClientProvider` (already working) | RSC streaming, type safety, namespacing |
| Modal/Dialog primitives | Custom div+portal | `@base-ui/react` Dialog (already in stack) | Accessible, focus-trapped, keyboard-dismissable |
| Atomic counter increment | Transaction or read-then-write | DynamoDB `ADD` expression | ADD is atomic; no race condition on vote counts |
| Optimistic ban UI | Complex state | Dispatch `QUESTION_UPDATED` with `isBanned: true` immediately | Already follows established optimistic pattern |

**Key insight:** The codebase is already structured correctly for all Phase 4 additions. Every pattern follows an established precedent in the existing code.

---

## Common Pitfalls

### Pitfall 1: Missing Subscription Registration for New Mutations
**What goes wrong:** New mutations (`banQuestion`, `banParticipant`, `downvoteQuestion`) don't trigger subscription events because they're not in the `@aws_subscribe(mutations: [...])` list.
**Why it happens:** Forgetting to add new mutation names to the subscription decorator.
**How to avoid:** When adding a mutation, always update three places simultaneously: schema.graphql `@aws_subscribe` list, sst.config.ts resolver registrations, and the subscription test.
**Warning signs:** Mutations return successfully but participants don't see live updates.

### Pitfall 2: Downvote Mutual Exclusivity — Two-Fetch Race
**What goes wrong:** Clicking downvote when you've already upvoted requires removing the upvote atomically in the same DynamoDB update. If done in two separate UpdateCommands, a race can leave counts inconsistent.
**Why it happens:** Treating upvote removal and downvote addition as separate operations.
**How to avoid:** Use a single `UpdateCommand` that does `ADD downvoteCount :one, ADD upvoteCount :negOne DELETE voters :fpSet ADD downvoters :fpSet` — all in one expression.

### Pitfall 3: `authorName` Not Plumbed Through AddQuestion Mutation
**What goes wrong:** `authorName` exists on the `Question` type and `QuestionItem` interface but the `addQuestion` mutation doesn't accept it as an argument yet. Questions show "Anonymous" despite user setting a name.
**Why it happens:** The schema was pre-wired for the field but the mutation arg was deferred.
**How to avoid:** Add `authorName: String` to the `addQuestion` and `addReply` GraphQL mutation signatures and pass it from the Server Actions.

### Pitfall 4: Rate Limit Key Collision Between Host Actions
**What goes wrong:** Using `fingerprint` as the rate limit key for host actions means the host's device fingerprint limits their snippet posting — but the host doesn't have a meaningful fingerprint requirement.
**Why it happens:** Reusing the participant rate limit key pattern for hosts.
**How to avoid:** Use `hostSecretHash` as the rate limit key for `pushSnippet` (not fingerprint). Use `fingerprint` for participant `addQuestion`.

### Pitfall 5: Join Modal Blocking Navigation on Every Page Load
**What goes wrong:** Showing the join modal on every session visit (not just first visit) creates friction.
**Why it happens:** Checking `name` in localStorage on every mount without a "session-seen" flag.
**How to avoid:** The `useIdentity` hook should only trigger the join modal once per session-entry. Track a `nasqa_join_shown_${sessionSlug}` flag in sessionStorage (not localStorage) so the modal shows once per browser session per session slug.

### Pitfall 6: i18n Keys Missing from es.json/pt.json
**What goes wrong:** New keys added to en.json for moderation/identity/rate-limit messages but not added to es.json/pt.json causes next-intl to fall back to the key string instead of English.
**Why it happens:** Forgetting to keep all three message files in sync.
**How to avoid:** Always update all three message files together. Add all new keys with translations when writing en.json.

### Pitfall 7: BAN item TTL
**What goes wrong:** BAN items accumulate in DynamoDB indefinitely after a session expires (the session itself expires via TTL but the BAN item has no TTL set).
**Why it happens:** Forgetting TTL on BAN items.
**How to avoid:** Set `TTL` on BAN items to the same session TTL (24h from now). The fingerprint ban only needs to last as long as the session.

---

## Code Examples

### Language Switcher Component

```typescript
// src/components/language-switcher.tsx
'use client';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';

const LOCALES = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'pt', label: 'PT' },
] as const;

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function handleChange(newLocale: string) {
    router.replace(pathname, { locale: newLocale });
  }

  return (
    <div className="flex items-center gap-1 text-sm">
      {LOCALES.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => handleChange(code)}
          className={cn(
            'px-2 py-1 rounded font-semibold transition-colors',
            locale === code
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
```

**Source:** [next-intl Navigation APIs](https://next-intl.dev/docs/routing/navigation)

### i18n Navigation Setup (defineRouting pattern)

```typescript
// src/i18n/routing.ts — new file
import { defineRouting } from 'next-intl/routing';
export const routing = defineRouting({
  locales: ['en', 'es', 'pt'],
  defaultLocale: 'en',
  localeDetection: true,
  localeCookie: { maxAge: 31536000 }, // 1 year
});
// src/i18n/navigation.ts — new file
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
```

**Note:** Check if `@/i18n/navigation.ts` already exists in the project — if not, create it. The middleware should also import `routing` from this file.

### Rate Limit in addQuestion Resolver

```typescript
// In qa.ts resolver, before the PutCommand:
const bucket = Math.floor(Date.now() / 60000) * 60; // floor to minute in epoch seconds
await docClient.send(new UpdateCommand({
  TableName: tableName(),
  Key: {
    PK: `RATELIMIT#${fingerprint}`,
    SK: `BUCKET#${bucket}`,
  },
  UpdateExpression: 'ADD #c :one SET #ttl = if_not_exists(#ttl, :ttl)',
  ConditionExpression: 'attribute_not_exists(#c) OR #c < :limit',
  ExpressionAttributeNames: { '#c': 'count', '#ttl': 'TTL' },
  ExpressionAttributeValues: {
    ':one': 1, ':limit': 3,
    ':ttl': bucket + 120, // expire after 2 minutes
  },
}));
// ConditionalCheckFailedException → throw new Error('RATE_LIMIT_EXCEEDED')
```

### Session State Additions for Moderation

The `useSessionState` reducer needs these additions:

```typescript
// New action types in SessionAction union:
| { type: 'QUESTION_BANNED'; payload: { questionId: string } }
| { type: 'PARTICIPANT_BANNED'; payload: { fingerprint: string } }
| { type: 'QUESTION_DOWNVOTED'; payload: { questionId: string; downvoteCount: number; isHidden: boolean } }

// New top-level state:
interface SessionState {
  snippets: Snippet[];
  questions: Question[];
  replies: Reply[];
  bannedFingerprints: Set<string>; // NEW — for participant ban enforcement
}
```

---

## Existing Code Inventory (What's Already Done)

This is critical context for the planner — do not re-implement these:

| What | Where | Notes |
|------|-------|-------|
| Device fingerprint generation | `src/hooks/use-fingerprint.ts` | `nasqa_fingerprint` localStorage UUID; already passed to all mutations |
| `downvoteCount` DynamoDB field | `packages/core/src/types.ts` QuestionItem | Exists, value always `0` currently |
| `isHidden` DynamoDB field | same | Exists, always `false` currently |
| `isBanned` DynamoDB field | same | Exists, always `false` currently |
| `authorName` on Question type | same | Exists as `optional string` |
| `PARTICIPANT_BANNED` event type | `packages/core/src/types.ts` SessionEventType enum | Declared, never dispatched |
| `downvoteCount` in GraphQL schema | `infra/schema.graphql` | Present on Question type |
| `isHidden`, `isBanned` in schema | same | Present |
| `PARTICIPANT_BANNED` in schema | same | In SessionEventType enum |
| next-intl middleware | `src/middleware.ts` | Already running, locales configured |
| `getMessages()` in layout | `src/app/[locale]/layout.tsx` | Already wired with NextIntlClientProvider |
| es.json, pt.json | `packages/frontend/messages/` | Exist but only have landing + common + session keys |
| `useTranslations` in SessionShell | `session-shell.tsx` | Already uses `t('clipboard')`, `t('qa')` |
| `fingerprint` prop on QuestionCard | `question-card.tsx` | Already passed, used for "You" badge |
| Host actions menu on QuestionCard | `question-card.tsx` | Already has MoreVertical menu with disabled "Delete" stub |
| `isHost` prop through QAPanel | `qa-panel.tsx`, `question-card.tsx` | Full chain already set up |
| `hostSecretHash` in mutations | All host mutations | Already threaded through the stack |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| next-intl middleware config inline | `defineRouting` + `createNavigation` | next-intl v3/v4 | Centralized routing config; `useRouter`/`usePathname` must be imported from custom navigation file, not `next-intl` directly |
| next-intl session cookie (default) | next-intl persistent cookie via `localeCookie: { maxAge }` | v3+ | Without maxAge, cookie expires when browser closes; set maxAge for user's "remember preference" requirement |

**Deprecated/outdated:**
- `createSharedPathnamesNavigation`: Replaced by `createNavigation` in next-intl v3+. Use `createNavigation` from `next-intl/navigation`.

---

## Open Questions

1. **Does `@/i18n/navigation.ts` already exist?**
   - What we know: The middleware uses `createMiddleware` directly (old pattern). The `session-shell.tsx` uses `useTranslations` from `next-intl` (correct). Nothing imports from `@/i18n/navigation` yet.
   - What's unclear: Whether the project has already set up `createNavigation` or still needs it.
   - Recommendation: The planner should check and create `src/i18n/routing.ts` + `src/i18n/navigation.ts` as part of the i18n plan wave. The language switcher requires `useRouter` from this file.

2. **Downvote mutual exclusivity atomicity**
   - What we know: DynamoDB `UpdateCommand` can do multiple `ADD` and `DELETE` set operations in one expression.
   - What's unclear: Whether removing from `voters` set (upvoters) when a downvote is cast requires knowing if the fingerprint was in `voters` at all — a DELETE on a non-existent set member is a no-op, so this is safe.
   - Recommendation: Single `UpdateCommand` with combined expression is the correct approach; no transaction needed.

3. **`banParticipant` broadcast scope**
   - What we know: `PARTICIPANT_BANNED` is in the schema's event enum. The subscription already includes all mutations.
   - What's unclear: Should the ban event broadcast to all participants (so their UI hides content immediately) or only be enforced server-side?
   - Recommendation: Broadcast `PARTICIPANT_BANNED { fingerprint }` to all subscribers so banned content is hidden immediately for all participants without a page reload. This matches the "instantly hidden for all" requirement.

---

## Sources

### Primary (HIGH confidence)
- [next-intl routing configuration docs](https://next-intl.dev/docs/routing/configuration) — defineRouting, localeCookie, locale detection
- [next-intl navigation APIs docs](https://next-intl.dev/docs/routing/navigation) — createNavigation, useRouter, locale switching
- [next-intl middleware docs](https://next-intl.dev/docs/routing/middleware) — NEXT_LOCALE cookie behavior
- Codebase: `infra/schema.graphql` — confirmed moderation fields, PARTICIPANT_BANNED enum member
- Codebase: `packages/core/src/types.ts` — confirmed all application interfaces have moderation fields
- Codebase: `packages/functions/src/resolvers/qa.ts` — confirmed DynamoDB patterns for atomic updates and conditional expressions
- Codebase: `packages/frontend/src/hooks/use-fingerprint.ts` — fingerprint already implemented

### Secondary (MEDIUM confidence)
- [Building a Distributed Rate Limiter with Amazon DynamoDB](https://medium.com/@roschin.roman/building-a-distributed-rate-limiter-with-amazon-dynamodb-4bc7005467fd) — minute-bucket pattern with atomic counter
- [next-intl GitHub Discussion #1213](https://github.com/amannn/next-intl/discussions/1213) — localeCookie maxAge configuration

### Tertiary (LOW confidence)
- AppSync CloudWatch connection count metrics — confirmed to exist but NOT used (user decision resolves this with voter-based threshold)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies already installed and in use
- Architecture patterns: HIGH — moderation fields pre-wired in schema/types; rate limiting DynamoDB pattern is well-established
- Pitfalls: HIGH — derived from direct codebase inspection of existing patterns and known AppSync/DynamoDB behaviors
- i18n language switcher: HIGH — next-intl docs confirm `router.replace(pathname, { locale })` pattern

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable libraries; next-intl v4 API is stable)
