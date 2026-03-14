# Project Research Summary

**Project:** Nasqa Live — real-time presentation session tool (live clipboard + Q&A)
**Domain:** Live audience interaction / developer tooling
**Researched:** 2026-03-13
**Confidence:** HIGH (stack verified from installed packages; architecture from official docs; features from authoritative PROJECT.md; pitfalls from official AWS docs)

## Executive Summary

Nasqa Live is a developer-focused live session tool that solves a gap no existing product addresses: sharing code with an audience in real time during a talk or workshop, combined with structured Q&A. The recommended architecture is a single AppSync GraphQL API driving one WebSocket subscription channel per session, backed by a DynamoDB single-table design with 24-hour TTL, deployed via SST Ion on AWS. Every design decision in the research — from single-table DynamoDB to single union-type subscription channel — is optimized for the 50–500 concurrent participant target in ephemeral conference sessions. The codebase is already scaffolded with the correct technology versions; the work is building features, not selecting infrastructure.

The core product thesis is a pull-not-push clipboard model: the host pushes code to the audience's screen rather than the audience navigating to find it. This, combined with Shiki server-side syntax highlighting and the anonymous-by-default participant model, is what differentiates Nasqa from Slido, Mentimeter, and Pigeonhole Live, none of which have any code-aware features. The Q&A feed, upvoting, and host moderation are table stakes; the live clipboard is the hook that earns adoption.

The highest-risk technical areas are (1) AppSync subscription session isolation — a single wrong `null` argument leaks all sessions' events to all clients — and (2) the optimistic UI reconciliation pattern where local state and subscription-delivered server state must merge without duplication or phantom values. Both risks are mitigated by well-understood patterns documented in the architecture research: server-side enhanced subscription filtering by `sessionSlug`, and temp-ID-based optimistic reconciliation with an explicit dedup set.

## Key Findings

### Recommended Stack

The stack is fully scaffolded. All installed versions are pinned and must not be changed without testing: Next.js 16.1.6 with React 19.2.3 (App Router, Server Components, `useOptimistic`), AppSync via SST Ion 4.2.7, DynamoDB with the AWS SDK v3 modular client, Zod 4.3.6 for shared validation, and Tailwind CSS v4 with shadcn/base-ui for UI. Three packages are not yet installed and are required before any feature work: `ulid` (sortable DynamoDB IDs), `qrcode` (server-side SVG generation), and `@aws-amplify/api-graphql` (AppSync WebSocket subscription client).

**Core technologies:**
- **Next.js 16 + React 19:** App Router with Server Components for the SSR shell (sub-80kB payload); Client Components own all real-time state
- **AWS AppSync:** GraphQL API + managed WebSocket subscriptions; single `onSessionUpdate` channel per session handles all event types via discriminated union
- **DynamoDB (single-table):** All session entities behind `PK: SESSION#{slug}`; On-Demand billing; ULID sort keys for chronological ordering without GSIs; 24h TTL on all items
- **SST Ion v4:** Single-command `sst deploy`; Pulumi backend eliminates CloudFormation drift from older SST versions
- **Zod v4:** Shared validation schemas in `@nasqa/core`; same schema validates AppSync resolver input and frontend forms
- **Shiki v4:** Server-side only, never shipped to client; dual-theme CSS variable output eliminates layout shift on dark/light toggle
- **`@aws-amplify/api-graphql`:** The only supported AppSync WebSocket subscription client; handles keep-alive, reconnect, and exponential backoff automatically

### Expected Features

The MVP must prove one thing: a speaker pushes code and the audience sees it instantly, asks questions, and the best ones surface to the top. Everything else is Phase 2 or later.

**Must have (table stakes — MVP blocks on these):**
- Session creation with shareable slug + QR code — without this, nothing else works
- Anonymous participation, no signup required — friction kills adoption at a conference
- Real-time snippet + question delivery via AppSync subscriptions
- Upvoting with vote-sorted Q&A feed — without sorting, the list is noise
- Host moderation: delete content, ban participants — minimum viable trust model
- Device fingerprint for identity — prerequisite for upvote dedup and ban enforcement
- 24-hour TTL auto-expiry — operational hygiene and privacy feature from day one
- Mobile-responsive participant view — most audience members join on phones
- Visual "live" connection indicator — participants must know they are connected

