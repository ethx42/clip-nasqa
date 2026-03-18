# Phase 15: Mutation Path and Client Utilities - Research

**Researched:** 2026-03-18
**Domain:** AppSync direct client mutations, TypeScript utility design, error handling with sonner toasts, next-intl client-side i18n
**Confidence:** HIGH

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Error Feedback UX

- Rate-limit errors: toast with static message ("Too many attempts. Wait a moment.") — no live countdown
- Ban errors: toast on each attempt ("You've been restricted from participating in this session")
- Network errors: action-specific with connectivity awareness (e.g., "No internet connection" when offline vs "Failed to submit question" on server error). Claude decides exact granularity per error type.
- Toast position: bottom-center, auto-dismiss after 4 seconds
- Toasts are dismissible via tap/swipe
- Rate-limit toasts replace previous (no stacking)
- Success mutations: silent — the UI change (question appearing, vote count updating) IS the feedback
- Vote conflicts: silent reconciliation — sync to server state without notifying user
- Failed mutations: preserve input text so user can retry without retyping
- Submit button: disable + brief spinner while waiting for AppSync response
- Toast styling: use existing toast library, but align styles with the design system
- Error messages: fully localized via next-intl `useTranslations` hook (client-side)
- Error logging: console.error in dev + `reportError()` in production

#### Security Boundary

- API key + endpoint URL in client bundle is acceptable (already public via subscription connection)
- Claude's Discretion: whether to add CORS/origin restriction (assess risk vs effort)
- Client-side validation: yes (text length, empty strings) for instant feedback; Lambda remains authoritative
- Input sanitization: trim whitespace only on client; server handles deeper sanitization
- Fingerprint approach: Claude's Discretion (keep localStorage UUID or assess alternatives)
- Host mutation guard: type-level enforcement — `graphqlMutation` TypeScript types only accept participant mutation names; calling with a host mutation is a compile error
- Auth config: `graphqlMutation` accepts an auth config object (`{ type: 'api-key', key }` or `{ type: 'jwt', token }`) to future-proof for SSO/Cognito migration

#### Migration Strategy

- All 5 participant mutations migrated at once (not incrementally) — they all use the same utility
- Old participant Server Action code deleted entirely after migration — no dead code
- Host mutations (pushSnippet, deleteSnippet, clearClipboard, focusQuestion, banQuestion, banParticipant, restoreQuestion) remain as Server Actions untouched

#### Offline/Retry Behavior

- One silent retry after 1 second before showing error toast
- If retry also fails, show action-specific error toast
- No persistent offline banner — errors surface only on action attempt
- No mutation queuing — fail and let user retry manually

### Claude's Discretion

- Exact toast library choice (use what exists in the project)
- CORS/origin restriction decision
- Fingerprint mechanism assessment
- Offline detection approach (navigator.onLine vs fetch failure)
- Internal architecture of `graphqlMutation` and `safeClientMutation`

### Deferred Ideas (OUT OF SCOPE)

- Freemium/premium message length limits — configurable per tier, like X.com (future milestone)
- SSO/sign-in integration with Cognito User Pools — replaces API key auth, enables user-ID-based banning (future milestone)
- CloudWatch alarm on AppSync 4xx/5xx error rate for abuse detection (future infra phase)
- API key auto-rotation with CloudWatch Events + SSM Parameter Store (future infra phase)
- API key TTL set to 365 days with 30-day expiration reminder alarm (future infra task)
  </user_constraints>

<phase_requirements>

## Phase Requirements

