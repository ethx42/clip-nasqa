# Architecture Patterns

**Domain:** Real-time presentation session tool (live clipboard + Q&A)
**Researched:** 2026-03-13
**Confidence:** HIGH (based on official AWS AppSync docs + Next.js 16 official docs)

---

## Recommended Architecture

### System Diagram

```
Browser (Participant/Host)
     |
     |  HTTPS (initial load, mutations)
     |  WSS (real-time subscription)
     v
[Next.js App on AWS Lambda / OpenNext]
     |
     |  GraphQL HTTP (mutations/queries)
     |  GraphQL WebSocket (subscriptions via AppSync)
     v
[AWS AppSync] ←— triggers —→ [Subscription Fanout]
     |
     |  Lambda Invoke
     v
[Lambda Resolvers] ── DynamoDB SDK ──> [DynamoDB Single Table]
```

### Topology Summary

- **Frontend**: Next.js 16 App Router on AWS (via SST Ion OpenNext adapter)
- **API**: AWS AppSync GraphQL (HTTP for mutations/queries, WebSocket for subscriptions)
- **Compute**: Lambda resolvers invoked by AppSync per operation
- **Storage**: Single DynamoDB table with TTL on all items
- **Auth**: API Key for AppSync access; host identity via hashed secret passed as mutation argument; participant identity via device fingerprint (localStorage UUID)

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `SessionShell` (Server Component) | Fetch initial session metadata from DynamoDB via direct query; render locale, theme, and i18n provider. Serves HTML with < 80kB JS payload. | DynamoDB (at render time via Lambda or direct fetch), passes serialized initial state as props to Client islands |
| `SubscriptionProvider` (Client Component) | Own the AppSync WebSocket connection; dispatch incoming `SessionUpdate` events to local Zustand/context store | AppSync WebSocket endpoint |
| `ClipboardFeed` (Client Component) | Render snippet list; apply optimistic inserts/deletes | Zustand store, AppSync mutation |
| `QuestionBoard` (Client Component) | Render questions sorted by upvotes; handle focus state, replies, hiding | Zustand store, AppSync mutation |
| `HostControls` (Client Component) | Post snippets, pin questions, ban participants; requires `hostSecret` from URL param | AppSync mutations |
| `VoteButton` (Client Component) | Optimistic upvote/downvote; localStorage gate for dedup | AppSync mutation, localStorage |
| `ModeratorLogic` | Pure function (no component): given vote counts and audience size, compute hide/ban thresholds | Called inside Zustand reducer |
| `AppSync Resolvers (Lambda)` | Validate input, write to DynamoDB, return mutation payload that triggers subscription | DynamoDB, AppSync (implicit subscription fanout) |
| `DynamoDB Single Table` | Source of truth; all entities with TTL | Lambda resolvers |
| `SST IaC (infra/)` | Provision DynamoDB, AppSync, Lambda, Next.js deployment | AWS |

---

## Data Flow

### Initial Page Load (SSR Path)

```
1. Browser requests /[locale]/live/[slug]
2. Next.js Server Component runs on Lambda (OpenNext)
3. Server Component queries DynamoDB directly (or via Lambda resolver):
   - PK: SESSION#{slug} | SK: METADATA → session title, isActive, createdAt
   - PK: SESSION#{slug} | SK: SNIPPET#* → up to 20 latest snippets (paginated)
   - PK: SESSION#{slug} | SK: QUESTION#* → up to 30 questions sorted by upvoteCount
4. Server Component renders HTML shell with hydration data as props
5. Browser receives HTML + RSC payload
6. Client Components hydrate; SubscriptionProvider opens WebSocket to AppSync
```

### Real-Time Mutation Path (e.g., post question)

