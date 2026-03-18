# Phase 14: Infrastructure and URL Routing - Research

**Researched:** 2026-03-17
**Domain:** Next.js routing, SST/Lambda configuration, DynamoDB read optimization, Framer Motion layout animation, OTP-style input
**Confidence:** HIGH

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Numeric Code Format & Generation**

- 6-digit codes, range 100000-999999 (no leading zeros, always 6 digits)
- All digits 0-9 (no ambiguous digit exclusion)
- Display format: grouped 3+3 with space (e.g., "482 913") — space is display-only
- Code IS the session ID — no separate UUID, no mapping table
- Random generation with retry on collision (no sequential fallback)
- Reusable after session ends with 24-hour cooldown before recycling
- Flat URL structure: `/en/482913` (no `/session/` prefix)
- Locale-less access supported: `/482913` auto-detects locale and redirects to `/en/482913`
- Route matching: regex exactly 6 digits — `/en/[0-9]{6}` goes to session, anything else falls through
- Tab title: both session name + code (e.g., "My Session — 482 913 | nasqa")

**Share Widget**

- URL in browser + share widget overlay with large code display, copy button, and QR code
- Reuse the existing QR/share component already in the codebase
- No spoken-form pronunciation hint — grouped digits are sufficient for reading aloud

**Join Page (/join)**

- Standalone page — no nav bar or footer, clean and focused like a login page
- Branded landing: nasqa logo/branding at top, short tagline, then code input
- 6 individual OTP-style digit boxes (auto-advance between boxes)
- Auto-focus first digit on page load — user can type immediately
- Auto-submit when 6th digit entered — no button press needed
- Invalid code: shake animation + clear all digits
- Expired/closed session: specific "session ended" message (not same as invalid)
- Smart paste: if user pastes a full URL, extract the 6-digit code and auto-fill
- Deep-link support: `/join?code=482913` auto-fills and submits
- Locale-less: `/join` redirects to `/en/join` (consistent with session URL pattern)
- Direct navigation after valid code — no preview/confirmation step
- Branded OG card for social sharing / link previews
- Dark mode: same layout, theme-adapted colors via design system tokens

**Vote Reordering Animation**