| ID     | Description                                                                                                                                                                   | Research Support                                                                                                                                                         |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| MUT-01 | Participant mutations (addQuestion, upvoteQuestion, addReply, downvoteQuestion, react) execute directly from client to AppSync without Netlify Server Action hop              | `graphqlMutation()` in `lib/appsync-client.ts` replaces the `appsyncMutation()` call path used by current Server Actions                                                 |
| MUT-02 | Host mutations (pushSnippet, deleteSnippet, clearClipboard, focusQuestion, banQuestion, banParticipant, restoreQuestion) remain as Server Actions for hostSecretHash security | No changes to `actions/snippet.ts`, `actions/moderation.ts`; type-guard in `graphqlMutation` prevents compile-time misuse                                                |
| MUT-03 | Shared `graphqlMutation()` client utility handles AppSync HTTP POST with error parsing                                                                                        | Plain `fetch()` POST to `NEXT_PUBLIC_APPSYNC_URL` with `x-api-key` header — mirrors existing `appsync-server.ts` pattern, runs in browser                                |
| MUT-04 | `safeClientMutation()` wrapper provides consistent error handling with toast feedback                                                                                         | Wraps `graphqlMutation()`, parses error strings, calls `toast.error()` via sonner with a stable `id` for rate-limit deduplication                                        |
| MUT-05 | Remaining Server Actions lazy-load `getTranslations()` only in error paths                                                                                                    | Move `getTranslations()` call inside catch blocks in `actions/snippet.ts`, `actions/moderation.ts`, `actions/qa.ts`; host actions still call `appsyncMutation` unchanged |

</phase_requirements>

---

## Summary

The existing codebase already has a clean server-side mutation utility (`appsync-server.ts`) that uses plain `fetch()` with an `x-api-key` header. Phase 15 creates a parallel **client-side** version (`graphqlMutation()` in `lib/appsync-client.ts`) that runs the same HTTP POST from the browser, then wraps it in `safeClientMutation()` which handles error parsing, toast feedback, and the one-silent-retry rule. All five participant mutations currently go through Server Actions (`actions/qa.ts`, `actions/reactions.ts`, `actions/moderation.ts::downvoteQuestionAction`) — those actions are deleted entirely after the hooks are updated to call `safeClientMutation()` directly.

The key architectural insight is that `appsync-client.ts` currently only initializes the `aws-amplify` Amplify client for subscriptions. The new `graphqlMutation()` function will be added to that same file (or to a new `lib/graphql-mutation.ts`) so mutation auth config is co-located with subscription auth config. The Amplify subscription client stays untouched — only the mutation path changes.

For the `getTranslations()` lazy-load requirement (MUT-05), the existing Server Actions (`focusQuestion`, host snippet/moderation actions) call `getTranslations()` at the top of every function even on the success path. Moving the call inside the catch block removes the `getTranslations` overhead from every successful host mutation.

**Primary recommendation:** Create `lib/appsync-client.ts::graphqlMutation()` as a typed plain-fetch utility with auth config; create `lib/safe-action.ts::safeClientMutation()` wrapping it; update `use-session-mutations.ts` to call these directly; delete the 5 participant Server Action functions.

---

## Standard Stack

### Core (already in project — no new installs)

| Library    | Version | Purpose                                                      | Why Standard                                                                         |
| ---------- | ------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| sonner     | ^2.0.7  | Toast notifications                                          | Already in use; `Toaster position="bottom-center"` already configured in `Providers` |
| next-intl  | ^4.8.3  | Client-side error message localization via `useTranslations` | Already used in `use-session-mutations.ts` via `useTranslations("actionErrors")`     |
| TypeScript | strict  | Type-level host mutation guard                               | `strict: true` in tsconfig; template literal types enforce mutation name sets        |

### No New Dependencies Required

All tooling needed for Phase 15 already exists in the project. No `npm install` needed.

---

## Architecture Patterns

### Recommended File Changes

```
packages/frontend/src/
├── lib/
│   ├── appsync-client.ts          # ADD graphqlMutation() export + AuthConfig type
│   └── safe-action.ts             # ADD safeClientMutation() export (alongside existing safeAction)
├── hooks/
│   └── use-session-mutations.ts   # UPDATE: call safeClientMutation() directly, remove Server Action imports
├── actions/
│   ├── qa.ts                      # DELETE addQuestionAction, upvoteQuestionAction, addReplyAction
│   │                              # KEEP focusQuestionAction (host mutation) + lazy getTranslations
│   ├── reactions.ts               # DELETE reactAction entirely
│   └── moderation.ts              # DELETE downvoteQuestionAction
│                                  # KEEP banQuestionAction, banParticipantAction, restoreQuestionAction
│                                  # UPDATE all 3 to lazy-load getTranslations in catch
├── actions/snippet.ts             # UPDATE: lazy-load getTranslations in catch blocks
└── actions/session.ts             # UPDATE: lazy-load getTranslations in catch blocks (already at top of fn)
```