```
1. User types question → clicks Submit
2. VoteButton/QuestionForm applies optimistic update to local Zustand store
   → Question appears immediately in UI with "pending" state (< 100ms)
3. Client sends GraphQL mutation to AppSync via HTTPS:
   POST /graphql { mutation postQuestion(...) { ... } }
   Authorization: x-api-key header
4. AppSync routes to Lambda resolver
5. Lambda resolver:
   a. Validates input with Zod schema (text length, fingerprint format)
   b. Checks rate limit (3 questions/min per fingerprint — via DynamoDB conditional write or separate counter item)
   c. Writes item to DynamoDB:
      PK: SESSION#{slug} | SK: QUESTION#{ulid} | TTL: now+86400
   d. Returns Question object to AppSync
6. AppSync broadcasts mutation result to all subscribers of onSessionUpdate(sessionId: slug)
7. All connected clients receive WebSocket message:
   { type: "data", payload: { data: { onSessionUpdate: { __typename: "QuestionAdded", question: {...} } } } }
8. SubscriptionProvider dispatches event → Zustand reducer merges into state
9. Optimistic item reconciled: replace pending item with confirmed item (match by client-generated tempId)
```

### Real-Time Subscription Path (receive events)

```
AppSync WebSocket message arrives
→ SubscriptionProvider parses payload
→ Dispatches to Zustand action by __typename:
   "SnippetAdded"    → prepend to snippets list, set as hero
   "SnippetDeleted"  → remove from snippets list
   "QuestionAdded"   → append to questions list
   "QuestionUpdated" → merge into existing question (upvoteCount, isHidden, isFocused)
   "ReplyAdded"      → append to question.replies
   "ParticipantBanned" → remove all items from banned fingerprint
→ Re-render affected Client Components via React state
```

### Host Authentication Flow

```
1. Host creates session → server generates UUIDv4 hostSecret
2. hostSecret displayed once; SHA-256 hash stored in DynamoDB (METADATA item)
3. Host URL: /live/[slug]?hostSecret=[raw-uuid]
4. On host actions (post snippet, ban, delete):
   a. Client sends hostSecret as mutation argument
   b. Lambda resolver computes SHA-256(hostSecret), compares to stored hash
   c. Mismatch → resolver returns auth error; mutation rejected
5. No JWT, no session token — stateless secret comparison per operation
```

---

## DynamoDB Single-Table Design

### Table Key Schema

```
Table: nasqa-live
PK (partition key): string
SK (sort key): string
TTL (attribute): number (Unix epoch, all items: createdAt + 86400)
```

### Access Patterns and Key Structure

| Entity | PK | SK | Purpose |
|--------|----|----|---------|
| Session Metadata | `SESSION#{slug}` | `METADATA` | Fetch session info by slug |
| Snippet | `SESSION#{slug}` | `SNIPPET#{ulid}` | List all snippets; delete by full key |
| Question | `SESSION#{slug}` | `QUESTION#{ulid}` | List all questions |
| Reply | `SESSION#{slug}` | `REPLY#{questionUlid}#{ulid}` | List replies for a question |
| BannedFingerprint | `SESSION#{slug}` | `BAN#{fingerprint}` | Check if participant is banned |
| RateLimit counter | `RATELIMIT#{slug}#{fingerprint}` | `MINUTE#{minuteEpoch}` | Question rate limiting (TTL: +60s) |

**Notes:**
- ULID is preferred over UUID for SK because it is time-ordered and lexicographically sortable — DynamoDB `Query` with `SK begins_with QUESTION#` returns questions in creation order without a GSI.
- No GSI is required for v1. All access patterns are covered by PK + SK prefix scan on a single partition.
- The RateLimit pattern uses a separate PK to avoid hot-partition issues on high-traffic sessions. Each fingerprint gets its own minute-bucket counter with a 60-second TTL.

### Item Shapes (abbreviated)

```typescript
// Session Metadata
{
  PK: "SESSION#myconf",
  SK: "METADATA",
  title: "My Conference Talk",
  hostSecretHash: "sha256hex...",
  isActive: true,
  audienceCount: 0,        // not tracked in DynamoDB — computed from AppSync connections
  createdAt: 1710000000,
  TTL: 1710086400
}

// Snippet
{
  PK: "SESSION#myconf",
  SK: "SNIPPET#01J...",   // ULID
  type: "code" | "text",
  content: "...",
  language: "typescript",  // null for text snippets
  createdAt: 1710001000,
  TTL: 1710086400
}

// Question
{
  PK: "SESSION#myconf",
  SK: "QUESTION#01J...",
  text: "...",
  fingerprint: "uuid-v4-from-localStorage",
  authorName: "Alice" | null,
  upvoteCount: 0,
  downvoteCount: 0,
  isHidden: false,
  isFocused: false,
  isBanned: false,
  createdAt: 1710002000,
  TTL: 1710086400
}

// Reply
{
  PK: "SESSION#myconf",
  SK: "REPLY#01J...question...#01J...reply...",
  text: "...",
  isHostReply: true,
  fingerprint: "...",
  createdAt: 1710003000,
  TTL: 1710086400
}
```

