# Technology Stack

**Project:** Nasqa Live — real-time presentation session tool (live clipboard + Q&A)
**Researched:** 2026-03-13
**Confidence:** HIGH (all versions verified from actual installed package.json files in the codebase)

---

## Recommended Stack

All versions below are the versions already installed in the scaffolded codebase. Treat them as pinned
baselines; semver ranges in package.json allow patch/minor updates but the majors are fixed.

### Core Framework

| Technology | Installed Version | Purpose | Why |
|------------|-------------------|---------|-----|
| Next.js | 16.1.6 | Full-stack React framework | App Router + Server Components keeps initial JS payload under 80 kB. RSC renders session shell on the server; real-time hydration handled client-side only for the interactive feed. Non-negotiable per project constraint. |
| React | 19.2.3 | UI runtime | Required by Next.js 16. React 19 concurrent features (`useOptimistic`, Actions) enable the < 100 ms optimistic UI requirement without external libraries. |
| TypeScript | 5.x (devDep) | Type safety across all packages | Strict mode is on. Shared `@nasqa/core` package provides end-to-end type safety from DynamoDB shape → resolver → GraphQL → client. |

### Real-Time Layer

| Technology | Installed Version | Purpose | Why |
|------------|-------------------|---------|-----|
| AWS AppSync | managed (via SST) | GraphQL API + WebSocket subscriptions | Single subscription channel per session (`onSessionUpdate`) with a union-type `SessionUpdate` covers all event types (snippet, question, upvote, ban, focusToggle). AppSync handles connection management, automatic reconnect, and fan-out — no custom WebSocket server needed. Target: < 200 ms broadcast latency. |
| SST Ion | 4.2.7 | IaC — provisions AppSync, Lambda, DynamoDB | `sst.config.ts` single-command deploy. Ion (v4) uses Pulumi/Terraform under the hood rather than CDK, which eliminates CloudFormation drift issues seen in SST v2/v3. `sst dev` gives live Lambda function reload without re-deploy. |

### Database

| Technology | Installed Version | Purpose | Why |
|------------|-------------------|---------|-----|
| AWS DynamoDB | managed (via SST) | Primary data store | Single-table design with 24-hour TTL satisfies all session-scoped access patterns in 1-2 round trips. No cold-start latency from connection pooling (unlike RDS/Aurora). Atomic increment for upvote counts (`UpdateExpression ADD votes :one`) eliminates race conditions. |
| @aws-sdk/client-dynamodb | 3.1009.0 | Low-level DynamoDB client | Modular v3 SDK; tree-shaken to only what is imported. |
| @aws-sdk/lib-dynamodb | 3.1009.0 | DynamoDB Document client | Converts JS objects to/from DynamoDB attribute format automatically. Use `DynamoDBDocumentClient` over raw client for all resolver code. |

**DynamoDB single-table key design (confirmed in PROJECT.md):**

```
PK                  SK                        Entity
SESSION#<slug>      METADATA                  Session record (title, hostSecretHash, ttl, connectedCount)
SESSION#<slug>      SNIPPET#<ulid>            Snippet (content, language, createdAt, ttl)
SESSION#<slug>      QUESTION#<ulid>           Question (text, votes, downvotes, hidden, focused, authorToken, ttl)
SESSION#<slug>      QUESTION#<ulid>#REPLY#<ulid>  Reply (text, isSpeaker, authorToken, ttl)
SESSION#<slug>      BAN#<fingerprint>         Banned participant record
```

Use ULID (not UUID) for SK timestamp ordering — ULIDs are lexicographically sortable, enabling reverse-chron
queries without a GSI. Install `ulid` package when implementing the data layer.

### Lambda / Resolver Layer

| Technology | Installed Version | Purpose | Why |
|------------|-------------------|---------|-----|
| AWS Lambda | managed (via SST) | AppSync resolver runtime | Direct Lambda resolvers (not VTL) give full TypeScript with Zod validation at resolver entry. Keeps business logic testable and type-safe. Cold start budget: Lambda ARM (Graviton2) with 512 MB fits within AppSync's 10 s resolver timeout. |
| Zod | 4.3.6 | Input validation in resolvers + frontend | v4 is a ground-up rewrite with significant performance improvements over v3. Validates AppSync resolver arguments at the boundary before touching DynamoDB. Same schemas shared via `@nasqa/core` between frontend form validation and backend resolver validation — no duplication. |

### Frontend — Data Fetching