### Pattern 1: `graphqlMutation()` — Typed Client-Side AppSync HTTP POST

**What:** A plain-fetch function that mirrors `appsync-server.ts` but runs in the browser. Accepts an `AuthConfig` union type so auth mode is explicit and swappable (api-key today, JWT in future).

**When to use:** Every participant mutation called from a client component or hook.

**Example:**

```typescript
// lib/appsync-client.ts (additions to existing file)

export type AuthConfig = { type: "api-key"; key: string } | { type: "jwt"; token: string };

// Participant mutation names only — host mutations are a compile error
type ParticipantMutationName =
  | "addQuestion"
  | "upvoteQuestion"
  | "downvoteQuestion"
  | "addReply"
  | "react";

export async function graphqlMutation<T = unknown>(
  query: string,
  variables: Record<string, unknown>,
  auth: AuthConfig = {
    type: "api-key",
    key: process.env.NEXT_PUBLIC_APPSYNC_API_KEY!,
  },
): Promise<T> {
  const url = process.env.NEXT_PUBLIC_APPSYNC_URL!;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (auth.type === "api-key") {
    headers["x-api-key"] = auth.key;
  } else {
    headers["Authorization"] = auth.token;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });

  const body = await res.json();

  if (body.errors?.length) {
    const msg = body.errors.map((e: { message: string }) => e.message).join("; ");
    throw new Error(msg);
  }

  return body.data as T;
}
```

Note: The TypeScript type-guard for participant-only mutation names can be enforced by requiring the caller to pass a `ParticipantMutationName` discriminator parameter, or by exporting typed wrappers for each mutation. The simpler approach — which achieves the locked decision — is to export strongly-typed per-mutation functions that internally call `graphqlMutation`.

### Pattern 2: `safeClientMutation()` — Error-Handling Wrapper

**What:** Wraps a `graphqlMutation()` call with: one silent retry (1 second delay), error message parsing (`RATE_LIMIT_EXCEEDED`, `PARTICIPANT_BANNED`, network failure), and `toast.error()` with a stable `id` for rate-limit deduplication (prevents stacking).

**When to use:** Every direct call to `graphqlMutation()` from a hook or component.

**Example:**

```typescript
// lib/safe-action.ts (additions to existing safeAction export)

type MutationErrorType = "rate-limit" | "banned" | "network" | "server";

function parseErrorType(err: unknown): MutationErrorType {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("RATE_LIMIT_EXCEEDED")) return "rate-limit";
  if (msg.includes("PARTICIPANT_BANNED")) return "banned";
  if (!navigator.onLine) return "network";
  return "server";
}

interface SafeClientMutationOptions {
  /** Localized error message for rate-limit case */
  rateLimitMessage: string;
  /** Localized error message for banned case */
  bannedMessage: string;
  /** Localized error message for network offline case */
  networkMessage: string;
  /** Localized error message for generic server error */
  serverMessage: string;
  /** Toast id for rate-limit deduplication (prevents stacking) */
  rateLimitToastId?: string;
}

export async function safeClientMutation<T>(
  fn: () => Promise<T>,
  options: SafeClientMutationOptions,
): Promise<{ success: true; data: T } | { success: false; error: MutationErrorType }> {
  const attempt = async () => fn();

  let result: T;
  try {
    result = await attempt();
    return { success: true, data: result };
  } catch (firstErr) {
    // One silent retry after 1 second
    await new Promise((r) => setTimeout(r, 1000));
    try {
      result = await attempt();
      return { success: true, data: result };
    } catch (err) {
      reportError(err instanceof Error ? err : new Error(String(err)));
      const errorType = parseErrorType(err);

      const toastOptions =
        errorType === "rate-limit"
          ? { id: options.rateLimitToastId ?? "rate-limit", duration: 4000 }
          : { duration: 4000 };

      const message = {
        "rate-limit": options.rateLimitMessage,
        banned: options.bannedMessage,
        network: options.networkMessage,
        server: options.serverMessage,
      }[errorType];

      toast.error(message, toastOptions);
      return { success: false, error: errorType };
    }
  }
}
```