- Smooth slide/swap animation — cards physically slide to new positions (spatial continuity)
- 300ms debounce for ALL votes (including user's own) — batch changes within window, animate once
- Animation duration: 300ms with ease-out easing
- Direct slide to final position regardless of how many spots jumped (no cap)
- Vote count updates instantly (no counting animation)
- No highlight/glow after a card moves — the animation itself communicates the change
- Maintain scroll position when cards move above viewport
- Respect `prefers-reduced-motion`: instant reorder, no animation
- Tie-break: earlier submission stays above when vote counts are equal
- New questions: fade + slide in from top of list
- Same vote-driven sort for both host and participant views
- Host does NOT get a separate sort toggle

**Migration from Word-Pair Slugs**

- COMPLETE REMOVAL — delete all word-pair slug generation code, routes, and dependencies
- No backward compatibility: no redirects, no fallback routes for old word-pair URLs
- Remove word-list library and any slug-generation dependencies from package.json
- Only new sessions get numeric codes — existing sessions with word-pair IDs expire naturally

**Lambda Cold-Start Tuning**

- Memory bump to 256MB and arm64 architecture
- Config change in sst.config.ts is sufficient validation — no CloudWatch smoke test needed
- Also review and adjust Lambda timeout settings for user-facing functions

**DynamoDB Read Optimization**

- Goal: halve SSR reads from 4 to 2 per session page load
- Trust the implementation — no temporary log counter for verification
- Code review is sufficient proof of read reduction

### Claude's Discretion

- Which Lambda functions get the memory/arm64 bump (audit user-facing vs background)
- DynamoDB optimization approach: consolidate items vs caching (pick most effective)
- Whether DynamoDB API surface changes or stays transparent (depends on caller count)
- Share widget positioning and trigger behavior
- Loading skeleton design for session page

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>

## Phase Requirements

| ID       | Description                                                                                                                                             | Research Support                                                                                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| INFRA-01 | Lambda resolver runs at 256MB memory with arm64 architecture to reduce cold starts                                                                      | SST `sst.aws.Function` `memory` and `architecture` props; single change in `sst.config.ts` `ResolverFn` block                                                                                           |
| INFRA-02 | SSR page load deduplicates `getSession` and `getSessionData` calls via `React.cache()` (2 DynamoDB calls instead of 4)                                  | Next.js 15+ `React.cache()` per-request memoization; confirmed the participant page calls both functions twice (in `generateMetadata` and `default` export)                                             |
| INFRA-03 | Session page exports `force-dynamic` to prevent accidental cross-request caching                                                                        | Next.js `export const dynamic = 'force-dynamic'` segment config; must be added to session `page.tsx` and host `page.tsx`                                                                                |
| UX-01    | QA panel sort debounce reduced from 1000ms to 300ms for faster perceived ordering                                                                       | Existing debounce in `qa-panel.tsx` line 79 is `setTimeout(..., 1000)` — change to 300                                                                                                                  |
| UX-02    | Question card layout animations remain smooth at 300ms debounce (no teleporting)                                                                        | Framer Motion `layout` prop already on `motion.div` wrapping each question card in `qa-panel.tsx` line 164; `layout` animation uses `ease: [0.4, 0, 0.2, 1]` at 400ms — should reduce to 300ms to match |
| URL-01   | Session codes are 6-digit numeric (collision-free with 24h TTL, pool of 1M codes)                                                                       | Replace `random-word-slugs` with `Math.floor(Math.random() * 900000) + 100000` + `ConditionExpression: "attribute_not_exists(PK)"` retry loop (already used)                                            |
| URL-02   | Session URL flattened from `/[locale]/session/[slug]` to `/[locale]/[code]`                                                                             | New Next.js App Router folder: `app/[locale]/[code]/` with regex-constrained dynamic segment                                                                                                            |
| URL-03   | Host URL follows same pattern: `/[locale]/[code]/host#secret`                                                                                           | Move `host/page.tsx` from `session/[slug]/host/` to `[code]/host/`                                                                                                                                      |
| URL-04   | Dedicated `/join` page with code entry field                                                                                                            | New `app/[locale]/join/page.tsx`; OTP-style input component (6 individual `<input>` elements); no existing component to reuse                                                                           |
| URL-05   | QR code updated to resolve to flat URL format                                                                                                           | Update `participantUrl` construction in `host/page.tsx` and `host-toolbar.tsx` to use `/${locale}/${code}`                                                                                              |
| URL-06   | DynamoDB key migrated from `SESSION#word-slug` to `SESSION#482913`                                                                                      | The DynamoDB key format `SESSION#${slug}` is already generic string — updating code to pass numeric code makes this transparent; no DynamoDB schema migration needed                                    |
| URL-07   | `createSession` Server Action generates 6-digit numeric code with collision check                                                                       | Replace `generateSlug(2, { format: "kebab" })` in `actions/session.ts` with numeric code generator                                                                                                      |
| URL-08   | Session-specific OG image route relocated from `session/[slug]/opengraph-image.tsx` to `[code]/opengraph-image.tsx` and updated to display numeric code | Move file; update QR URL and display to show `482 913` grouped format                                                                                                                                   |

</phase_requirements>

---

## Summary

Phase 14 makes five distinct improvements across four technical domains. The codebase is already in good shape — the heaviest lifting is the URL routing migration, but its structure is well-understood and the scope is clean.

**Lambda tuning (INFRA-01):** The `ResolverFn` in `sst.config.ts` has no `memory` or `architecture` keys — defaults apply (128MB, x86_64). Adding `memory: "256 MB"` and `architecture: "arm64"` to the `sst.aws.Function` constructor is a one-line-each change, then redeploy.

**DynamoDB read deduplication (INFRA-02/INFRA-03):** The participant session page (`app/[locale]/session/[slug]/page.tsx`) calls `getSession()` once in `generateMetadata` and once in the page body — that's 2 DynamoDB GetItem calls without `React.cache()`. It also calls `getSessionData()` once in `generateMetadata` (for question count) and once in the page body — 2 Query calls. Total: 4 reads per SSR. Wrapping `getSession` and `getSessionData` in `React.cache()` in `lib/session.ts` deduplicates these to 1 GetItem + 1 Query = 2 reads per request. The host page has the same pattern. Adding `export const dynamic = "force-dynamic"` prevents Next.js from caching SSR output across requests.

**Vote animation (UX-01/UX-02):** The debounce timeout in `qa-panel.tsx` is already on line 79 as `setTimeout(..., 1000)`. Changing it to 300 completes UX-01. Framer Motion `layout` is already present on the wrapping `motion.div` (line 164), so cards will already animate smoothly at 300ms. The layout transition duration is 400ms — it should be reduced to 300ms to match the debounce. `prefers-reduced-motion` is not currently handled — a `useReducedMotion()` hook from Framer Motion should disable layout animation when the user prefers it.

**URL migration (URL-01 through URL-08):** The most wide-ranging change. The current route is `app/[locale]/session/[slug]/` with child pages `page.tsx`, `host/page.tsx`, and `opengraph-image.tsx`. The new structure is `app/[locale]/[code]/` with the same children. A new `app/[locale]/join/page.tsx` handles the code-entry experience. The `middleware.ts` currently uses `next-intl`'s middleware and routes all traffic through `[locale]` — the locale-less `/482913` → `/en/482913` redirect is handled naturally by next-intl's `localeDetection` when the path doesn't start with a known locale. The `[code]` segment must be constrained to 6 digits to avoid colliding with other locale-level routes (currently only `/join`).

**Primary recommendation:** Work in this order — (1) Lambda/INFRA config, (2) React.cache + force-dynamic, (3) debounce + animation, (4) URL routing migration, (5) /join page. The URL migration is the most invasive and should be done last after the smaller wins are in.

---

## Standard Stack

### Core

| Library                | Version                      | Purpose                              | Why Standard                 |
| ---------------------- | ---------------------------- | ------------------------------------ | ---------------------------- |
| Next.js App Router     | 16.1.6 (in use)              | File-based routing, SSR, OG images   | Already in project           |
| Framer Motion          | ^12.36.0 (in use)            | Layout animation, `useReducedMotion` | Already in project           |
| next-intl              | ^4.8.3 (in use)              | Locale routing, middleware, redirect | Already in project           |
| React.cache            | Built into React 19 (in use) | Per-request SSR memoization          | Standard Next.js 15+ pattern |
| SST (sst.aws.Function) | In use                       | Lambda configuration                 | Already in project           |

### Supporting

| Library                          | Version         | Purpose                             | When to Use                    |
| -------------------------------- | --------------- | ----------------------------------- | ------------------------------ |
| `qrcode`                         | ^1.5.4 (in use) | QR code generation for share widget | Already in HostToolbar popover |
| `framer-motion/useReducedMotion` | included        | Disable layout animation for a11y   | Add to QA panel animation      |

### Alternatives Considered

| Instead of              | Could Use                              | Tradeoff                                                                     |
| ----------------------- | -------------------------------------- | ---------------------------------------------------------------------------- |
| React.cache for dedup   | Manual in-memory cache                 | React.cache is request-scoped, automatically cleared, no race condition risk |
| Framer Motion `layout`  | CSS transitions + JS position tracking | Layout prop is already in use; custom approach adds complexity for no gain   |
| OTP-style custom inputs | react-otp-input library                | Decision is locked on 6 individual inputs — no library needed                |

**Installation:** No new packages needed. Remove `random-word-slugs` after migration.

```bash
# Remove after URL migration complete:
npm uninstall random-word-slugs --workspace=packages/frontend
```

---

## Architecture Patterns

### Recommended Project Structure

After migration:

```
app/[locale]/
├── [code]/                    # NEW — 6-digit numeric session routes
│   ├── page.tsx               # Participant view (moved from session/[slug]/)
│   ├── host/
│   │   └── page.tsx           # Host view (moved from session/[slug]/host/)
│   └── opengraph-image.tsx    # OG image (moved from session/[slug]/)
├── join/
│   └── page.tsx               # NEW — /join page with OTP input
└── session/                   # DELETED after migration
    └── [slug]/                # DELETED
```

### Pattern 1: React.cache for SSR Deduplication

**What:** Wrapping DynamoDB fetch functions in `React.cache()` ensures that within a single SSR render tree, calling the same function with the same arguments returns a cached result instead of issuing a second DynamoDB call.

**When to use:** When the same data-fetching function is called from both `generateMetadata` and the page component (which happens on every session page).

**Example:**

```typescript
// packages/frontend/src/lib/session.ts
import { cache } from "react";

// Wrap existing functions — callers unchanged
export const getSession = cache(async function getSession(code: string): Promise<Session | null> {
  // ... existing implementation unchanged
});

export const getSessionData = cache(async function getSessionData(
  code: string,
): Promise<SessionData> {
  // ... existing implementation unchanged
});
```

`React.cache()` is request-scoped in Next.js — it is automatically invalidated between requests. No manual cache invalidation is needed.

### Pattern 2: Next.js Dynamic Segment with Regex Constraint

**What:** Next.js `[code]` dynamic segments match any string by default. To prevent the 6-digit segment from matching words like "join" or locale codes, we can use a `generateStaticParams` constraint OR rely on Next.js route priority (static segments beat dynamic ones). With `app/[locale]/join/page.tsx` as a static segment, `/en/join` will match `join/page.tsx` before `[code]/page.tsx`.

**When to use:** The flat URL structure `/en/482913` requires `[code]` to coexist with static segments like `/en/join`. Next.js resolves static routes before dynamic catch-all routes by default — no regex configuration needed at the file-system level.

**Example:**

```typescript
// app/[locale]/[code]/page.tsx
// Validate code format early, 404 on mismatch
export default async function SessionPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { code } = await params;
  if (!/^\d{6}$/.test(code)) {
    notFound(); // falls through to not-found.tsx
  }
  // ... rest of page
}
```

### Pattern 3: OTP-Style 6-Digit Input

**What:** 6 individual `<input type="text" maxLength={1}>` elements in a flex row. Auto-advance to next input on keystroke. Backspace moves to previous. Paste handler extracts digits.

**When to use:** /join page code entry. Provides the "OTP verification" UX familiarity the user wants.

**Example:**

```tsx
// Key behaviors:
// 1. onChange: if digit entered, move focus to refs[index + 1]
// 2. onKeyDown: if Backspace and empty, move focus to refs[index - 1]
// 3. onPaste: extract 6 digits from pasted string (strip non-digits, take first 6)
//    — if pasted string contains a URL, extract last 6-digit sequence
// 4. When all 6 digits filled, call router.push(`/${locale}/${digits.join("")}`)
// 5. Shake animation on invalid: Framer Motion x keyframe animation
// 6. Auto-focus first input via useEffect + ref.focus()
```

### Pattern 4: Locale-less Redirect for /482913 and /join

**What:** `next-intl` middleware with `localeDetection: true` (already configured) will detect the locale from browser headers and redirect `/482913` to `/en/482913`. Same for `/join` → `/en/join`. This requires the middleware matcher to not exclude numeric paths.

**Current middleware matcher:**

```typescript
matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"];
```

This already passes `/482913` through to the middleware. next-intl handles locale-prefix routing automatically. No changes needed to middleware for locale-less redirect.

**Verification:** Check that the `/join` route is included in the next-intl `routing` config if it needs any special handling. It doesn't — it's just a standard localized route.

### Pattern 5: Lambda arm64 + Memory in SST

**What:** SST `sst.aws.Function` accepts `memory` and `architecture` props.

**Example:**

```typescript
// sst.config.ts
const resolverFn = new sst.aws.Function("ResolverFn", {
  handler: "packages/functions/src/resolvers/index.handler",
  memory: "256 MB", // ADD: was defaulting to 128 MB
  architecture: "arm64", // ADD: was defaulting to x86_64
  environment: {
    TABLE_NAME: table.name,
    AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
  },
  link: [table],
});
```

### Anti-Patterns to Avoid

- **Calling `notFound()` inside try/catch:** Next.js `notFound()` throws a special error that must propagate. Do not catch it.
- **Using `React.cache` on the module level without the `cache` import:** Must be `import { cache } from "react"` (React 19 stable export).
- **Building a numeric-to-word-slug mapping table:** Explicitly locked out. The code IS the key.
- **Redirect-on-old-slug:** Explicitly rejected. Old sessions expire naturally; no redirect infrastructure needed.
- **Animating vote count numbers:** Locked decision. Only positional layout animation; numbers update instantly.
- **Using `window.confirm` or `window.alert`:** Forbidden per CLAUDE.md — use Dialog components.

---

## Don't Hand-Roll

| Problem                     | Don't Build                     | Use Instead                                  | Why                                                                             |
| --------------------------- | ------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------- |
| Per-request memoization     | Manual request-scoped cache Map | `React.cache()`                              | Automatic invalidation, no memory leak risk, handles concurrent calls correctly |
| Layout reorder animation    | CSS transform tracking + JS     | Framer Motion `layout` prop (already in use) | Already implemented; changing debounce is the only remaining work               |
| Locale detection + redirect | Custom middleware               | next-intl middleware (already in use)        | Already handles `/482913` → `/en/482913` via `localeDetection: true`            |
| OTP input state management  | Complex unified state           | Simple array of 6 refs + controlled inputs   | The pattern is 30 lines; no library overhead needed                             |

**Key insight:** The hardest parts of this phase are already scaffolded — Framer Motion layout, next-intl routing, and the DynamoDB retry pattern all exist. The work is configuration and code moves, not new architecture.

---

## Common Pitfalls

### Pitfall 1: `[code]` Dynamic Segment Catching `/join`

**What goes wrong:** If `app/[locale]/join/page.tsx` and `app/[locale]/[code]/page.tsx` coexist, and someone navigates to `/en/join`, Next.js might route to `[code]` instead of `join`.

**Why it happens:** Next.js route specificity — static segments beat dynamic ones. `/join` as a static segment takes priority over `[code]`. This is correct behavior.

**How to avoid:** Simply create `app/[locale]/join/page.tsx`. Next.js will route `/en/join` to it. Add a guard in `[code]/page.tsx` that calls `notFound()` if the code doesn't match `/^\d{6}$/`.

**Warning signs:** If `/en/join` starts rendering the session page, the static route file is missing or has an error.

### Pitfall 2: `React.cache` Not Deduplicating Across Server Components

**What goes wrong:** `React.cache()` only deduplicates within the same render pass. If `generateMetadata` and the page body run in separate passes (e.g., because of streaming), deduplication may not work.

**Why it happens:** `generateMetadata` and the page component run in the same request context in Next.js App Router. `React.cache()` is scoped to the request — both should share the cache.

**How to avoid:** Standard pattern — wrap the function with `cache()` in the module. Calls with same args in same request hit the cache. This is the documented Next.js approach for this exact problem.

**Warning signs:** More than 2 DynamoDB calls visible in logs after deploying. Check if `generateMetadata` is somehow running in a different context.

### Pitfall 3: 6-Digit Code Collision Rate at Scale

**What goes wrong:** Pool of 900,000 codes (100000-999999). With 24h TTL, collisions become probable when many sessions are active simultaneously.

**Why it matters for this phase:** The retry loop (max 3 attempts) already exists for slug generation. The same pattern applies to numeric codes. With 3 retries and < 1% of codes occupied, failure is negligible.

**How to avoid:** Keep the existing `MAX_SLUG_RETRIES = 3` pattern. Return a meaningful error if all retries fail (`slugGenerationFailed` translation key already exists).

**Warning signs:** `ConditionalCheckFailedException` exhausting all retries — only realistic at > 900,000 concurrent active sessions.

### Pitfall 4: `prefers-reduced-motion` Not Respected

**What goes wrong:** The new 300ms layout animation runs even when the OS/browser has reduced motion enabled, causing accessibility violations.

**Why it happens:** Framer Motion `layout` prop animates by default regardless of system preference unless explicitly handled.

**How to avoid:** Use `useReducedMotion()` from Framer Motion in `qa-panel.tsx`. When true, pass `layout={false}` or set `transition={{ duration: 0 }}` to the motion.div.

```tsx
import { useReducedMotion } from "framer-motion";
const prefersReduced = useReducedMotion();
// In the motion.div:
transition={{
  duration: prefersReduced ? 0 : 0.3,
  layout: { duration: prefersReduced ? 0 : 0.3, ease: [0.4, 0, 0.2, 1] },
}}
```

### Pitfall 5: Tab Title Uses Raw Code Without Grouping

**What goes wrong:** Title like `"My Session — 482913 | nasqa"` instead of `"My Session — 482 913 | nasqa"`.

**Why it happens:** The code stored in DynamoDB is `482913` — a direct string format to display. The grouped format (3+3 with space) is display-only.

**How to avoid:** Create a utility function `formatCode(code: string): string` that inserts a space at position 3. Use this in the metadata title template and in the share widget display. Do NOT store with the space.

```typescript
export function formatCode(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}
```

### Pitfall 6: Hard-Coded `/session/` Paths in robots.ts and OG image

**What goes wrong:** After migration, `robots.ts` still disallows `/en/session/` paths (which no longer exist) and misses the new `[code]` paths.

**How to avoid:** Update `robots.ts` to disallow the numeric session paths. Since numeric paths aren't easily expressed as a prefix, the simplest approach is to rely on the `robots: { index: false, follow: false }` in `generateMetadata` for individual session pages and remove the disallow rules for session paths from `robots.ts`. Also update the OG image `qrUrl` from `https://clip.nasqa.io/session/${slug}` to `https://clip.nasqa.io/en/${code}`.

---

## Code Examples

### Numeric Code Generation (URL-07)

```typescript
// packages/frontend/src/actions/session.ts
// Replace random-word-slugs with:

const MAX_CODE_RETRIES = 3;

function generateNumericCode(): string {
  return String(Math.floor(Math.random() * 900000) + 100000);
}

// In createSession:
for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt++) {
  const code = generateNumericCode(); // e.g., "482913"
  const rawSecret = randomUUID();
  const hashedSecret = createHash("sha256").update(rawSecret).digest("hex");
  const now = Math.floor(Date.now() / 1000);

  try {
    await docClient.send(
      new PutCommand({
        TableName: tableName(),
        Item: {
          PK: `SESSION#${code}`,
          SK: `SESSION#${code}`,
          code, // replaces `slug`
          title,
          hostSecretHash: hashedSecret,
          isActive: true,
          createdAt: now,
          TTL: now + 86400,
        },
        ConditionExpression: "attribute_not_exists(PK)",
      }),
    );
    redirectUrl = `/${locale}/${code}/host?raw=${rawSecret}`;
    break;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) continue;
    return { success: false, error: t("unexpectedError") };
  }
}
```

### React.cache Wrapping (INFRA-02)

```typescript
// packages/frontend/src/lib/session.ts
import { cache } from "react";