### Atomic Operations

- **Upvote**: `UpdateItem` with `ADD upvoteCount :1` — guaranteed atomic, no race condition
- **Downvote**: `ADD downvoteCount :1`
- **Auto-hide check**: Lambda resolver reads `upvoteCount + downvoteCount` and `downvoteCount / total >= 0.5`; if threshold met, sets `isHidden: true` in same `UpdateItem` call using conditional expression
- **Ban strike check**: Lambda resolver queries `SK begins_with BAN#` to count banned posts by fingerprint before writing

---

## AppSync Subscription Architecture

### Single Channel Pattern

Per session, all clients subscribe to one field:

```graphql
type Subscription {
  onSessionUpdate(sessionSlug: String!): SessionUpdate
    @aws_subscribe(mutations: [
      "postSnippet",
      "deleteSnippet",
      "clearClipboard",
      "postQuestion",
      "upvoteQuestion",
      "downvoteQuestion",
      "postReply",
      "setFocusedQuestion",
      "hideContent",
      "banParticipant"
    ])
}
```

### Union Type for Typed Events

AppSync does not natively support GraphQL union types as subscription return types in all configurations. The recommended pattern for this project is a **discriminated union via interface + `__typename`**:

```graphql
interface SessionEvent {
  eventType: SessionEventType!
  sessionSlug: String!
}

enum SessionEventType {
  SNIPPET_ADDED
  SNIPPET_DELETED
  CLIPBOARD_CLEARED
  QUESTION_ADDED
  QUESTION_UPDATED
  REPLY_ADDED
  PARTICIPANT_BANNED
}

# Concrete types implement the interface
type SnippetAddedEvent implements SessionEvent {
  eventType: SessionEventType!
  sessionSlug: String!
  snippet: Snippet!
}

type QuestionUpdatedEvent implements SessionEvent {
  eventType: SessionEventType!
  sessionSlug: String!
  question: Question!
}

# ... etc for each event type

# The subscription returns the base interface type;
# clients use __typename to discriminate
type Subscription {
  onSessionUpdate(sessionSlug: String!): SessionEvent
    @aws_subscribe(mutations: [...])
}
```

**Rationale for interface over union**: AppSync's JavaScript resolvers and subscription fanout work well with a single concrete return type per subscription field. Using an interface with `__typename` lets clients discriminate events without requiring multiple subscription connections. All mutations return a type that implements `SessionEvent`, and AppSync broadcasts the full object.

### Enhanced Filtering (server-side per-session isolation)

To prevent cross-session event leakage, use AppSync enhanced subscription filtering in the subscription resolver's response handler:

```javascript
// infra/resolvers/subscription-onSessionUpdate.js
import { extensions } from '@aws-appsync/utils';

export function request(ctx) {
  return { payload: null };
}

export function response(ctx) {
  // Filter: only deliver events where sessionSlug matches subscriber's argument
  extensions.setSubscriptionFilter({
    sessionSlug: { eq: ctx.args.sessionSlug }
  });
  return null;
}
```

This means one AppSync API handles all sessions; the server guarantees no cross-session leakage without separate topics per session.

### Connection Lifecycle

```
Client open WebSocket → wss://[id].appsync-realtime-api.[region].amazonaws.com/graphql
  Protocol: graphql-ws
  Auth header (base64): { "host": "...", "x-api-key": "..." }

→ Send: { "type": "connection_init" }
← Recv: { "type": "connection_ack", "payload": { "connectionTimeoutMs": 300000 } }

→ Send: { "type": "start", "id": "[uuid]", "payload": {
    "data": '{"query":"subscription { onSessionUpdate(sessionSlug: \"myconf\") { ... } }"}',
    "extensions": { "authorization": { "x-api-key": "...", "host": "..." } }
  }}
← Recv: { "type": "start_ack", "id": "[uuid]" }

← Recv data: { "type": "data", "id": "[uuid]", "payload": { "data": { "onSessionUpdate": { ... } } } }
```

