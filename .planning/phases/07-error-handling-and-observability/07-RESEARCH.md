# Phase 7: Error Handling and Observability - Research

**Researched:** 2026-03-16
**Domain:** Next.js App Router error boundaries, server action error contracts, pino structured logging for Lambda
**Confidence:** HIGH

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Error page UX**

- Tone and visual design: Claude's discretion — fit the existing Nasqa brand (Zinc/Emerald, clean UI)
- 404/expired session page: single page for both cases — "This session has ended or doesn't exist"
- 404 primary action: "Create a new session" CTA linking to landing page
- global-error.tsx crash recovery: clean restart only — "Try again" button reloads from scratch, no state preservation
- Session-scoped error.tsx: show error type hint ("Connection lost" vs "Server error") — not full technical details, not fully generic

**Server action error shape**

- Error display: toast notifications (non-blocking), consistent with existing optimistic UI toasts from Phase 3
- Toast auto-dismisses after 5 seconds
- Error messages: localized via next-intl (en/es/pt) — consistent with rest of UI
- Error contract: messages only (no error codes) — `{ success: false, error: "localized message" }`
- Client-side validation: prevent submit when input is invalid (disable button), server validation as safety net
- Rate limit errors: show remaining cooldown time in toast ("Too many questions. Try again in 45s")
- Rate limit UX: allow retry (don't disable input during cooldown), show toast again on each attempt
- Ban feedback: disable inputs with visible "You've been blocked from posting" message
- Current server actions: let Claude inspect current code and decide which actions need structured error wrapping

**Logging detail level**

- Library: pino (user chose over console.log)
- Required fields: level, sessionSlug, operation, durationMs, timestamp (core fields only — no fingerprint/userAgent)
- Error stack traces: Claude's discretion
- Log levels for successful operations: Claude's discretion

**Crash vs expected errors**

- Session error.tsx recovery strategy: Claude's discretion (reset() vs in-place reconnection)
- Client-side error reporting: prepare a `reportError()` stub that logs to console now but can be swapped for Sentry later (MON-01 is in Future Requirements)

### Claude's Discretion

- Error page tone and visual design (fit Zinc/Emerald brand)
- Whether error-level logs include full stack traces
- Log level strategy for successful operations (INFO vs DEBUG)
- Session error.tsx recovery approach (reset() vs reconnect in-place)
- Which existing server actions need structured error wrapping (audit current code)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>

## Phase Requirements

| ID     | Description                                                                              | Research Support                                                                                                                                                                                            |
| ------ | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ERR-01 | `global-error.tsx` catches root layout crashes with a recovery UI                        | Next.js `app/global-error.tsx` file convention; must be `'use client'`; must include `<html>` and `<body>` tags; receives `error` + `reset` props                                                           |
| ERR-02 | `error.tsx` in session route segments provides graceful fallbacks                        | `app/[locale]/session/[slug]/error.tsx` placement; `'use client'`; `reset()` re-renders segment; `error.digest` for server log correlation                                                                  |
| ERR-03 | `not-found.tsx` renders a branded 404 page                                               | `app/[locale]/not-found.tsx` placement; triggered by `notFound()` in session page Server Components; can use `useTranslations()` from existing provider                                                     |
| ERR-04 | Server Actions (createSession, Q&A) return structured errors instead of throwing         | `createSession` currently throws — needs refactor to return `{ success: false, error: string }`; most Q&A/moderation/snippet actions already return `{ ok, error }` — needs contract normalization and i18n |
| OBS-01 | Lambda resolvers use structured JSON logging (level, sessionSlug, operation, durationMs) | pino v10 + child loggers; `packages/functions` has no pino dependency yet; wrap handler with timing; structured JSON to stdout for CloudWatch                                                               |

</phase_requirements>

---

## Summary

Phase 7 is purely hardening work — no new features, no schema changes. It has three distinct tracks: (1) Next.js error boundary files for the frontend, (2) server action error contract normalization, and (3) pino structured logging in the Lambda package.

The error boundary track is well-documented in official Next.js 16.1.6 docs. The key constraint is `global-error.tsx` — it replaces the entire root layout so it must include `<html>` and `<body>` tags and cannot use the existing `NextIntlClientProvider` from the root layout. English-only hardcoded copy is the pragmatic choice for `global-error.tsx`. For `error.tsx` and `not-found.tsx`, i18n works normally since they live inside the `[locale]` segment hierarchy where `NextIntlClientProvider` is already mounted in `packages/frontend/src/app/[locale]/layout.tsx`.

The server action audit reveals `createSession` is the only action that currently throws instead of returning. All other actions (`qa.ts`, `moderation.ts`, `snippet.ts`) already return `{ ok: boolean; error?: string }`. The contract change needed is: (1) refactor `createSession` to return `{ success: false, error: string }` on validation failure; (2) standardize the return type to `{ success: true } | { success: false; error: string }` across all actions for consistency; (3) add i18n to all error messages (currently English-only hardcoded strings). A `reportError()` stub is also needed as a forward compatibility shim for MON-01/Sentry.

For Lambda logging, `packages/functions` has no pino dependency yet and currently uses no logging at all. Pino v10.3.1 is current. The approach: install `pino` in `packages/functions`, create a module-level logger, use child loggers bound with `sessionSlug` per resolver call, wrap each resolver with timing to emit `durationMs`.

**Primary recommendation:** Use pino v10 child loggers in Lambda resolvers; use Next.js file conventions exactly as documented; refactor `createSession` to return-not-throw; add i18n to all action error strings via `getTranslations()`.

---

## Standard Stack

### Core

| Library                  | Version                    | Purpose                                          | Why Standard                                                                                                       |
| ------------------------ | -------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| pino                     | 10.3.1                     | Structured JSON logging                          | ~5x faster than alternatives; default output is CloudWatch-compatible JSON; official Lambda patterns use it        |
| Next.js file conventions | 16.1.6 (already installed) | `global-error.tsx`, `error.tsx`, `not-found.tsx` | Built into Next.js App Router; zero dependencies                                                                   |
| next-intl                | 4.8.3 (already installed)  | i18n in error boundaries                         | Already used project-wide; `useTranslations` works in `error.tsx` / `not-found.tsx` when inside `[locale]` segment |
| sonner                   | 2.0.7 (already installed)  | Toast notifications                              | Already used for optimistic UI toasts in Phase 3                                                                   |

### Supporting

| Library     | Version | Purpose                                                       | When to Use                                                                              |
| ----------- | ------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| pino-lambda | current | CloudWatch-native log format + automatic awsRequestId tracing | Optional — adds awsRequestId correlation; only add if CloudWatch Insights queries matter |

**Decision: plain pino without pino-lambda.** The phase requirement specifies `level, sessionSlug, operation, durationMs` — all custom fields we control. pino-lambda reformats output to match CloudWatch's native format which would change field layout. Plain pino emits structured JSON that CloudWatch Insights can query directly. pino-lambda's main value (auto-capturing awsRequestId) is out of scope for OBS-01.

### Alternatives Considered

| Instead of                    | Could Use   | Tradeoff                                                                              |
| ----------------------------- | ----------- | ------------------------------------------------------------------------------------- |
| pino                          | console.log | User explicitly chose pino; console.log produces unstructured strings                 |
| pino                          | winston     | pino is 5x+ faster, smaller bundle; winston was the old default                       |
| `{ success, error }` contract | throwing    | Official Next.js docs recommend return values for expected errors in Server Functions |

**Installation (functions package only):**

```bash
cd packages/functions && npm install pino
```

---

## Architecture Patterns

### Recommended File Additions

```
packages/frontend/src/app/
├── global-error.tsx           # ERR-01 — root crash handler (must have html+body)
└── [locale]/
    ├── error.tsx              # (no session-scope error needed at locale level)
    ├── not-found.tsx          # ERR-03 — 404/expired session (uses useTranslations)
    └── session/
        └── [slug]/
            └── error.tsx      # ERR-02 — session segment crash handler

packages/frontend/src/lib/
└── report-error.ts            # reportError() stub for future Sentry (MON-01)

packages/functions/src/
└── logger.ts                  # module-level pino logger (OBS-01)
```

### Pattern 1: global-error.tsx — Root Layout Crash Handler

**What:** Catches crashes that occur inside the root layout (`app/layout.tsx`). Replaces the entire document when active — must own `<html>` and `<body>` tags.
**When to use:** Root layout Provider throws, font loading fails, catastrophic unhandled error at app root.
**i18n constraint:** `global-error.tsx` renders OUTSIDE `NextIntlClientProvider` (which lives in the locale layout). Hardcode English copy or replicate the provider setup locally — hardcoding English is simpler and correct for a crash screen.

```tsx
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/error (v16.1.6)
// packages/frontend/src/app/global-error.tsx
"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        {/* Minimal crash UI — no external providers available */}
        <h2>Something went wrong</h2>
        <button onClick={() => reset()}>Try again</button>
      </body>
    </html>
  );
}
```

**Key constraint from docs (verified):** As of Next.js v15.2.0, `global-error` is also shown in development mode (previously dev mode showed the error overlay instead).

### Pattern 2: error.tsx — Session Segment Error Boundary

**What:** Catches crashes within `app/[locale]/session/[slug]/` segment subtree. The rest of the app (header, locale layout) remains functional.
**When to use:** AppSync connection throws unexpectedly, Server Component inside session route crashes.
**Props:** `error: Error & { digest?: string }` and `reset: () => void`.
**i18n:** Lives inside `[locale]` segment, so `NextIntlClientProvider` IS available from `[locale]/layout.tsx`. Use `useTranslations`.
**Recovery strategy (Claude's discretion):** Use `reset()` — it re-renders the segment, which re-runs the Server Component fetch. For connection errors this is the correct recovery. In-place WebSocket reconnection is handled separately by the existing subscription hook, not by the error boundary.

```tsx
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/error (v16.1.6)
// packages/frontend/src/app/[locale]/session/[slug]/error.tsx
"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { reportError } from "@/lib/report-error";

export default function SessionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    reportError(error);
  }, [error]);

  // Classify error type for user-facing hint
  const isConnectionError =
    error.message?.toLowerCase().includes("network") ||
    error.message?.toLowerCase().includes("websocket") ||
    error.message?.toLowerCase().includes("subscription");

  return (
    <div>
      <h2>{isConnectionError ? t("connectionLost") : t("serverError")}</h2>
      <button onClick={() => reset()}>{t("tryAgain")}</button>
    </div>
  );
}
```

**Note on `error.message` in production:** For Server Component errors, Next.js replaces the actual message with a generic string + `error.digest` hash in production (to prevent info leakage). Client Component errors retain their original message. Error type classification should rely on a structured error class or error code pattern for production reliability, not string matching. For this phase's scope (simple "Connection lost" vs "Server error" hint), string matching in dev + digest in prod is acceptable.

### Pattern 3: not-found.tsx — 404 / Expired Session

**What:** Triggered by calling `notFound()` inside `app/[locale]/session/[slug]/page.tsx`. Currently the session page renders an inline 404 UI — this refactors it to use the proper file convention.
**Placement:** `app/[locale]/not-found.tsx` (covers the entire locale segment, handles all unmatched routes within locale).
**Server Component:** `not-found.tsx` is a Server Component by default (unlike `error.tsx`). Can use `getTranslations()` directly.
**Current state:** The session page (`[slug]/page.tsx`) and host page (`[slug]/host/page.tsx`) already have inline not-found UI with the correct copy from `pages` translation namespace. Replace the inline fallback with `notFound()` call and move UI to `not-found.tsx`.

```tsx
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/not-found (v16.1.6)
// packages/frontend/src/app/[locale]/not-found.tsx
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function NotFound() {
  const t = await getTranslations("pages");
  return (
    <div>
      <h1>{t("sessionNotFound")}</h1>
      <p>{t("sessionNotFoundDesc")}</p>
      <Link href="/">{t("createNewSession")}</Link>
    </div>
  );
}
```

### Pattern 4: Structured Error Return from createSession

**What:** `createSession` currently throws on validation failure. Needs to return a structured error instead. The challenge: `createSession` is used as a `form action` in `page.tsx` — the calling pattern must handle both the error return and the existing redirect-on-success flow.

**Current audit of all server actions:**

| Action file                             | Current pattern                                              | Needs change?                              |
| --------------------------------------- | ------------------------------------------------------------ | ------------------------------------------ |
| `session.ts: createSession`             | Throws `new Error(...)`, returns `Promise<never>`            | YES — needs structured error return + i18n |
| `qa.ts: addQuestionAction`              | Returns `{ ok, error }`, hardcoded EN strings                | YES — i18n error strings                   |
| `qa.ts: upvoteQuestionAction`           | Returns `{ ok, error }`, hardcoded EN + "VOTE_CONFLICT" code | YES — i18n strings                         |
| `qa.ts: addReplyAction`                 | Returns `{ ok, error }`, hardcoded EN strings                | YES — i18n error strings                   |
| `qa.ts: focusQuestionAction`            | Returns `{ ok, error }`, generic EN string                   | YES — i18n                                 |
| `moderation.ts: banQuestionAction`      | Returns `{ ok, error }`, generic EN string                   | YES — i18n                                 |
| `moderation.ts: banParticipantAction`   | Returns `{ ok, error }`, generic EN string                   | YES — i18n                                 |
| `moderation.ts: downvoteQuestionAction` | Returns `{ ok, error }`, generic EN string                   | YES — i18n                                 |
| `moderation.ts: restoreQuestionAction`  | Returns `{ ok, error }`, generic EN string                   | YES — i18n                                 |
| `snippet.ts: renderHighlight`           | Returns `string`, no error needed                            | NO — empty string fallback is correct      |
| `snippet.ts: pushSnippetAction`         | Returns `{ ok, error }`, generic string                      | YES — i18n                                 |
| `snippet.ts: deleteSnippetAction`       | Returns `{ ok, error }`, generic string                      | YES — i18n                                 |
| `snippet.ts: clearClipboardAction`      | Returns `{ ok, error }`, generic string                      | YES — i18n                                 |

**Standardized error contract (locked decision):** `{ success: false; error: string }` — use `success` not `ok` for the new standard. Since existing actions use `ok`, introduce the `success` contract on `createSession` and create a shared `ActionResult` type; migrate `ok` → `success` across all actions in this phase for consistency.

**Rate limit and ban error messages from Lambda resolvers:** Lambda throws `"RATE_LIMIT_EXCEEDED"` and `"PARTICIPANT_BANNED"` as error message strings (from `rate-limit.ts`). AppSync forwards these as GraphQL errors. Client-facing actions receive them via AppSync error payloads. The server action catch blocks need to parse these specific error strings and map them to localized messages (including rate limit cooldown time extraction).

### Pattern 5: pino Logger in Lambda

**What:** Module-level pino instance in `packages/functions`, used by all resolver functions. Child logger per invocation binds `sessionSlug` and `operation`.

```typescript
// Source: https://github.com/pinojs/pino (v10.3.1)
// packages/functions/src/logger.ts
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
});

// In handler (index.ts):
const start = Date.now();
const log = logger.child({ operation: fieldName, sessionSlug: args.sessionSlug ?? "unknown" });

try {
  const result = await resolverFn(args);
  log.info({ durationMs: Date.now() - start }, "resolver success");
  return result;
} catch (err) {
  log.error({ durationMs: Date.now() - start, err }, "resolver error");
  throw err;
}
```

**Log level strategy (Claude's discretion):** Use `info` for successful resolver completions, `warn` for rate limit/ban events (expected domain errors), `error` for unexpected throws. Include full stack trace (`err` object) on error — pino serializes it automatically via the `err` serializer.

**CloudWatch compatibility:** pino outputs JSON to stdout. Lambda CloudWatch automatically captures stdout. No transport configuration needed. Each JSON line becomes a CloudWatch log event.

### Pattern 6: reportError() Stub

**What:** Forward compatibility shim. Logs to console now, ready for Sentry SDK swap when MON-01 is implemented.

```typescript
// packages/frontend/src/lib/report-error.ts
export function reportError(error: Error): void {
  // TODO(MON-01): Replace with Sentry.captureException(error) when Sentry is added
  console.error("[reportError]", error);
}
```

### Anti-Patterns to Avoid

- **Calling `useTranslations` in `global-error.tsx`:** It renders outside `NextIntlClientProvider`. Will throw or silently return empty strings. Use hardcoded English copy.
- **Forgetting `'use client'` on error.tsx:** Error boundaries are React class component wrappers under the hood — they must be Client Components. Next.js will throw a build error if missing.
- **Missing `<html><body>` in `global-error.tsx`:** Next.js replaces the entire document; without these tags you get a malformed page.
- **Throwing inside error.tsx render:** Causes the error to bubble up to parent boundary, potentially reaching global-error. Only do this intentionally.
- **Using `notFound()` inside a try/catch:** `notFound()` throws a special `NEXT_NOT_FOUND` error internally. Wrapping it in try/catch catches it and prevents the 404 page from showing. Call `notFound()` outside try/catch blocks.
- **Multiple pino logger instances:** Module-level singleton avoids repeated initialization overhead on warm Lambda invocations.

---

## Don't Hand-Roll

| Problem                     | Don't Build                                 | Use Instead                                         | Why                                                                                                |
| --------------------------- | ------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Error boundary components   | Custom React class error boundary           | `error.tsx` file convention                         | Next.js handles boundary placement, reset semantics, and error serialization                       |
| JSON logging                | `JSON.stringify` wrapper                    | pino                                                | pino handles circular references, error serialization, log levels, perf                            |
| Rate limit cooldown display | Parse DynamoDB TTL from error               | Pass remaining seconds in error message from Lambda | Lambda already knows the bucket window; surface in error string                                    |
| 404 page deduplication      | Duplicate `if (!session)` JSX in every page | `notFound()` + single `not-found.tsx`               | Currently duplicated in `[slug]/page.tsx` AND `[slug]/host/page.tsx` — single file eliminates both |

**Key insight:** The file convention approach (error.tsx / not-found.tsx) is zero-dependency — Next.js handles all the React error boundary wiring. Custom error boundary components add complexity without benefit here.

---

## Common Pitfalls

### Pitfall 1: global-error.tsx Not Shown in Dev (pre-v15.2)

**What goes wrong:** Developers test error.tsx and not-found.tsx in dev and assume global-error.tsx is working too.
**Why it happens:** Before v15.2, Next.js showed its own error overlay in dev instead of global-error.tsx.
**How to avoid:** Project uses Next.js 16.1.6, so global-error.tsx IS shown in development. No workaround needed. Verify by triggering a crash in `app/layout.tsx` during dev.
**Warning signs:** If dev shows the Next.js error overlay and never shows your component, check Next.js version.

### Pitfall 2: notFound() Inside Try/Catch

**What goes wrong:** `notFound()` call is wrapped in a try/catch block that catches the internal `NEXT_NOT_FOUND` throw.
**Why it happens:** Defensive coding — wrapping data fetches in try/catch and then calling notFound in the catch.
**How to avoid:** Call `notFound()` outside try/catch. The pattern is: `if (!session) { notFound() }`, where the check is after the awaited fetch, not inside the fetch's catch block.
**Warning signs:** Navigating to a non-existent slug shows a blank page or generic error instead of not-found UI.

### Pitfall 3: error.message Is Scrubbed in Production for Server Components

**What goes wrong:** Error type classification logic based on `error.message` content works in dev but not production.
**Why it happens:** For security, Next.js replaces Server Component error messages with generic text + `error.digest` hash in production.
**How to avoid:** For this phase's "Connection lost vs Server error" hint, use `error.digest` presence as a proxy for server-side origin. Client-side errors (WebSocket) will have meaningful messages; Server Component errors will have scrubbed messages + digest.
**Warning signs:** Error classification always shows "Server error" in production even for network errors.

### Pitfall 4: createSession redirect() vs Return

**What goes wrong:** After refactoring `createSession` to return errors, the `redirect()` call must still remain outside any try/catch — `redirect()` throws `NEXT_REDIRECT` internally.
**Why it happens:** Next.js `redirect()` works by throwing a special error that Next.js intercepts. If caught, the redirect is swallowed.
**How to avoid:** Structure as: validate input → return error if invalid → do DB work → call `redirect()` outside try/catch after success is confirmed.
**Warning signs:** Form submits successfully but navigation never happens; `redirect()` silently does nothing.

### Pitfall 5: pino Logger Initialization Cost on Cold Start

**What goes wrong:** Creating a new pino instance inside the handler function adds cold start latency on every invocation.
**Why it happens:** Lambda re-runs the handler function on every request but preserves module scope between warm invocations.
**How to avoid:** Create the pino logger at module level (outside the `handler` function), as shown in Pattern 5.
**Warning signs:** CloudWatch logs show logger configuration output on every invocation.

### Pitfall 6: Rate Limit Remaining Time

**What goes wrong:** Toast shows "Too many questions. Try again in 45s" but Lambda doesn't return the remaining seconds — it just throws `"RATE_LIMIT_EXCEEDED"`.
**Why it happens:** The current `checkRateLimit` in `rate-limit.ts` throws `new Error("RATE_LIMIT_EXCEEDED")` with no timing data.
**How to avoid:** The Lambda `checkRateLimit` function has access to `bucket + windowSeconds` — the bucket end time is `bucket + windowSeconds`. Remaining seconds = `(bucket + windowSeconds) - nowEpoch`. Modify `checkRateLimit` to include remaining seconds in the error message: `"RATE_LIMIT_EXCEEDED:45"`. Server action parses the number and includes it in the localized toast.
**Warning signs:** Toast shows generic "rate limited" message without countdown.

---

## Code Examples

Verified patterns from official sources:

### error.tsx Minimum Viable Implementation

```tsx
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/error (Next.js 16.1.6)
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
```

### global-error.tsx Minimum Viable Implementation

```tsx
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/error (Next.js 16.1.6)
// REQUIRED: must include <html> and <body> tags
"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <h2>Something went wrong!</h2>
        <button onClick={() => reset()}>Try again</button>
      </body>
    </html>
  );
}
```

### not-found.tsx with notFound() trigger

```tsx
// Source: https://nextjs.org/docs/app/getting-started/error-handling (Next.js 16.1.6)
// In the page Server Component:

// In app/[locale]/not-found.tsx:
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export default async function SessionPage({ params }) {
  const session = await getSession(params.slug);
  if (!session) notFound(); // Must be outside try/catch
  // ...
}

export default async function NotFound() {
  const t = await getTranslations("pages");
  return <div>{t("sessionNotFound")}</div>;
}
```

### pino child logger pattern

```typescript
// Source: https://github.com/pinojs/pino (v10.3.1)
import pino from "pino";

// Module-level singleton — survives warm Lambda invocations
const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

// Per-invocation child with bound fields
const log = logger.child({ operation: "addQuestion", sessionSlug: "cool-fox" });

const start = Date.now();
// ... do work ...
log.info({ durationMs: Date.now() - start }, "resolver success");
// Output: {"level":30,"time":...,"msg":"resolver success","operation":"addQuestion","sessionSlug":"cool-fox","durationMs":12}
```

### ActionResult unified type

```typescript
// packages/frontend/src/lib/action-result.ts
export type ActionResult<T = undefined> =
  | (T extends undefined ? { success: true } : { success: true; data: T })
  | { success: false; error: string };
```

---

## State of the Art

| Old Approach                      | Current Approach                       | When Changed | Impact                                                                           |
| --------------------------------- | -------------------------------------- | ------------ | -------------------------------------------------------------------------------- |
| `console.log` in Lambda           | pino structured JSON                   | This phase   | CloudWatch Insights can query fields; no more string parsing                     |
| Inline 404 JSX in page.tsx        | `notFound()` + `not-found.tsx` file    | This phase   | DRY — eliminates duplication across `[slug]/page.tsx` and `[slug]/host/page.tsx` |
| `createSession` throws            | `createSession` returns `ActionResult` | This phase   | No unhandled exception reaches the client                                        |
| `global-error` only in production | Since Next.js v15.2.0                  | 2024         | `global-error.tsx` is now shown in development mode too                          |

**Deprecated/outdated:**

- `pages/` directory `_error.tsx`: Pages Router convention, not applicable to this App Router project.
- `global-not-found.js` (experimental, v15.4+): Experimental flag required; the standard `app/[locale]/not-found.tsx` approach is sufficient for this project's single-root-layout setup.

---

## Open Questions

1. **Rate limit remaining seconds from Lambda**
   - What we know: `checkRateLimit` in `packages/functions/src/resolvers/rate-limit.ts` throws `new Error("RATE_LIMIT_EXCEEDED")` with no timing data. Lambda has the bucket window available.
   - What's unclear: AppSync error handling — whether custom error message strings pass through GraphQL errors to the client action intact.
   - Recommendation: Modify `checkRateLimit` to encode remaining seconds in the error string (`"RATE_LIMIT_EXCEEDED:45"`). Server action parses and localizes. Treat the AppSync passthrough as HIGH confidence since existing `"VOTE_CONFLICT"` string is already parsed in `upvoteQuestionAction` using the same pattern.

2. **global-error.tsx and next-themes dark mode**
   - What we know: `global-error.tsx` renders outside `Providers` (which includes `ThemeProvider` from next-themes). The page will render in light mode regardless of user preference.
   - What's unclear: Whether next-themes applies via a class on `<html>` that persists through error boundary activation, or whether it's lost.
   - Recommendation: Accept light-mode-only for `global-error.tsx`. It's a crash screen — visual consistency matters less than recovery speed. Document this as a known limitation.

---

## Sources

### Primary (HIGH confidence)

- https://nextjs.org/docs/app/api-reference/file-conventions/error — `error.tsx` and `global-error.tsx` API, props, version history (Next.js 16.1.6, fetched 2026-03-16)
- https://nextjs.org/docs/app/getting-started/error-handling — Error handling patterns, notFound() integration, `global-error.tsx` requirements (Next.js 16.1.6, fetched 2026-03-16)
- https://nextjs.org/docs/app/api-reference/file-conventions/not-found — `not-found.tsx` API and `global-not-found.js` experimental feature (Next.js 16.1.6, fetched 2026-03-16)
- https://next-intl.dev/docs/environments/error-files — next-intl i18n in error boundary files (fetched 2026-03-16)
- https://github.com/pinojs/pino — pino v10.3.1 current version, child logger API, Lambda usage (fetched 2026-03-16)

### Secondary (MEDIUM confidence)

- Project codebase audit (2026-03-16): `packages/frontend/src/actions/` — direct inspection of all four action files; `packages/functions/src/resolvers/rate-limit.ts` — RATE_LIMIT_EXCEEDED error string; `packages/frontend/src/app/[locale]/session/[slug]/page.tsx` — inline 404 UI duplication

### Tertiary (LOW confidence)

- https://github.com/FormidableLabs/pino-lambda — pino-lambda library (not used — plain pino chosen)

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — verified against Next.js 16.1.6 official docs and pino GitHub (v10.3.1 release confirmed)
- Architecture: HIGH — patterns verified against official Next.js docs; code audit of existing actions complete
- Pitfalls: HIGH — `notFound()` inside try/catch and `createSession` redirect behavior verified against official docs; message scrubbing in production verified against Next.js error.tsx reference

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (Next.js App Router conventions are stable; pino API is stable)