export const getSession = cache(async function _getSession(code: string): Promise<Session | null> {
  // ... existing body unchanged, just rename `slug` param to `code`
  const result = await docClient.send(
    new GetCommand({
      TableName: tableName(),
      Key: { PK: `SESSION#${code}`, SK: `SESSION#${code}` },
    }),
  );
  // ...
});

export const getSessionData = cache(async function _getSessionData(
  code: string,
): Promise<SessionData> {
  // ... existing body unchanged
});
```

### force-dynamic Export (INFRA-03)

```typescript
// packages/frontend/src/app/[locale]/[code]/page.tsx
export const dynamic = "force-dynamic";

// Same in [code]/host/page.tsx
export const dynamic = "force-dynamic";
```

### Debounce Change (UX-01)

```typescript
// packages/frontend/src/components/session/qa-panel.tsx
// Line 79 — change 1000 to 300:
const timer = setTimeout(() => setDebouncedQuestions(questions), 300);
```

### Layout Animation Timing + Reduced Motion (UX-02)

```tsx
// packages/frontend/src/components/session/qa-panel.tsx
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

// Inside QAPanel component:
const prefersReduced = useReducedMotion();

// In the motion.div wrapping each question card:
<motion.div
  key={question.id}
  layout={!prefersReduced}
  initial={{ opacity: 0, y: -8 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
  transition={{
    duration: prefersReduced ? 0 : 0.3,
    layout: { duration: prefersReduced ? 0 : 0.3, ease: [0.4, 0, 0.2, 1] },
  }}
>
```

### /join Page OTP Input Core (URL-04)

```tsx
// packages/frontend/src/app/[locale]/join/page.tsx
"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ code?: string }>;
}) {
  const router = useRouter();
  const [digits, setDigits] = useState(Array(6).fill(""));
  const [error, setError] = useState<"invalid" | "ended" | null>(null);
  const [shake, setShake] = useState(false);
  const refs = Array.from({ length: 6 }, () => useRef<HTMLInputElement>(null));

  // Auto-focus first input
  useEffect(() => {
    refs[0].current?.focus();
  }, []);

  // Deep-link pre-fill
  useEffect(() => {
    searchParams.then(({ code }) => {
      if (code && /^\d{6}$/.test(code)) {
        setDigits(code.split(""));
        // auto-submit
        navigateTo(code);
      }
    });
  }, []);

  async function navigateTo(code: string) {
    const { locale } = await params;
    // Validate: try to fetch session
    // If 404 → shake + "invalid" or "ended" based on response
    router.push(`/${locale}/${code}`);
  }
  // ... input handlers
}
```

---

## State of the Art

| Old Approach                     | Current Approach           | When Changed              | Impact                                |
| -------------------------------- | -------------------------- | ------------------------- | ------------------------------------- |
| Manual memoization with ref      | `React.cache()`            | React 18.3+ / Next.js 14+ | Request-scoped, automatic, safe       |
| Word-pair slugs for memorability | Numeric codes + /join page | Phase 14 (now)            | Voice-friendly, shorter URL           |
| Lambda default 128MB x86         | 256MB arm64                | 2024+ AWS best practice   | Shorter cold start, better price/perf |

**Deprecated/outdated:**

- `random-word-slugs@0.1.7`: Will be removed. No replacement package needed — code generation is inline.
- `session/[slug]/` route: Will be deleted. No redirects.

---

## Open Questions

1. **`sessionSlug` field name in DynamoDB items and GraphQL**
   - What we know: Every DynamoDB item (snippet, question, reply) has a `sessionSlug` field containing the word-pair slug. The GraphQL schema uses `sessionSlug` as the argument name in all mutations and subscriptions.
   - What's unclear: Should the field be renamed to `sessionCode` everywhere, or kept as `sessionSlug` with a numeric value? Renaming everywhere (DynamoDB stored items, GraphQL schema, Lambda resolvers, frontend types in `@nasqa/core`) is a large but clean change. Leaving it named `sessionSlug` with a numeric value is pragmatic but confusing.
   - Recommendation: Rename to `sessionCode` in new code paths. For existing stored items in DynamoDB — the `sessionSlug` field in items is denormalized metadata; since the primary key `PK`/`SK` is already `SESSION#${code}`, the stored field is only used for logging. Renaming the stored field is a bonus, not a requirement. Do the rename in the TypeScript types and new code; existing items in DynamoDB use the old field but will expire in 24h.