**Keepalive**: AppSync sends `{ "type": "ka" }` periodically. Client must reconnect with exponential backoff if no ka within `connectionTimeoutMs` (default 5 minutes).

---

## Next.js Server / Client Component Boundary

### Rule: Real-Time Requires Client Components

AppSync WebSocket subscriptions use `useEffect`, `useState`, and browser APIs (`WebSocket`). These components must be marked `'use client'`.

### Boundary Map

```
app/[locale]/live/[slug]/page.tsx         ← Server Component (async)
  Fetches: session metadata + initial snippets + initial questions from DynamoDB
  Renders: <SessionShell initialData={...} />

components/SessionShell.tsx               ← Server Component
  Passes serialized initialData as props
  Renders: <SubscriptionProvider> as children wrapper
           <ClipboardFeed initialSnippets={...} />   ← Client Component
           <QuestionBoard initialQuestions={...} />   ← Client Component

components/SubscriptionProvider.tsx       ← 'use client'
  Owns: WebSocket connection to AppSync
  Manages: Zustand store or React Context for live state

components/ClipboardFeed.tsx              ← 'use client'
  Reads: snippets from Zustand store (merges initialSnippets + live updates)

components/HostControls.tsx               ← 'use client'
  Reads: hostSecret from URL search params (useSearchParams)
  Sends: mutations with hostSecret argument

components/VoteButton.tsx                 ← 'use client'
  Reads: localStorage for dedup gate
  Sends: upvote/downvote mutation
  Optimistic: immediate state update before mutation response
```

### Key Pattern: Initial Data + Live Merge

Server Components pass `initialData` (snapshots from DynamoDB) to Client Components as props. Client Components load `initialData` into local state on mount. Subscription events then merge on top of that baseline. This avoids a loading flash while keeping the real-time path clean.

```typescript
// ClipboardFeed.tsx — 'use client'
export function ClipboardFeed({ initialSnippets }: Props) {
  const [snippets, setSnippets] = useState(initialSnippets);

  useSessionEvent('SnippetAdded', (event) => {
    setSnippets(prev => [event.snippet, ...prev]);  // prepend, set as hero
  });

  useSessionEvent('SnippetDeleted', (event) => {
    setSnippets(prev => prev.filter(s => s.id !== event.snippetId));
  });

  return <SnippetList snippets={snippets} />;
}
```

### Bundle Size Constraint

The < 80kB gzipped JS payload target is achievable because:
- The page shell, locale provider, and static content are Server Components (zero client JS)
- `'use client'` boundary is pushed as deep as possible (VoteButton, not the whole page)
- Next.js code-splits Client Component bundles automatically

---

## Optimistic UI Patterns

### Pattern: Temp ID Reconciliation

```typescript
// 1. Generate client-side ID before mutation
const tempId = crypto.randomUUID();

// 2. Insert optimistic item into local state
setQuestions(prev => [...prev, { id: tempId, text, status: 'pending' }]);

// 3. Fire mutation
const result = await postQuestion({ text, fingerprint });

// 4. Replace optimistic item with confirmed item
setQuestions(prev =>
  prev.map(q => q.id === tempId ? { ...result.question, status: 'confirmed' } : q)
);
```

### Pattern: Subscription Deduplication

Because the same user's mutation triggers both a local optimistic update AND a WebSocket broadcast, the subscription handler must skip events already applied locally:

```typescript
// In subscription handler
if (confirmedIds.has(event.question.id)) return;  // already applied via optimistic path
```

The confirmed ID is added to a Set when the mutation response resolves, before the WebSocket event arrives (optimistic write wins; subscription event is a no-op for originator).

### Pattern: Upvote Dedup via localStorage