**Should have (differentiators — Phase 2):**
- Live code clipboard with Shiki syntax highlighting — the core hook of the product
- Host-pushed clipboard model (audience does not navigate; code appears)
- Hero prominence for the latest snippet — mirrors presenter's current focus
- Focus mode (pin a question to signal "we are answering this now")
- Speaker reply badge (emerald border + "Speaker" label)
- Community downvote auto-hide (50% threshold against connected audience)
- Auto-ban on 3-strike rule via device fingerprint
- i18n (es + pt in addition to en)
- Sub-100ms optimistic UI (correct first, fast second)

**Defer (v2+ or Phase 3+):**
- Landing/marketing page — ship to early users first, then market
- IaC polish / zero-ops `sst deploy` guide — scaffolding exists; document later
- Polls, word clouds, reactions, slide upload — anti-features that dilute the product

**Anti-features (never build):**
- User accounts, persistent login, email notifications, native mobile app, nested threading, export/download, AI summarization, admin dashboard, audience clipboard posting

### Architecture Approach

The architecture uses a strict Server/Client Component boundary in Next.js: the session page route is a Server Component that reads DynamoDB directly at render time and passes initial state as props to Client Component islands. The `SubscriptionProvider` Client Component owns the AppSync WebSocket lifecycle and writes incoming events to local state (Zustand or React Context), which all other Client Components consume. This yields SSR-fast initial loads with zero real-time logic on the server. All mutations go through AppSync HTTP, which invokes Lambda resolvers that validate with Zod, write to DynamoDB, and implicitly trigger subscription fanout. No VTL resolvers — all Lambda, all TypeScript.

**Major components:**
1. **`SessionShell` (Server Component)** — DynamoDB initial read, SSR hydration, locale/theme providers; zero real-time code
2. **`SubscriptionProvider` (Client Component)** — AppSync WebSocket lifecycle; dispatches `SessionUpdate` events to local state by `eventType`
3. **`ClipboardFeed` + `QuestionBoard` (Client Components)** — merge `initialData` props from SSR with live subscription events; own optimistic UI state
4. **`HostControls` (Client Component)** — reads `hostSecret` from URL `?hostSecret=` param; sends all host mutations with the raw secret (Lambda compares SHA-256 hash)
5. **Lambda Resolvers** — Zod validation + DynamoDB writes + host secret hash comparison per operation; one resolver per mutation
6. **DynamoDB Single Table** — `SESSION#{slug}` partition key; ULID sort keys; On-Demand billing; TTL on every item
7. **AppSync GraphQL API** — schema with `SessionEvent` interface + `@aws_subscribe` directives; enhanced subscription filter enforces `sessionSlug` isolation server-side

### Critical Pitfalls

1. **AppSync subscription session isolation (Pitfall 2, Critical)** — passing `null` as the `sessionSlug` subscription argument subscribes to ALL sessions. Prevention: always pass a non-null slug AND add a server-side enhanced filter resolver that rejects events with mismatched `sessionSlug`. Test with two concurrent sessions before building any feature.

2. **Stale WebSocket connections on conference WiFi (Pitfall 1, Critical)** — AppSync sends `ka` keep-alives; if the client does not monitor them, participants silently stop receiving updates with no error. Prevention: use `@aws-amplify/api-graphql` which handles reconnect/backoff automatically; expose a visible "Reconnecting..." indicator.

3. **Shiki in the client bundle (Pitfall 6, Critical)** — importing Shiki client-side violates the 80kB JS budget (TextMate grammars are multi-MB). Prevention: render Shiki exclusively in Server Components using `codeToHtml` with `defaultColor: false`; only pre-rendered HTML reaches the client.