| Technology | Installed Version | Purpose | Why |
|------------|-------------------|---------|-----|
| @tanstack/react-query | 5.90.21 | Server state + query cache | Manages session data hydration and mutation lifecycle. For AppSync subscriptions, pair with a custom `useSubscription` hook that wraps the AWS Amplify `API.graphql` subscription observable — React Query itself does not subscribe; it owns the cache that subscription events write to. |

**Important pattern:** React Query is NOT the subscription manager. It owns the cache. The subscription
hook fires `queryClient.setQueryData(...)` on incoming events, which React Query propagates to all
mounted consumers. This keeps optimistic UI and server-state reconciliation in one place.

### Frontend — UI

| Technology | Installed Version | Purpose | Why |
|------------|-------------------|---------|-----|
| Tailwind CSS | 4.x | Utility-first styling | CSS-first config (no `tailwind.config.js` — uses `@theme` in globals.css). Tailwind v4 tree-shakes more aggressively than v3, which helps the < 80 kB bundle constraint. |
| shadcn | 4.0.6 | Copy-paste component registry | `base-nova` style with CSS variables. Components are owned and modified — no runtime dependency. Configured with `@base-ui/react` primitives. |
| @base-ui/react | 1.3.0 | Unstyled accessible primitives | Radix UI replacement. Powers shadcn components (Dialog, Popover, etc.) with WAI-ARIA baked in. Smaller bundle than Radix. |
| Framer Motion | 12.36.0 | Animations | Used for the "Hero" snippet prominence animation, pulsing focus glow, and optimistic UI transitions. Keep usage to layout animations and spring transitions — avoid `AnimatePresence` at list scale (50-500 Q&A items can cause jank). |
| Lucide React | 0.577.0 | Icons | Tree-shakeable SVG icons. Already configured in shadcn registry. |
| Sonner | 2.0.7 | Toast notifications | Lightweight toast library for host action feedback (snippet deleted, user banned, etc.). Renders outside React tree, safe for real-time event notifications. |
| clsx + tailwind-merge | 2.1.1 + 3.5.0 | Class composition | Standard `cn()` utility (`clsx` + `twMerge`). Already wired in `@/lib/utils`. |
| class-variance-authority | 0.7.1 | Component variant management | Used by shadcn button and other variant-heavy components. |
| tw-animate-css | 1.4.0 | Tailwind animation utilities | Additional CSS keyframe animations compatible with Tailwind v4. |

### Frontend — Internationalization

| Technology | Installed Version | Purpose | Why |
|------------|-------------------|---------|-----|
| next-intl | 4.8.3 | i18n routing and message lookup | v4 is the current release for Next.js App Router. Locale-based routing via middleware (`/en/`, `/es/`, `/pt/`). `getTranslations()` in Server Components, `useTranslations()` in Client Components. Covers UI chrome only — user-generated content is not translated. Browser locale auto-detection with `en` fallback. |

**next-intl v4 middleware pattern:**
```ts
// middleware.ts at packages/frontend root
import createMiddleware from "next-intl/middleware";
export default createMiddleware({
  locales: ["en", "es", "pt"],
  defaultLocale: "en",
});
export const config = { matcher: ["/((?!api|_next|.*\\..*).*)"] };
```

### Frontend — Theming

| Technology | Installed Version | Purpose | Why |
|------------|-------------------|---------|-----|
| next-themes | 0.4.6 | Dark/light mode | SSR-safe theme switching without flash. Works with Tailwind CSS v4 `dark:` variant. Wraps root layout with `ThemeProvider`. Theme tokens confirmed in PROJECT.md: Dark (Zinc-950/Zinc-50/Zinc-800), Light (White/Zinc-900/Zinc-200), Accent (Emerald-500). |

### Frontend — Code Highlighting

| Technology | Installed Version | Purpose | Why |
|------------|-------------------|---------|-----|
| Shiki | 4.0.2 | Syntax highlighting | v4 is the current release. Dual-theme support via `codeToHtml({ themes: { light, dark } })` with CSS variable output — eliminates layout shift on theme toggle (renders both themes, CSS `display` switches). Run Shiki **server-side only** (in Server Components or Lambda) to avoid shipping the WASM bundle to the client. Highlighted HTML is streamed as static markup. |

**Critical Shiki pattern:** Use `codeToHtml` with `defaultColor: false` and dual themes:
```ts
const html = await codeToHtml(code, {
  lang: snippet.language,
  themes: { light: "github-light", dark: "github-dark" },
  defaultColor: false,         // Outputs CSS vars, not inline style
});
```
Then in CSS:
```css
.shiki span { color: var(--shiki-light); }
.dark .shiki span { color: var(--shiki-dark); }
```
This is the only approach that avoids a second render on theme toggle.