### Pattern 3: Lazy `getTranslations()` in Surviving Server Actions (MUT-05)

**What:** Move `const t = await getTranslations("actionErrors")` from function top to inside catch blocks. On the success path (the common case), `getTranslations()` is never called.

**When to use:** Every surviving Server Action that currently calls `getTranslations()` unconditionally.

**Example (before → after):**

```typescript
// BEFORE (actions/snippet.ts::pushSnippetAction)
export async function pushSnippetAction(formData: {...}): Promise<ActionResult> {
  const t = await getTranslations("actionErrors");  // always called
  try {
    await appsyncMutation(PUSH_SNIPPET, formData);
    return { success: true };
  } catch (err) {
    reportError(err instanceof Error ? err : new Error(String(err)));
    return parseRateLimitOrBan(err, t, "failedPushSnippet");
  }
}

// AFTER
export async function pushSnippetAction(formData: {...}): Promise<ActionResult> {
  try {
    await appsyncMutation(PUSH_SNIPPET, formData);
    return { success: true };
  } catch (err) {
    const t = await getTranslations("actionErrors");  // lazy — only on error
    reportError(err instanceof Error ? err : new Error(String(err)));
    return parseRateLimitOrBan(err, t, "failedPushSnippet");
  }
}
```

This pattern applies to: `pushSnippetAction`, `deleteSnippetAction`, `clearClipboardAction`, `focusQuestionAction`, `banQuestionAction`, `banParticipantAction`, `restoreQuestionAction`, `createSession`.

### Pattern 4: Submit Button Pending State (per CONTEXT.md)

**What:** The QAInput submit button and reply submit must disable with a spinner while awaiting AppSync response. Currently `QAInput` receives `onSubmit(text)` synchronously — the hook fires the mutation and the component clears input immediately. The new pattern requires the hook to signal pending state back to the component.

**When to use:** `handleAddQuestion` and `handleReply` in `use-session-mutations.ts`.

**Example approach:**

```typescript
// In use-session-mutations.ts
const [isPending, setIsPending] = useState(false);

const handleAddQuestion = useCallback(async (text: string) => {
  setIsPending(true);
  try {
    // ... optimistic dispatch + safeClientMutation call
  } finally {
    setIsPending(false);
  }
}, [...]);

// QAInput receives disabled={isPending} prop
```

The `QAInput` component already accepts a `disabled` prop that shows spinner-style opacity — need to verify it covers the spinner requirement or needs a `<Loader2>` icon swap on the Send button.

### Anti-Patterns to Avoid

- **Calling `graphqlMutation()` directly from components:** Always go through `safeClientMutation()`. Direct calls skip the retry logic and toast feedback.
- **Importing host mutation query strings from `lib/graphql/mutations.ts` in client components:** `PUSH_SNIPPET`, `DELETE_SNIPPET` etc. should only be imported by Server Actions. If TypeScript types don't enforce this, add a lint comment.
- **Throwing in `safeClientMutation` instead of returning `{ success: false }`:** Callers in hooks already handle the `if (!result.success)` pattern; don't change that contract.
- **Calling `toast()` in the hook AND in `safeClientMutation`:** Pick one layer. `safeClientMutation` owns toast display; hooks only dispatch state updates.
- **Leaving `getTranslations()` at the top of a Server Action after MUT-05:** Every surviving Server Action must have the lazy pattern; mixed approach causes confusing diffs.

---

## Don't Hand-Roll

| Problem                            | Don't Build                                          | Use Instead                                                                 | Why                                                                                                                                                          |
| ---------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Toast deduplication for rate-limit | Custom state management to suppress duplicate toasts | `toast.error(msg, { id: 'rate-limit' })` via sonner                         | Sonner's `id` option replaces existing toast with same id — exactly the "replace previous, no stacking" behavior. Source: sonner docs                        |
| Offline detection                  | Custom `navigator.onLine` polling or Service Worker  | Check `navigator.onLine` synchronously at the point of error classification | `navigator.onLine` is a synchronous boolean available in all modern browsers; no setup needed. Only unreliable for portal captive networks (acceptable here) |
| Auth header injection              | Per-mutation header construction                     | `AuthConfig` union type in `graphqlMutation()`                              | One place to update when SSO lands; no scattered header logic                                                                                                |
| Error string parsing               | New error classification system                      | Extend the existing `parseRateLimitOrBan` pattern                           | The pattern is already proven and tested in three action files; extract it into `safeClientMutation` as the canonical parser                                 |