4. **Optimistic UI duplicate items (Pitfall 7, Moderate)** — the originating client receives both its own optimistic update AND the WebSocket broadcast of the same mutation, causing duplicate items. Prevention: use a `tempId` for optimistic items; add confirmed IDs to a dedup Set; subscription handler skips events already in the Set.

5. **DynamoDB TTL does not delete immediately (Pitfall 5, Critical)** — expired items remain queryable for hours or days after TTL. Prevention: filter all read paths with `expiresAt > :now`; do not rely on TTL for access control or slug uniqueness.

## Implications for Roadmap

Based on the feature dependency graph in FEATURES.md and the build order in ARCHITECTURE.md, the natural phase structure flows from infrastructure outward:

### Phase 1: Foundation and Infrastructure

**Rationale:** Everything else depends on a working DynamoDB table, AppSync API, and Lambda resolver infrastructure. No feature work is possible without this layer. Establishing it first also surfaces the SST Ion AppSync configuration risks early, when there is nothing else to break.

**Delivers:** Provisionable infrastructure (`sst dev` + `sst deploy`); stub GraphQL schema with all types defined; shared `@nasqa/core` Zod schemas and TypeScript types; DynamoDB single-table with On-Demand billing and TTL enabled; AppSync API Key auth; install missing packages (`ulid`, `qrcode`, `@aws-amplify/api-graphql`)

**Addresses:** Table stakes prerequisite (session infrastructure); feature dependency root node

**Avoids:** DynamoDB hot partition (Pitfall 3) — On-Demand billing from the start; GSI throttling (Pitfall 4) — no GSIs in v1; TTL false safety (Pitfall 5) — add `expiresAt` filter to all read paths immediately

**Research flag:** NEEDS RESEARCH — verify SST Ion v4 WAF ACL attachment to AppSync (MEDIUM confidence in STACK.md); verify `@aws-amplify/api-graphql` v6 subscription API surface before writing `SubscriptionProvider`

### Phase 2: Session Creation and Host Authentication

**Rationale:** Session creation is the entry point for every user flow. Host authentication (SHA-256 secret comparison) must be correct before any host mutations exist. Slug collision prevention must be implemented here, not retrofitted later.

**Delivers:** `createSession` Lambda resolver (writes `METADATA` item, returns slug + raw secret); host URL with `?hostSecret=` param; QR code SVG (server-side, `qrcode` package); slug uniqueness via UUID fragment; SHA-256 hash storage

**Addresses:** Session creation + QR code join flow (table stakes); anonymous no-signup model

**Avoids:** Host secret in URL logs (Pitfall 10) — evaluate hash fragment approach; slug collision (Pitfall 14) — UUID fragment appended to slug from day one; secret stored only as SHA-256 hash, never plaintext

**Research flag:** Standard patterns — host auth via hashed secret and QR code generation are well-documented

### Phase 3: Real-Time Subscription Channel

**Rationale:** The subscription channel is the infrastructure that all real-time features ride on. Build it once, correctly, before building any feature that depends on it. Session isolation must be tested with two concurrent sessions before any audience-facing feature ships.

**Delivers:** `onSessionUpdate` subscription field with `@aws_subscribe` directive; `SessionEvent` interface with `eventType` discriminator; enhanced subscription filter resolver (server-side `sessionSlug` isolation); `SubscriptionProvider` Client Component with `@aws-amplify/api-graphql`; keep-alive monitoring and reconnect logic; visible "Live / Reconnecting" connection indicator

**Addresses:** Real-time delivery (sub-200ms target); anonymous read path for lurkers

**Avoids:** Cross-session leakage (Pitfall 2) — server-side filter is non-negotiable; stale connections (Pitfall 1) — Amplify client handles reconnect; 200 subscriptions/connection limit (Pitfall 11) — single union channel enforced; server-side slug filter bypass (Pitfall 15)

**Research flag:** NEEDS RESEARCH — validate AppSync enhanced filtering JavaScript resolver API with current SST Ion AppSync component before implementation