### Frontend — QR Code

| Technology | Installed Version | Purpose | Why |
|------------|-------------------|---------|-----|
| qrcode | not yet installed | QR code generation for join URL | Use `qrcode` (npm: `qrcode` + `@types/qrcode`) for server-side SVG generation. Do not use a client-side canvas library — generate QR as SVG in a Server Component so the < 80 kB payload constraint is respected. Alternative: `qr-code-styling` for client-side with logo branding, but adds ~20 kB. |

**Recommended:** `qrcode@1.5.x` — server-side SVG output, zero client JS.

### AppSync Subscription — Architecture Decision

AppSync supports two subscription trigger models:

1. **Enhanced Subscriptions (Lambda):** Resolver-triggered, you call `appsync:PublishEvent` from Lambda.
2. **Auto-subscriptions (DynamoDB streams):** AppSync reacts to DynamoDB stream events automatically.

**Use Enhanced Subscriptions (Lambda-triggered) for Nasqa Live.**

Rationale: The project requires filtering (only clients in the same session receive updates), union-typed
events, and host-gated mutations. Lambda gives full control over who receives what. DynamoDB stream
subscriptions cannot easily filter by PK or apply business logic before fan-out.

Pattern for the single session channel:
```graphql
type Subscription {
  onSessionUpdate(slug: String!): SessionUpdate
    @aws_subscribe(mutations: ["pushSnippet", "submitQuestion", "upvoteQuestion",
                               "toggleFocus", "deleteSnippet", "banParticipant",
                               "submitReply", "downvoteContent"])
}

union SessionUpdate = SnippetEvent | QuestionEvent | ReplyEvent | ModerationEvent
```

Note: AppSync does not natively support union types in subscription return values in all configurations.
If union types cause schema validation errors in SST's AppSync component, use a tagged union pattern:
```graphql
type SessionUpdate {
  type: String!       # "SNIPPET" | "QUESTION" | "REPLY" | "MODERATION"
  payload: AWSJSON!  # Serialized JSON — discriminated union in TypeScript
}
```
This is the pragmatic fallback and avoids AppSync schema union limitations.

### Infrastructure — Rate Limiting

| Technology | Purpose | Why |
|------------|---------|-----|
| AWS WAF | Rate limiting at edge | 10 snippets/min (host) + 3 questions/min (public). Attach WAF Web ACL to AppSync API via SST. Token-bucket per IP. Cheaper than implementing custom Lambda rate limiting and operates before Lambda invocation. |

WAF rule (in SST `infra/` resource):
- Host operations: 10 req/60s per fingerprint header
- Public mutations: 3 req/60s per fingerprint header

---

## Packages NOT Yet Installed (Required)