**Key insight:** Sonner's `id` option is the exact mechanism needed for rate-limit toast replacement. No custom deduplication logic required.

---

## Common Pitfalls

### Pitfall 1: `getTranslations` Not Available in Client Components

**What goes wrong:** `getTranslations` from `next-intl/server` throws if called anywhere except a Server Component or Server Action. The new `safeClientMutation` runs in the browser — it cannot call `getTranslations`.

**Why it happens:** Confusion between `getTranslations` (server) and `useTranslations` (client hook). The existing hook files already use `useTranslations("actionErrors")` correctly.

**How to avoid:** `safeClientMutation()` must accept pre-resolved message strings as parameters (not translation keys). The calling hook calls `useTranslations("actionErrors")` and passes the resolved strings down. This is the existing pattern in `use-session-mutations.ts` — extend it.

**Warning signs:** TypeScript error `Cannot use 'getTranslations' in a client module` or runtime error `next-intl: Unable to find translations in 'getRequestConfig'`.

### Pitfall 2: Amplify vs Plain Fetch for Client Mutations

**What goes wrong:** Using `appsyncClient.graphql()` (the Amplify client from `appsync-client.ts`) for mutations would keep the aws-amplify bundle active and mix two mutation code paths.

**Why it happens:** `appsync-client.ts` exports `appsyncClient` — it's tempting to reuse it for mutations since it's "the AppSync client".

**How to avoid:** Use plain `fetch()` for mutations (same as `appsync-server.ts`). Amplify client is only used for subscriptions (`generateClient()` with `onSubscribe` / `onData`). The new `graphqlMutation()` must be a standalone `fetch()` call.

**Warning signs:** `import { appsyncClient } from '@/lib/appsync-client'` appearing in mutation code.

### Pitfall 3: `actions/qa.ts` Still Contains `focusQuestionAction`

**What goes wrong:** `focusQuestionAction` is a HOST mutation (requires `hostSecretHash`) but lives in `actions/qa.ts` alongside the participant mutations being deleted. Accidentally deleting it breaks the host page.

**Why it happens:** The file name `qa.ts` implies Q&A participant actions, but `focusQuestion` is a host moderation action placed there.

**How to avoid:** When deleting `addQuestionAction`, `upvoteQuestionAction`, `addReplyAction` from `actions/qa.ts`, explicitly preserve `focusQuestionAction`. Consider whether to move it to `actions/moderation.ts` for clarity (optional but clean).

**Warning signs:** Host page throwing "focusQuestionAction is not a function" at runtime.

### Pitfall 4: Rate-Limit Toast Shows Raw RATE_LIMIT_EXCEEDED String

**What goes wrong:** The AppSync Lambda returns `RATE_LIMIT_EXCEEDED:30` in the GraphQL error message. If not parsed, this raw string appears in the toast.

**Why it happens:** Error message falls through all conditions in `parseErrorType` without matching the rate-limit pattern.

**How to avoid:** Test regex `/RATE_LIMIT_EXCEEDED/` (without `:N` capture since static message is used) matches the Lambda error format. The existing `parseRateLimitOrBan` in server actions uses `/RATE_LIMIT_EXCEEDED:(\d+)/` — the client version doesn't need the number but the regex check is identical.

**Warning signs:** Toast showing "RATE_LIMIT_EXCEEDED:30" instead of the localized message.

### Pitfall 5: Lost Input Text on Failed Submission

**What goes wrong:** `QAInput` currently calls `setText("")` immediately after `onSubmit(trimmed)` — before the async mutation completes. If the mutation fails, the text is already gone.

**Why it happens:** The current design clears input optimistically since the optimistic question appears immediately. With direct AppSync, the mutation may fail and we need to restore input.