### Phase 4: Session View (SSR Shell + Read Path)

**Rationale:** Once the subscription channel works, build the page that participants land on. The SSR initial load pattern (Server Component reads DynamoDB, passes `initialData` to Client Components, subscription merges on top) must be established before any feature-specific Client Components are added.

**Delivers:** Next.js route `/[locale]/live/[slug]`; `SessionShell` Server Component with initial DynamoDB read (METADATA + snippets + questions); `ClipboardFeed` + `QuestionBoard` Client Components wired to `SubscriptionProvider`; device fingerprint (`localStorage` UUID with Safari Private Browsing guard); `VoteButton` with `localStorage` dedup; lurker read path (no interaction required); dark/light theme with no flash

**Addresses:** Mobile-responsive participant view; content visible without interaction; visual "live" indicator; 24h TTL display

**Avoids:** Server Component for real-time state anti-pattern (ARCHITECTURE.md); Safari Private Browsing crash (Pitfall 13) — wrap all `localStorage` in try-catch from the start; Shiki in client bundle (Pitfall 6) — server-render only

**Research flag:** Standard patterns — Next.js Server/Client Component boundary is well-documented

### Phase 5: Core Q&A Loop

**Rationale:** With the read path working, add the write path for participants. Upvoting, question submission, and host moderation are the core Q&A loop. Rate limiting and vote dedup must ship with this phase, not later.

**Delivers:** `postQuestion` Lambda resolver (Zod validation, rate-limit counter in DynamoDB, fingerprint stored); `upvoteQuestion` Lambda resolver (atomic `ADD upvoteCount :1`); `downvoteQuestion` Lambda resolver; `QuestionBoard` sorted by upvotes; host delete/hide mutations; `HostControls` Client Component (reads `hostSecret` from URL); rate limiting (3 questions/min per fingerprint via DynamoDB minute-bucket counter); optimistic UI for upvotes with temp-ID reconciliation

**Addresses:** Question submission + upvoting + vote-sorted feed (all table stakes); host moderation minimum viable trust model

**Avoids:** Optimistic duplicate items (Pitfall 7) — temp-ID pattern implemented from the start; fingerprint spoofing (Pitfall 8) — rate limits applied server-side, not just client-side

**Research flag:** Standard patterns — DynamoDB atomic increments and rate-limit counter patterns are well-documented

### Phase 6: Live Clipboard (Core Differentiator)

**Rationale:** The clipboard is the product's core differentiator and the reason to use Nasqa over Slido or Mentimeter. It ships after the Q&A loop is solid because it depends on the same subscription channel, the same host auth model, and the same Client Component patterns — building it on proven infrastructure reduces risk.

**Delivers:** `postSnippet` Lambda resolver (host-only, Zod validates language attribute); `deleteSnippet` + `clearClipboard` resolvers; `ClipboardFeed` Client Component with hero prominence (latest snippet as large top card); Shiki server-side highlighting with dual-theme CSS variable output; language detection/selection in host UI; optimistic snippet insert

**Addresses:** Live code clipboard with syntax highlighting (core differentiator); host-pushed clipboard model; hero prominence; dual theme with no layout shift; server-rendered QR code

**Avoids:** Shiki bundle size (Pitfall 6) — enforced by rendering in Server Component; layout shift on theme toggle — dual-theme `codeToHtml` with `defaultColor: false`

**Research flag:** NEEDS RESEARCH — verify Shiki v4 `createHighlighterCore` with `createOnigurumaEngine` in a Next.js Server Component context; test bundle output with `@next/bundle-analyzer` to confirm Shiki is absent from client chunks

### Phase 7: Advanced Moderation and Community Features

**Rationale:** Community downvote moderation, auto-ban, focus mode, and speaker replies are differentiators that require the basic Q&A loop to be solid first. The connected-count denominator problem (Pitfall 12) makes downvote threshold calculation the most complex piece in this phase.