| Package | Version | Why Needed |
|---------|---------|-----------|
| `ulid` | ^2.3.0 | Lexicographically sortable IDs for DynamoDB SK ordering (replaces UUID for time-ordered records) |
| `qrcode` | ^1.5.4 | QR code SVG generation (server-side, zero client JS) |
| `@types/qrcode` | ^1.5.5 | TypeScript types for qrcode |
| `aws-amplify` or `@aws-amplify/api-graphql` | ^6.x | AppSync WebSocket subscription client. Amplify Gen2's `API.graphql` subscription API is the standard way to connect to AppSync from a browser without managing WebSocket handshakes manually. Amplify is large — import only the API subpackage: `@aws-amplify/api-graphql`. |
| `crypto` (Node built-in) | — | SHA-256 hashing for hostSecret. Available natively in Node 24 / Edge Runtime via `crypto.subtle`. No package needed; use `await crypto.subtle.digest("SHA-256", encoded)`. |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Real-time transport | AppSync WebSocket | Ably / Pusher / Socket.io | AppSync is already in the stack; third-party services add cost, another vendor dependency, and don't integrate with DynamoDB TTL or Lambda resolvers natively |
| Real-time transport | AppSync WebSocket | API Gateway WebSocket API | AppSync WebSocket requires no connection management lambda; API GW WebSocket requires custom connect/disconnect/message lambdas and a connection table — more moving parts |
| Subscription client | @aws-amplify/api-graphql | aws-appsync (deprecated) | aws-appsync is unmaintained; Amplify v6 is the current supported path |
| Subscription client | @aws-amplify/api-graphql | graphql-ws | graphql-ws speaks GraphQL over WebSocket (RFC compliant) but AppSync uses a proprietary protocol — graphql-ws will not work without a custom adapter |
| Animation | Framer Motion | CSS animations only | Complex choreography (hero snippet emphasis, pulsing glow, list reorder on upvote) is impractical in pure CSS; Framer's layout animations are the right tool |
| Animation | Framer Motion | React Spring | React Spring is capable but less ergonomic for layout animations; Framer already installed |
| Highlighting | Shiki | Prism.js / highlight.js | Shiki uses TextMate grammars (same as VS Code) for higher fidelity; only Shiki supports no-layout-shift dual-theme via CSS vars natively in v4 |
| ID generation | ulid | uuid v4 | UUIDs are random — no sort order. DynamoDB reverse-chron feeds need sortable IDs; ULID is monotonic and time-prefixed |
| DB access pattern | Single-table DynamoDB | Multi-table DynamoDB | Multi-table adds GSI complexity and extra reads for session-scoped queries. All entities share the same PK (SESSION#slug), so single-table is the natural fit |
| DB access pattern | Single-table DynamoDB | Aurora Serverless v2 | Aurora has cold-start connection overhead; DynamoDB is better for ephemeral 24-hour sessions with bursty concurrent access (50-500 users) |
| i18n | next-intl | next-i18next | next-i18next is Pages Router oriented; next-intl has first-class App Router and Server Components support |
| IaC | SST Ion v4 | CDK / SAM / Terraform | Non-negotiable per project constraint; SST Ion v4 chosen over older SST v2/v3 due to Pulumi backend (eliminates CloudFormation drift) |
| QR code | qrcode (server) | qr-code-styling (client) | Client-side QR adds ~20 kB to bundle; server-rendered SVG is zero client cost and satisfies < 80 kB constraint |
| Component primitives | @base-ui/react | Radix UI | @base-ui is already installed; it is maintained by the MUI team and has a smaller bundle than Radix with comparable accessibility |

---

## Installation

```bash
# In packages/frontend
npm install ulid qrcode @aws-amplify/api-graphql --workspace=packages/frontend

# In packages/frontend (dev)
npm install -D @types/qrcode --workspace=packages/frontend

# In packages/functions (if ULID used in resolvers too)
npm install ulid --workspace=packages/functions
```

---

## Key Version Pinning Notes

| Package | Pinned At | Notes |
|---------|-----------|-------|
| next | 16.1.6 | Next.js 16 introduced the `use cache` directive (stable) and improved RSC streaming. Do not upgrade to 17.x without testing AppSync auth headers in edge middleware. |
| react | 19.2.3 | React 19 `useOptimistic` is the correct API for optimistic upvote/question state. Do not downgrade. |
| shiki | 4.0.2 | v4 API is not backwards compatible with v3. The `codeToHtml` dual-theme API exists only in v4+. |
| next-intl | 4.8.3 | v4 dropped the `pages/` directory API. Do not regress to v3. |
| zod | 4.3.6 | Zod v4 has breaking API changes vs v3 (notably `z.string().min()` error messages). All schemas must be written for v4. |
| sst | 4.2.7 | SST Ion (v4). Do not confuse with SST v2 (CDK-based) — the API surface is completely different. |
| @aws-sdk/* | 3.1009.0 | v3 modular SDK. Do not use v2 (`aws-sdk`) — it is deprecated and has a much larger bundle. |
| tailwindcss | 4.x | CSS-first config. There is no `tailwind.config.js` — customization goes in `globals.css` via `@theme`. v4 is not backwards compatible with v3 plugin APIs. |

---

## Sources

- Codebase: `/Users/santiago.torres/codebases/personal/nasqa-live/packages/frontend/package.json` — verified versions (HIGH confidence)
- Codebase: `/Users/santiago.torres/codebases/personal/nasqa-live/packages/functions/package.json` — verified versions (HIGH confidence)
- Codebase: `/Users/santiago.torres/codebases/personal/nasqa-live/package.json` — root dependencies (HIGH confidence)
- Codebase: `/Users/santiago.torres/codebases/personal/nasqa-live/.planning/codebase/STACK.md` — existing stack analysis (HIGH confidence)
- Codebase: `/Users/santiago.torres/codebases/personal/nasqa-live/.planning/PROJECT.md` — requirements and constraints (HIGH confidence)
- AppSync subscription union-type limitation: MEDIUM confidence (training data + known AppSync GQL spec constraint; verify against SST AppSync component docs before implementing)
- WAF rate limiting via AppSync: MEDIUM confidence (training data; verify SST Ion supports WAF ACL attachment to AppSync in v4)
- `@aws-amplify/api-graphql` as subscription client: MEDIUM confidence (training data; Amplify v6 API may have changed — verify current subscription API in Amplify Gen2 docs before implementing)