**How to avoid:** The hook's `handleAddQuestion` should control input clearing. Change `QAInput` to NOT clear on submit — instead the hook calls an `onClearInput` callback only on success. Or pass `isPending` state and only clear after success. The `onSubmitSuccess` callback already exists in the hook interface for exactly this purpose. The component just needs to move `setText("")` into `onSubmitSuccess`.

**Warning signs:** User submits, AppSync returns error, input is blank — user must retype their question.

### Pitfall 6: `navigator.onLine` False Positive

**What goes wrong:** `navigator.onLine === true` doesn't mean the AppSync endpoint is reachable (captive portals, VPN issues). Classifying a server error as a network error shows wrong message.

**Why it happens:** Overreliance on `navigator.onLine` for error classification.

**How to avoid:** Use `navigator.onLine` as a secondary check — primary is `fetch()` throwing a TypeError (network-level failure) vs returning a non-200 response with GraphQL errors. A `fetch()` TypeError almost certainly means network; a GraphQL error in `body.errors` means the server responded. The `parseErrorType` function should check TypeError first, then `navigator.onLine` as a hint, then fall back to server error.

---

## Code Examples

### Existing `appsync-server.ts` Pattern (mirror this in client)

```typescript
// Source: packages/frontend/src/lib/appsync-server.ts (verified in codebase)
export async function appsyncMutation<T = unknown>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const url = process.env.NEXT_PUBLIC_APPSYNC_URL;
  const apiKey = process.env.NEXT_PUBLIC_APPSYNC_API_KEY;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors?.length) {
    const msg = body.errors.map((e: { message: string }) => e.message).join("; ");
    throw new Error(msg);
  }
  return body.data as T;
}
```

The client version (`graphqlMutation`) is structurally identical — differences are: (1) `AuthConfig` parameter instead of hardcoded `x-api-key`, (2) runs in browser (no server-only APIs used).

### Existing Sonner Toast Usage (verified in codebase)

```typescript
// Source: packages/frontend/src/hooks/use-session-mutations.ts (verified)
// Toaster configured at: packages/frontend/src/components/providers.tsx
// <Toaster position="bottom-center" richColors />

import { toast } from "sonner";

toast.error(result.error, { duration: 5000 });

// Rate-limit deduplication (new pattern — sonner id feature):
toast.error(options.rateLimitMessage, { id: "rate-limit", duration: 4000 });
```

### Existing `parseRateLimitOrBan` Pattern (extract to client)

```typescript
// Source: packages/frontend/src/actions/qa.ts (verified)
// This pattern exists in qa.ts, snippet.ts, and moderation.ts — extract to safeClientMutation
const rateLimitMatch = message.match(/RATE_LIMIT_EXCEEDED:(\d+)/);
if (rateLimitMatch) {
  return { success: false, error: t("rateLimited", { seconds: rateLimitMatch[1] }) };
}
if (message.includes("PARTICIPANT_BANNED")) {
  return { success: false, error: t("banned") };
}
```

Note: In `safeClientMutation`, `t("rateLimited")` is replaced with a static pre-resolved string (locked decision: "Too many attempts. Wait a moment." — no countdown). The `seconds` interpolation from the existing `rateLimited` key is dropped.

### Sonner `id` Deduplication (prevents rate-limit toast stacking)

```typescript
// From sonner docs: toast with same `id` replaces the existing one
// Source: https://sonner.emilkowal.ski/toast (verified via WebFetch)
toast.error("Too many attempts. Wait a moment.", {
  id: "rate-limit",
  duration: 4000,
});
// Second call replaces the first — never stacks
```

---

## State of the Art

| Old Approach                                    | Current Approach                              | When Changed | Impact                                                                           |
| ----------------------------------------------- | --------------------------------------------- | ------------ | -------------------------------------------------------------------------------- |
| Participant mutations via Netlify Server Action | Direct AppSync HTTP POST from browser         | Phase 15     | Eliminates Netlify round-trip latency (~200-400ms) from participant interactions |
| `getTranslations()` on every Server Action call | Lazy `getTranslations()` only in catch blocks | Phase 15     | Removes i18n resolution from successful host mutation critical path              |
| Error parsing duplicated across 4 action files  | Single `safeClientMutation` error handler     | Phase 15     | DRY; one place to update error messages                                          |

---

## Claude's Discretion Findings