**Delivers:** Community downvote auto-hide (50% threshold against connected count); auto-ban 3-strike logic in Lambda; connected participant count tracking (DynamoDB atomic increment/decrement via AppSync connection/disconnection events); focus mode (`isFocused` toggle + pulsing glow); speaker reply with emerald border + badge; optional participant name (localStorage `nasqa:name` field)

**Addresses:** Community-driven downvote moderation (differentiator); auto-ban for repeat bad actors; focus mode; speaker reply badge; one-level reply threading

**Avoids:** Wrong downvote denominator (Pitfall 12) — track connected count via AppSync connection events from the start of this phase; fingerprint spoofing via rapid downvotes (Pitfall 8) — rate-limit downvotes at 5/min per fingerprint

**Research flag:** NEEDS RESEARCH — AppSync connection/disconnection event handling for connected-count tracking is not well-documented; verify Lambda resolver access to connection lifecycle events in SST Ion

### Phase 8: i18n, Polish, and Deployment Hardening

**Rationale:** i18n and deployment hardening are the final layer. They wrap the completed product without changing any feature behavior. Doing them last avoids retrofitting locale-aware routing into every route as it is built.

**Delivers:** next-intl v4 middleware for `en/es/pt` locale routing; `getTranslations()` in all Server Components; `useTranslations()` in Client Components; WAF Web ACL rate limits (10/min host, 3/min public) attached to AppSync; `sst deploy` single-command deployment guide; bundle size audit (`< 80kB` gzipped confirmed); staging environment smoke test

**Addresses:** i18n (en/es/pt); rate limiting hardening (WAF); zero-ops deployment

**Avoids:** next-intl + CloudFront caching conflict (Pitfall 9) — lean middleware, `Cache-Control: no-store` on redirect responses, test on staging deploy not just `next dev`

**Research flag:** NEEDS RESEARCH — next-intl v4 middleware behavior in SST Ion CloudFront/Lambda@Edge context is LOW confidence; must test on a real staging SST deploy

### Phase Ordering Rationale

- Infrastructure must precede everything because AppSync, DynamoDB, and Lambda resolvers are required by every feature. Discovering SST Ion configuration issues in Phase 1 is cheap; discovering them in Phase 6 is expensive.
- Subscription channel (Phase 3) must precede any real-time feature. Session isolation correctness tested in Phase 3 protects every subsequent phase.
- Read path (Phase 4) before write path (Phase 5) ensures the display layer exists before mutations can populate it.
- Q&A loop (Phase 5) before Clipboard (Phase 6) because the Q&A infrastructure (host auth, rate limits, optimistic UI patterns) is shared by the clipboard and should be proven first. The clipboard also has the highest UX risk (Shiki bundle size) and benefits from the patterns established in Phase 5.
- Moderation (Phase 7) after Q&A (Phase 5) because downvote threshold depends on existing question + vote infrastructure.
- i18n last (Phase 8) to avoid retrofitting locale-aware routing into routes as they are built.

### Research Flags

Phases needing deeper research during planning:

- **Phase 1:** SST Ion WAF ACL attachment to AppSync (MEDIUM confidence); `@aws-amplify/api-graphql` v6 subscription API current surface (MEDIUM confidence)
- **Phase 3:** AppSync enhanced subscription filtering JavaScript resolver API compatibility with SST Ion AppSync component (MEDIUM confidence)
- **Phase 6:** Shiki v4 `createHighlighterCore` in Next.js Server Component context; confirm zero client-bundle footprint via bundle analyzer
- **Phase 7:** AppSync connection/disconnection lifecycle event access in Lambda resolvers for connected-count tracking (LOW confidence)
- **Phase 8:** next-intl v4 middleware in SST Ion CloudFront/Lambda@Edge context — must test on staging, not local dev (LOW confidence)

Phases with standard, well-documented patterns (skip research-phase):