```typescript
const VOTE_KEY = `nasqa:votes:${sessionSlug}`;

function getVotedSet(): Set<string> {
  return new Set(JSON.parse(localStorage.getItem(VOTE_KEY) ?? '[]'));
}

function recordVote(questionId: string) {
  const voted = getVotedSet();
  voted.add(questionId);
  localStorage.setItem(VOTE_KEY, JSON.stringify([...voted]));
}

// VoteButton checks getVotedSet().has(questionId) before allowing upvote
```

---

## Device Fingerprinting for Anonymous Moderation

### Approach: localStorage UUID (chosen over IP)

The PROJECT.md explicitly states IP-based tracking would cause false positives on shared conference WiFi. The fingerprint is a UUIDv4 generated once and persisted in `localStorage`.

```typescript
// lib/fingerprint.ts — client only
const FP_KEY = 'nasqa:fingerprint';

export function getFingerprint(): string {
  let fp = localStorage.getItem(FP_KEY);
  if (!fp) {
    fp = crypto.randomUUID();
    localStorage.setItem(FP_KEY, fp);
  }
  return fp;
}
```

**Limitations (acknowledged in design)**:
- Private/incognito mode generates a new fingerprint each session
- Clearing localStorage resets identity
- These are acceptable tradeoffs for a 24-hour ephemeral session tool

**Where fingerprint is used**:
- Sent as argument in `postQuestion`, `postReply`, `upvoteQuestion`, `downvoteQuestion` mutations
- Stored on DynamoDB Question/Reply items as `fingerprint` attribute
- Auto-ban logic: Lambda resolver counts `isBanned: true` items with matching fingerprint; blocks posting if count >= 3
- Host ban: creates `BAN#{fingerprint}` item in DynamoDB; Lambda checks existence before allowing writes

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Multiple Subscriptions Per Feature

**What goes wrong:** Opening one WebSocket per feature (snippets subscription, questions subscription, votes subscription) multiplies connection overhead.

**Why bad:** AppSync charges per WebSocket minute. 500 participants × 3 connections = 1,500 WebSocket connections instead of 500. Also increases reconnection complexity.

**Instead:** Single `onSessionUpdate` subscription per client carrying all event types, discriminated by `__typename` (or `eventType` field).

### Anti-Pattern 2: DynamoDB Multi-Table Design

**What goes wrong:** Separate tables for Sessions, Snippets, Questions, Replies requires multiple network round-trips for initial load.

**Why bad:** Loading a session page requires 4 parallel DynamoDB calls minimum. Single-table design lets you batch all entities in one `Query` on `PK = SESSION#{slug}`.

**Instead:** Single table with composite SK prefixes.

### Anti-Pattern 3: Polling Instead of Subscriptions

**What goes wrong:** Using `setInterval` + React Query `refetchInterval` instead of WebSocket.

**Why bad:** 500 clients polling every 1s = 500 req/s against Lambda/DynamoDB. WebSocket subscription fanout is handled by AppSync, not your Lambda, so marginal cost per additional subscriber is near zero.

**Instead:** AppSync subscription with single persistent WebSocket per client.

### Anti-Pattern 4: Server Component for Real-Time State

**What goes wrong:** Putting subscription logic in a Server Component or API route handler.

**Why bad:** Server Components run once at request time; they cannot maintain a persistent WebSocket connection or push updates. WebSocket connections must live in the browser.

**Instead:** Server Component handles initial SSR data load; Client Component (`'use client'`) owns WebSocket lifecycle.

### Anti-Pattern 5: Optimistic Updates Without Temp ID

**What goes wrong:** Applying optimistic update, then receiving the WebSocket broadcast of the same mutation and applying it again → duplicate items in the list.

**Why bad:** Questions or snippets appear twice until the next page load.

**Instead:** Use a `tempId` for optimistic items; when mutation confirms, store confirmed ID in a dedup set. Subscription handler checks dedup set before merging.

### Anti-Pattern 6: Storing hostSecret in Client State (non-URL)

**What goes wrong:** Storing the raw hostSecret in React state or localStorage without the URL.

**Why bad:** If the host closes and reopens the tab, the secret is lost and they cannot manage their session.