2. **`Session` type: `slug` field rename**
   - What we know: `lib/session.ts` exports `Session` with a `slug: string` field. The `@nasqa/core` types have `slug: string` on `SessionItem`.
   - What's unclear: Renaming `slug` to `code` cascades into `SessionLivePage`, `SessionLiveHostPage`, `QAPanel`, and all component props.
   - Recommendation: Rename in phase — it's a find-replace that TypeScript will catch. Doing it now prevents confusion for phase 15.

3. **`/join` page validation — server-side or client-side lookup?**
   - What we know: The /join page needs to distinguish "invalid code" (never existed or expired) from "session ended" (`isActive: false`). A client-side lookup to the session endpoint on submission is simplest.
   - What's unclear: Should validation be a Server Action or a direct DynamoDB lookup?
   - Recommendation: Create a lightweight Server Action `validateSessionCode(code: string): Promise<"valid" | "invalid" | "ended">` that calls `getSession()`. This keeps the API key off the client and reuses the existing DynamoDB client.

---

## Sources

### Primary (HIGH confidence)

- Codebase inspection — `packages/frontend/src/lib/session.ts`, `actions/session.ts`, `components/session/qa-panel.tsx`, `sst.config.ts`, `middleware.ts` — all read directly
- Next.js App Router static-over-dynamic route priority — verified by reading routing structure
- Framer Motion `useReducedMotion` — confirmed in framer-motion ^12 API (in use)
- React `cache()` — confirmed React 19 stable export, standard Next.js 15+ pattern

### Secondary (MEDIUM confidence)

- SST `sst.aws.Function` `memory` and `architecture` props — inferred from SST v3 API patterns and `sst.config.ts` structure; no `memory` prop observed in current config, confirming default applies
- Lambda 256MB arm64 cold-start benefit — documented AWS recommendation, consistent with STATE.md note about August 2025 pricing change

### Tertiary (LOW confidence)

- `React.cache()` deduplication across `generateMetadata` + page body in Next.js 16 — this is the documented pattern for Next.js 14+; Next.js 16.1.6 is a minor/patch from that baseline and should behave identically

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries already in project, versions confirmed from package.json
- Architecture: HIGH — all patterns derived from reading actual codebase files
- Pitfalls: HIGH — derived from reading existing code paths and understanding the collision surface

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable — no fast-moving dependencies introduced)