- **Phase 2:** Session creation, SHA-256 hashing, QR code server-side generation — all well-documented
- **Phase 4:** Next.js Server/Client Component boundary, `initialData` + subscription merge pattern — official docs, HIGH confidence
- **Phase 5:** DynamoDB atomic increments, rate-limit counter pattern, temp-ID optimistic reconciliation — well-documented

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified from installed `package.json` files; alternatives evaluated with rationale |
| Features | MEDIUM | Table stakes from domain expertise (cutoff Aug 2025); PROJECT.md authoritative for Nasqa scope; competitive feature sets not verified against live product pages |
| Architecture | HIGH | Official AWS AppSync and Next.js documentation; DynamoDB official best practices; existing codebase analysis |
| Pitfalls | HIGH (critical), MEDIUM (moderate), LOW (minor) | Critical pitfalls verified via official AWS docs; moderate pitfalls from architectural reasoning + training data; Shiki + next-intl/SST interaction needs staging validation |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **`@aws-amplify/api-graphql` v6 subscription API:** The specific method signatures and configuration for AppSync WebSocket subscriptions in Amplify v6 should be verified against current Amplify Gen2 docs before writing `SubscriptionProvider`. The API may have changed since training data cutoff.
- **SST Ion WAF ACL attachment:** SST Ion v4 WAF resource support for AppSync should be verified in the SST Ion changelog/docs before committing to WAF as the rate-limiting strategy. If unsupported, the fallback is per-fingerprint DynamoDB minute-bucket rate limiting (already described in ARCHITECTURE.md).
- **next-intl + SST Ion CloudFront:** Must be validated in a real staging deployment, not local `next dev`. Do not assume local behavior matches production until this test passes.
- **AppSync connection lifecycle for connected-count:** The mechanism for tracking connected participant count via Lambda (connection/disconnection events) is LOW confidence. If not supported, the fallback is a fixed downvote threshold (e.g., 5 downvotes regardless of audience size) for MVP moderation.
- **Competitive feature verification:** Slido, Mentimeter, and Pigeonhole Live feature sets were based on training data (cutoff Aug 2025). If claiming competitive parity in marketing, verify against current product pages.

## Sources

### Primary (HIGH confidence)
- `/packages/frontend/package.json`, `/packages/functions/package.json`, root `package.json` — installed versions verified
- `.planning/PROJECT.md` — authoritative product requirements and constraints
- `.planning/codebase/STACK.md`, `.planning/codebase/ARCHITECTURE.md` — existing codebase analysis
- AWS AppSync Real-Time Subscription docs — https://docs.aws.amazon.com/appsync/latest/devguide/aws-appsync-real-time-data.html
- AWS AppSync Enhanced Subscription Filtering — https://docs.aws.amazon.com/appsync/latest/devguide/aws-appsync-real-time-enhanced-filtering.html
- AWS AppSync WebSocket Client Protocol — https://docs.aws.amazon.com/appsync/latest/devguide/real-time-websocket-client.html
- AWS AppSync Service Quotas — https://docs.aws.amazon.com/general/latest/gr/appsync.html
- AWS DynamoDB Partition Key Design — https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html
- AWS DynamoDB GSI — https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html
- AWS DynamoDB TTL — https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html
- Next.js Server and Client Components — https://nextjs.org/docs/app/getting-started/server-and-client-components

### Secondary (MEDIUM confidence)
- Domain knowledge of Slido, Mentimeter, Pigeonhole Live, Kahoot feature sets (training data, cutoff Aug 2025)
- next-intl v4 App Router routing — https://nextjs.org/docs/app/guides/internationalization
- Optimistic UI race condition patterns — architectural reasoning + training data
- Safari Private Browsing localStorage behavior — documented browser behavior
- URL query parameter logging risk — architectural reasoning

### Tertiary (LOW confidence)
- Shiki v4 `createHighlighterCore` bundle behavior in Next.js Server Components — needs validation against https://shiki.style/guide/bundles
- next-intl v4 + SST Ion CloudFront middleware interaction — needs staging deployment validation
- AppSync connection/disconnection lifecycle Lambda event access — needs validation against current SST Ion AppSync component docs

---
*Research completed: 2026-03-13*
*Ready for roadmap: yes*