**Instead:** Keep hostSecret in the URL as a query param (`?hostSecret=uuid`). The host can bookmark the URL for re-entry. Never store it in DynamoDB (store only the SHA-256 hash).

---

## Scalability Considerations

| Concern | At 50 users | At 500 users | At 5,000 users |
|---------|-------------|--------------|----------------|
| DynamoDB reads | Single partition — fine | Single partition per session — fine | Multiple concurrent sessions, each on own partition — fine |
| AppSync subscriptions | 50 WebSocket connections — trivial | 500 connections — within AppSync limits | 5,000 connections — AppSync scales automatically; consider soft limits |
| Mutation fanout latency | < 50ms | < 100ms | < 200ms (AppSync-managed, not Lambda) |
| Lambda cold starts | Negligible (few req/s) | Negligible (< 10 req/s per session) | May need provisioned concurrency if spike |
| Downvote threshold accuracy | Accurate (50% of 50) | Accurate (50% of 500) | Accurate — atomic increments ensure consistency |

**Scale target is 50-500 concurrent participants per session.** The architecture is well within comfortable operating range for this target. No DynamoDB DAX, ElastiCache, or AppSync caching is required for v1.

---

## Suggested Build Order (Phase Dependencies)

Dependencies flow top-to-bottom; each layer must exist before the next is buildable:

```
1. FOUNDATION
   ├── DynamoDB single table + SST IaC provisioning
   ├── AppSync API provisioned with API Key auth
   ├── Stub GraphQL schema (Session, Snippet, Question types)
   └── @nasqa/core types + Zod schemas for all entities

2. MUTATION LAYER (no real-time yet)
   ├── Lambda resolver: createSession → writes METADATA item
   ├── Lambda resolver: postSnippet → writes SNIPPET#* item
   ├── Lambda resolver: postQuestion → writes QUESTION#* item
   ├── Lambda resolver: upvoteQuestion → atomic ADD
   └── Validation (Zod) + host secret hashing in resolvers

3. SUBSCRIPTION LAYER
   ├── onSessionUpdate subscription field in schema
   ├── @aws_subscribe directive wired to all mutations
   ├── Enhanced filter resolver (sessionSlug filter)
   └── SubscriptionProvider Client Component (WebSocket lifecycle)

4. FRONTEND SHELL
   ├── Next.js route: /[locale]/live/[slug]
   ├── Server Component: initial DynamoDB read → SSR hydration
   ├── ClipboardFeed Client Component
   ├── QuestionBoard Client Component
   └── VoteButton + localStorage dedup

5. HOST FEATURES
   ├── HostControls Client Component (reads hostSecret from URL)
   ├── Lambda: deleteSnippet, clearClipboard, setFocusedQuestion
   ├── Lambda: banParticipant → writes BAN#{fingerprint} item
   └── Host auth (SHA-256 comparison) in every host mutation

6. MODERATION + POLISH
   ├── Auto-hide logic (50% downvote threshold in Lambda)
   ├── Auto-ban logic (3-strike check in Lambda)
   ├── Optimistic UI reconciliation (tempId pattern)
   ├── Rate limiting (per-fingerprint minute-bucket in DynamoDB)
   └── i18n + theme + Shiki highlighting
```

---

## Sources

- AWS AppSync Real-Time Subscription Architecture: https://docs.aws.amazon.com/appsync/latest/devguide/aws-appsync-real-time-data.html (HIGH confidence — official docs, verified 2026-03-13)
- AWS AppSync Enhanced Subscription Filtering: https://docs.aws.amazon.com/appsync/latest/devguide/aws-appsync-real-time-enhanced-filtering.html (HIGH confidence — official docs)
- AWS AppSync WebSocket Client Protocol: https://docs.aws.amazon.com/appsync/latest/devguide/real-time-websocket-client.html (HIGH confidence — official docs)
- Next.js Server and Client Components: https://nextjs.org/docs/app/getting-started/server-and-client-components (HIGH confidence — Next.js 16.1.6 official docs, verified 2026-02-27)
- DynamoDB Single-Table Design Principles: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html (HIGH confidence — official AWS docs)
- Existing codebase analysis: `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STACK.md` (HIGH confidence — direct codebase inspection 2026-03-13)