### CORS/Origin Restriction

**Assessment:** Low-effort addition — AppSync supports CORS via response headers from the Lambda resolver, but this requires Lambda code changes not in this phase's scope. The API key is already visible in the client bundle (used by the existing subscription connection). Adding CORS restriction would not prevent API key abuse since the key is public. **Recommendation:** Skip CORS changes in Phase 15 (no scope, minimal security value given public API key). Note in code comments as a future hardening option.

### Fingerprint Mechanism (localStorage UUID)

**Assessment:** The existing `use-fingerprint.ts` uses `crypto.randomUUID()` stored in `localStorage` under key `nasqa_fingerprint`. This is already the production mechanism. Alternatives (canvas fingerprinting, FingerprintJS) add bundle size and complexity for marginal improvement — the Lambda's rate limiting and session TTL already bound abuse. **Recommendation:** Keep existing localStorage UUID. The key `nasqa_fingerprint` persists across sessions, which is intentional (vote deduplication relies on it).

### Offline Detection Approach

**Assessment:** Use TypeError detection as primary signal (fetch throws TypeError on network failure) combined with `navigator.onLine` as a secondary hint. The one-silent-retry after 1 second covers transient failures. **Recommendation:** Classify error as `'network'` when: (1) the fetch throws a TypeError (not a GraphQL error response), OR (2) `navigator.onLine === false` at the time of error classification.

---

## Open Questions

1. **`focusQuestionAction` file placement**
   - What we know: `focusQuestionAction` is a host mutation in `actions/qa.ts`
   - What's unclear: Should it be moved to `actions/moderation.ts` as part of cleanup?
   - Recommendation: Move it for clarity since qa.ts will become sparse after deletion. Planner should include this as a task.

2. **Submit button spinner implementation detail**
   - What we know: `QAInput` has `disabled` prop; `CONTEXT.md` specifies "disable + brief spinner while waiting"
   - What's unclear: The `QAInput` button currently shows a static `<Send>` icon — adding a spinner requires conditional rendering (`isPending ? <Loader2 className="animate-spin" /> : <Send />`)
   - Recommendation: Hook exposes `isPending` boolean; `QAInput` accepts it as prop; conditionally renders spinner icon.

3. **`reactions.ts` is a Server Action but returns no error toast**
   - What we know: `reactAction` currently does silent failure (`return { success: false }`) — no toast, no error message
   - What's unclear: After migration, does `safeClientMutation` for react need error toast, or stay silent?
   - Recommendation: Per CONTEXT.md "Vote conflicts: silent reconciliation". The react action should remain silent on failure — pass empty strings or `undefined` for toast messages and skip `toast.error()` on react failures.

---

## Sources

### Primary (HIGH confidence)

- Verified in codebase: `packages/frontend/src/lib/appsync-server.ts` — plain fetch pattern for AppSync mutations
- Verified in codebase: `packages/frontend/src/lib/appsync-client.ts` — Amplify subscription client setup
- Verified in codebase: `packages/frontend/src/actions/qa.ts`, `reactions.ts`, `moderation.ts`, `snippet.ts` — all participant mutations currently as Server Actions
- Verified in codebase: `packages/frontend/src/hooks/use-session-mutations.ts` — existing safeAction + toast pattern
- Verified in codebase: `packages/frontend/src/components/providers.tsx` — `<Toaster position="bottom-center" richColors />`
- Verified in codebase: `packages/frontend/src/hooks/use-fingerprint.ts` — localStorage UUID fingerprint

### Secondary (MEDIUM confidence)

- Sonner `id` option for toast deduplication: documented behavior (toast with same `id` replaces existing) — standard sonner feature, consistent with sonner v2.0.x API

### Tertiary (LOW confidence)

- None — all critical claims verified directly from codebase inspection

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries already in project, versions verified from package.json
- Architecture: HIGH — derived from existing code patterns in the project; no speculative patterns
- Pitfalls: HIGH — derived from actual code inspection (e.g., `focusQuestionAction` location, `setText("")` timing, `RATE_LIMIT_EXCEEDED:N` format)

**Research date:** 2026-03-18
**Valid until:** 2026-04-17 (stable codebase, no external API changes expected)
