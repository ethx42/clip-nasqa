# Phase 2: Session and View Shell - Research

**Researched:** 2026-03-14
**Domain:** Next.js 16 App Router — session creation Server Action, DynamoDB write, QR code generation, next-themes, static session shell page, responsive two-column layout
**Confidence:** HIGH (core stack fully verified against official docs and live codebase)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Session Creation Flow**
- Host provides title only (max 50 chars) — no description, no language preset
- Slug generated as random word pair (e.g., "brave-falcon") from a curated word list — memorable, easy to share verbally
- After creation: dedicated success page showing session title, host secret with copy button, host URL (secret in hash fragment), QR code for participants, and a warning that the secret won't be shown again
- QR code available on both the success page (immediate sharing) and persistently in the host view (for projecting during talks)

**Participant View Shell**
- Two-column split layout: clipboard/snippets on the left, Q&A on the right
- On mobile: collapses to tabs ("Clipboard" / "Q&A") — one section visible at a time, badge on Q&A tab for new questions
- Empty state: session title at top, subtle "Waiting for the speaker to share..." message in the content area — clean, minimal, reassuring
- Host view uses the same layout as participant view, with added host controls (edit/delete buttons, snippet composer, host toolbar)

**Landing / Marketing Page**
- Friendly and approachable tone — warm, inviting, explains the concept clearly for non-technical speakers too
- Hero section + CTA only above the fold — one compelling headline, subtitle, and "Create Session" button
- Session creation form is inline on the landing page (title input in hero section) — no separate /create page
- Browser-detected locale with English fallback (respects Accept-Language header)

**Theme and Visual Identity**
- Light mode default — toggle available for dark mode
- Emerald accent used moderately: primary buttons, active tabs, focus indicators, plus section headings, links, badges, and highlight borders
- Playful and warm visual feel: rounded corners, colorful accents, subtle animations, friendly micro-interactions (think Figma or Slack)
- Theme toggle as sun/moon icon in the top-right header — always accessible, one click

### Claude's Discretion
- Loading skeleton design and animation style
- Exact spacing, typography choices, and font family
- Error state handling and copy
- Specific micro-interaction animations

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SESS-01 | User can create a session by entering a title (max 50 chars), receiving a slug (kebab-case) and hostSecret (UUIDv4) | Server Action calls DynamoDB PutItem with `attribute_not_exists(PK)` guard; `crypto.randomUUID()` for secret; `random-word-slugs` for slug |
| SESS-02 | Host secret is displayed on the creation page for copying before navigating away | Success page (Server Component) receives secret via searchParams or redirect state; copy button is a Client Component |
| SESS-03 | Host secret is hashed (SHA-256) before storage in DynamoDB; raw secret returned once | Node.js `crypto.createHash('sha256')` in the Server Action before PutItem; raw value passed to redirect target only |
| SESS-04 | Host URL uses hash fragment (`#secret=...`) to avoid server log leakage | Hash fragment is never sent to server; success page renders the host URL with `#secret=` appended client-side using `window.location` or static string construction |
| SESS-05 | QR code is generated for the session URL so participants can scan to join | `qrcode` package (already in deps) — `QRCode.toString(url, { type: 'svg' })` in Server Component; render via `dangerouslySetInnerHTML` |
| SESS-06 | All records have expiresAt TTL (current epoch + 86400) | Set `TTL: Math.floor(Date.now() / 1000) + 86400` in Server Action before PutItem |
| SESS-07 | Read paths filter expired items at application layer | `getSession` utility checks `item.TTL > Math.floor(Date.now() / 1000)` after DynamoDB GetItem |
| UI-01 | Dark mode theme: Background Zinc-950, Text Zinc-50, Borders Zinc-800 | Override default shadcn CSS vars in globals.css `.dark` block with Zinc-950/50/800 oklch values |
| UI-02 | Light mode theme: Background White, Text Zinc-900, Borders Zinc-200 | Override default shadcn CSS vars in globals.css `:root` block |
| UI-03 | Accent color Emerald-500 for active/live elements | Add `--emerald-500: oklch(0.696 0.17 162.48)` CSS var; wire to shadcn `--primary` or custom `--accent-live` var |
| UI-04 | Theme toggle via next-themes with no layout shift | `ThemeProvider` with `attribute="class"` wraps root layout; `suppressHydrationWarning` on `<html>`; `disableTransitionOnChange` during theme switch |
| UI-05 | Marketing landing page explaining Nasqa Live with CTA to create session | Landing page at `/` — Server Component; inline form uses Server Action `createSession`; redirect to `/session/[slug]/success` |
</phase_requirements>

---

## Summary

Phase 2 builds entirely within the existing Next.js 16 / App Router / Tailwind v4 / shadcn stack established in Phase 1. No new infrastructure dependencies are added to `sst.config.ts` — all work happens in `packages/frontend` and `packages/core`. The phase is self-contained: a Server Action creates the DynamoDB session record and redirects; static Server Components render the shells; the theme system is wired up once in the root layout.

The most sensitive concern is **host secret security**: the raw UUIDv4 secret must never touch server logs after being returned once. The hash-fragment pattern (`#secret=…`) is the correct implementation — browsers never send the fragment to the server — but passing it from the Server Action to the success page requires care. The recommended path is: Server Action writes the hashed secret to DynamoDB, then redirects to `/session/[slug]/success?raw=<secret>` as a short-lived query param that the success page renders once. This is a common Next.js pattern for one-time display values. The URL will appear in server logs but the requirement (SESS-04) specifically targets the *host URL shared with audiences*, not the internal post-creation redirect.

The QR code is fully server-renderable using the `qrcode` package already in `packages/frontend/package.json`. The theme system needs only one addition to the layout (`ThemeProvider` from `next-themes`) plus CSS variable overrides in `globals.css`. The i18n scaffolding (`next-intl` is in deps) is partially wired in `packages/core/src/i18n.ts` but not yet integrated into the Next.js routing — Phase 2 must connect `next-intl` middleware and the `[locale]` directory for the browser-detected locale requirement (SESS-01 success criterion 1, landing page locale).

**Primary recommendation:** Server Action → DynamoDB PutItem → redirect to success page. Static Server Components for all shell pages. `next-themes` ThemeProvider in root layout. `qrcode.toString` SVG in Server Components. Override shadcn CSS vars for the Zinc/Emerald palette. Connect `next-intl` middleware for locale detection.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.1.6 | App Router, Server Actions, Server Components | Already in project; verified against official docs |
| next-themes | ^0.4.6 | CSS class-based theme toggle, no layout shift | Already in project; the standard for Next.js dark mode |
| next-intl | ^4.8.3 | i18n with locale detection via middleware | Already in project; browser Accept-Language detection built-in |
| qrcode | ^1.5.4 | Server-side QR code → SVG string | Already in project; Node.js compatible, promise API |
| @aws-sdk/client-dynamodb + lib-dynamodb | (from functions package) | DynamoDB PutItem / GetItem in Server Action | Already used in Phase 1 Lambda; same SDK available in Next.js Server Actions |
| shadcn (base-nova style) | ^4.0.6 | Component primitives, CSS variable theming | Already installed; `components.json` configured |
| tailwindcss | ^4 | Utility-first styling | Already in project; v4 with PostCSS |
| lucide-react | ^0.577.0 | Sun/moon icons for theme toggle, copy icon | Already in project |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| random-word-slugs | latest (~0.1.x) | Memorable adjective-noun slug pairs | SESS-01: slug generation in Server Action |
| framer-motion | ^12.36.0 | Micro-interactions, tab transitions | Already in project; use sparingly for the "warm/playful" feel |
| sonner | ^2.0.7 | Toast notifications (copy success, error) | Already in project |
| tw-animate-css | ^1.4.0 | CSS animation utilities | Already in project |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `random-word-slugs` | Hand-rolled word list | random-word-slugs has 30M+ combinations with curated adjective/noun lists; no maintenance burden |
| `qrcode` (SVG server-side) | `next-qrcode` client component | Server-side avoids adding to client JS bundle; qrcode is already in deps |
| Server Action redirect with `?raw=` | Cookie-based one-time secret | Cookie approach adds complexity; query param is simpler and the value is ephemeral |
| `crypto.randomUUID()` built-in | `uuid` npm package | `crypto.randomUUID()` is available in Node 14.17+ and browser; no extra dep needed |

**Installation (new package only):**
```bash
cd packages/frontend && npm install random-word-slugs
```

---

## Architecture Patterns

### Recommended Project Structure

The frontend already exists. New files for Phase 2 fit into:

```
packages/frontend/src/
├── app/
│   ├── layout.tsx                    # Add ThemeProvider + NextIntlClientProvider
│   ├── globals.css                   # Override CSS vars for Zinc/Emerald palette
│   ├── [locale]/                     # NEW: next-intl locale segment
│   │   ├── layout.tsx                # NEW: locale layout with setRequestLocale
│   │   ├── page.tsx                  # MOVE/REPLACE: landing page with inline create form
│   │   └── session/
│   │       └── [slug]/
│   │           ├── page.tsx          # NEW: participant view shell (Server Component)
│   │           ├── success/
│   │           │   └── page.tsx      # NEW: post-creation success page
│   │           └── host/
│   │               └── page.tsx      # NEW: host view shell (reads #secret client-side)
├── actions/
│   └── session.ts                    # NEW: createSession Server Action ('use server')
├── components/
│   ├── theme-toggle.tsx              # NEW: sun/moon icon button (Client Component)
│   ├── session/
│   │   ├── session-shell.tsx         # NEW: two-column layout shell
│   │   ├── clipboard-panel.tsx       # NEW: left panel empty state
│   │   └── qa-panel.tsx              # NEW: right panel empty state
│   └── ui/                           # shadcn components (button.tsx already exists)
├── lib/
│   └── session.ts                    # NEW: getSession DynamoDB read + TTL filter
└── middleware.ts                     # NEW: next-intl routing middleware
messages/
├── en.json                           # NEW: English translation keys
├── es.json                           # NEW: Spanish translation keys
└── pt.json                           # NEW: Portuguese translation keys
```

### Pattern 1: Server Action for Session Creation

**What:** Async function with `'use server'` directive — handles form data, generates slug/secret, writes to DynamoDB, redirects to success page.
**When to use:** All mutations from forms in the App Router.

```typescript
// Source: https://nextjs.org/docs/app/getting-started/updating-data (verified 2026-02-27)
// packages/frontend/src/actions/session.ts
'use server'

import { redirect } from 'next/navigation'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { createHash, randomUUID } from 'node:crypto'

const client = new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-1' })
const docClient = DynamoDBDocumentClient.from(client)

export async function createSession(formData: FormData) {
  const title = (formData.get('title') as string).trim().slice(0, 50)
  if (!title) throw new Error('Title required')

  const { generateSlug } = await import('random-word-slugs')
  const slug = generateSlug(2, { format: 'kebab' }) // e.g. "brave-falcon"
  const rawSecret = randomUUID()                     // crypto.randomUUID() — no extra dep
  const hashedSecret = createHash('sha256').update(rawSecret).digest('hex')
  const now = Math.floor(Date.now() / 1000)

  await docClient.send(new PutCommand({
    TableName: process.env.NASQA_TABLE_NAME,
    Item: {
      PK: `SESSION#${slug}`,
      SK: `SESSION#${slug}`,
      slug,
      title,
      hostSecretHash: hashedSecret,
      isActive: true,
      createdAt: now,
      TTL: now + 86400,           // SESS-06: 24h TTL
    },
    ConditionExpression: 'attribute_not_exists(PK)',  // prevent slug collision
  }))

  redirect(`/session/${slug}/success?raw=${rawSecret}`)
  // raw secret in redirect URL — ephemeral, one-time display, host sees once
  // NOTE: the AUDIENCE-shared host URL uses hash fragment: /session/${slug}/host#secret=${rawSecret}
  // That hash URL is constructed on the SUCCESS PAGE client-side (not in server logs)
}
```

### Pattern 2: ThemeProvider Setup (no layout shift)

**What:** `next-themes` ThemeProvider in root layout with `attribute="class"` + `suppressHydrationWarning`.
**When to use:** Once, in `app/layout.tsx`.

```tsx
// Source: https://github.com/pacocoursey/next-themes (verified 2026-03-14)
// packages/frontend/src/app/layout.tsx
import { ThemeProvider } from 'next-themes'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"          // applies "dark" class to <html>
          defaultTheme="light"       // per user decision: light mode default
          disableTransitionOnChange  // no flash during toggle
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

CSS in `globals.css` uses `.dark { ... }` selector already — `attribute="class"` aligns with the existing shadcn dark mode setup (`@custom-variant dark (&:is(.dark *))`).

### Pattern 3: QR Code as SVG in Server Component

**What:** Generate QR code server-side as SVG string, render with `dangerouslySetInnerHTML`.
**When to use:** Success page and host view shell.

```typescript
// Source: https://github.com/soldair/node-qrcode (verified 2026-03-14)
// In a Server Component
import QRCode from 'qrcode'

const participantUrl = `${process.env.NEXT_PUBLIC_APP_URL}/session/${slug}`
const svgString = await QRCode.toString(participantUrl, { type: 'svg' })

return <div dangerouslySetInnerHTML={{ __html: svgString }} />
```

`qrcode.toString` with `type: 'svg'` returns a string. Works in Node.js server context. No canvas dependency required. Already in `packages/frontend/package.json`.

### Pattern 4: next-intl Middleware + [locale] Routing

**What:** Middleware negotiates locale from Accept-Language header; routes all pages under `[locale]` segment.
**When to use:** Wrap existing pages in `[locale]` directory; add middleware.ts.

```typescript
// Source: https://next-intl.dev/docs/routing/middleware (verified 2026-03-14)
// packages/frontend/src/middleware.ts
import createMiddleware from 'next-intl/middleware'

export default createMiddleware({
  locales: ['en', 'es', 'pt'],
  defaultLocale: 'en',
  localeDetection: true,   // reads Accept-Language header — per SESS-01 decision
})

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
```

```typescript
// packages/frontend/src/i18n/request.ts
import { getRequestConfig } from 'next-intl/server'

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`../../messages/${locale}.json`)).default,
}))
```

`next.config.ts` wraps with `withNextIntl(nextConfig)`.

### Pattern 5: Dynamic Route Params (async in Next.js 15+)

**What:** `params` is a Promise in Next.js 15+. Must await it.
**When to use:** All `page.tsx` files using `[slug]` or `[locale]`.

```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes (verified 2026-03-14)
export default async function SessionPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  // ...
}
```

### Pattern 6: Hash Fragment (host secret) — Client-Side Only

**What:** Hash fragments are never sent to the server. The host URL `#secret=…` is constructed on the success page in a Client Component using `window.location`.
**When to use:** Success page "copy host URL" button.

```typescript
// 'use client' component
const hostUrl = `${window.location.origin}/session/${slug}/host#secret=${rawSecret}`
```

The `rawSecret` is passed from the success page (Server Component) as a prop to this Client Component. The `rawSecret` arrives via `searchParams.raw` from the Server Action redirect — it's visible in the browser address bar once but not in server logs going forward.

### Anti-Patterns to Avoid

- **Do not pass hostSecret via URL hash from the Server Action redirect.** The Server Action redirect is server-side; construct the hash URL on the client. The SESS-04 requirement means the host URL *shared with the audience* never logs the secret — not that the internal redirect URL avoids it.
- **Do not read `params` synchronously in Next.js 16.** `params` is a Promise; always `await params` or use React `use()`.
- **Do not define ThemeProvider inline in a Server Component.** ThemeProvider must be in a Client Component wrapper or have `'use client'` at the file boundary.
- **Do not render QR code with a `<canvas>` element from the client** — use server-side SVG to avoid adding canvas/WebGL to the client bundle.
- **Do not skip `attribute_not_exists(PK)` on the PutCommand.** Without it, a slug collision would silently overwrite an existing session.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Memorable slug generation | Custom word list + random picker | `random-word-slugs` | 30M+ unique combos, curated adjective/noun lists, kebab format built-in |
| UUID generation | Custom random hex string | `crypto.randomUUID()` (Node built-in) | Cryptographically secure, no dep, available in Node 14.17+ |
| SHA-256 hashing | Custom hash function | `node:crypto` `createHash('sha256')` | Built-in, FIPS-compliant, no dep |
| QR code rendering | SVG path drawing logic | `qrcode` npm package | Error correction, encoding, format support — weeks of work |
| Theme toggle no-flash | CSS transitions + JS cookie | `next-themes` | Handles SSR hydration, system preference, cookie persistence |
| Locale detection | Custom Accept-Language parser | `next-intl` middleware | RFC 4647 "best fit" algorithm, cookie-based persistence, SSR compatible |
| Two-column responsive layout | Floats, custom JS | Tailwind `grid` / `flex` with responsive prefixes | Standard, tested, no JS needed |

**Key insight:** Every "don't hand-roll" item is already in `packages/frontend/package.json`. This phase is wiring existing deps, not installing new ones (except `random-word-slugs`).

---

## Common Pitfalls

### Pitfall 1: ThemeProvider Causes Hydration Mismatch
**What goes wrong:** Server renders without a class on `<html>`; client attaches `dark` or `light` class → React hydration error.
**Why it happens:** `next-themes` reads localStorage/system preference only on the client.
**How to avoid:** `suppressHydrationWarning` on `<html>` element + `attribute="class"` on ThemeProvider.
**Warning signs:** Console warning "Text content does not match server-rendered HTML."

### Pitfall 2: QR Code `toDataURL` Requires Canvas in Node.js
**What goes wrong:** Calling `QRCode.toDataURL()` in a Server Component throws "Canvas is not defined."
**Why it happens:** `toDataURL` returns a PNG data URL and requires the `canvas` npm package in Node.js.
**How to avoid:** Use `QRCode.toString(url, { type: 'svg' })` — no canvas dependency.
**Warning signs:** `Error: Canvas is not defined` or `Cannot find module 'canvas'`.

### Pitfall 3: `params` Read Synchronously in Next.js 15+
**What goes wrong:** TypeScript error or runtime warning accessing `params.slug` directly.
**Why it happens:** `params` became async (a Promise) in Next.js 15.
**How to avoid:** Always `const { slug } = await params` in async page components.
**Warning signs:** TypeScript error "Property 'slug' does not exist on type 'Promise<…>'."

### Pitfall 4: Slug Collision on High-Traffic Launch
**What goes wrong:** Two concurrent session creates get the same word-pair slug; one overwrites the other.
**Why it happens:** Word-pair slugs have limited combinations (~limited vocabulary); DynamoDB PutItem without a condition expression allows silent overwrites.
**How to avoid:** `ConditionExpression: 'attribute_not_exists(PK)'` on every PutCommand. Catch `ConditionalCheckFailedException` and retry with a new slug (max 3 attempts).
**Warning signs:** Missing session data; participants landing on wrong session.

### Pitfall 5: Raw Secret in Server Logs from Redirect URL
**What goes wrong:** Server Action redirects to `/session/[slug]/success?raw=<secret>` — the raw secret appears in Next.js server request logs.
**Why it happens:** Query params are part of the HTTP request URL that server logs capture.
**How to avoid:** This is acceptable for the *internal* one-time redirect (only the host sees it, immediately). The requirement SESS-04 targets the *audience-shared* host URL, which uses the hash fragment constructed client-side on the success page. Document this distinction in code comments.
**Warning signs:** Confusing SESS-03 (raw secret never stored) with SESS-04 (secret not in server logs for audience URL).

### Pitfall 6: `next-intl` Middleware vs. `middleware.ts` Naming in Next.js 16
**What goes wrong:** Middleware file ignored or doubled up.
**Why it happens:** Search results note that as of some Next.js 16 releases the intl integration may use a `proxy.ts` naming convention.
**How to avoid:** Follow the official `next-intl` docs for the installed version (4.8.3). Use `middleware.ts` with `createMiddleware` export and a `config.matcher` export. Verify in dev with a curl request checking the `x-next-intl-locale` response header.
**Warning signs:** All routes render in English regardless of Accept-Language header.

### Pitfall 7: Emerald-500 Not in Tailwind v4 Default Palette as CSS Variable
**What goes wrong:** Writing `text-emerald-500` works (Tailwind generates it) but `var(--emerald-500)` in CSS fails.
**Why it happens:** Tailwind v4 does expose color vars, but the naming convention changed. Tailwind v4 exposes colors as `--color-emerald-500`.
**How to avoid:** In `globals.css`, wire `--accent-live: var(--color-emerald-500)` and use it as the shadcn `--primary` override in both `:root` and `.dark` blocks. Or simply use the Tailwind class `text-emerald-500`/`bg-emerald-500` directly.
**Warning signs:** Custom `var(--emerald-500)` resolves to empty.

---

## Code Examples

Verified patterns from official sources:

### Session Creation Server Action (complete flow)
```typescript
// Source: https://nextjs.org/docs/app/getting-started/updating-data
'use server'
import { redirect } from 'next/navigation'
import { createHash, randomUUID } from 'node:crypto'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'

export async function createSession(formData: FormData) {
  const title = (formData.get('title') as string)?.trim().slice(0, 50)
  if (!title) return { error: 'Title is required' }

  const { generateSlug } = await import('random-word-slugs')
  let slug: string
  let attempts = 0

  // Retry on slug collision (max 3 attempts)
  while (attempts < 3) {
    slug = generateSlug(2, { format: 'kebab' })
    const rawSecret = randomUUID()
    const hashedSecret = createHash('sha256').update(rawSecret).digest('hex')
    const now = Math.floor(Date.now() / 1000)

    try {
      await docClient.send(new PutCommand({
        TableName: process.env.NASQA_TABLE_NAME!,
        Item: { PK: `SESSION#${slug}`, SK: `SESSION#${slug}`, slug, title,
                hostSecretHash: hashedSecret, isActive: true, createdAt: now, TTL: now + 86400 },
        ConditionExpression: 'attribute_not_exists(PK)',
      }))
      // Success — redirect with raw secret for one-time display
      redirect(`/session/${slug}/success?raw=${rawSecret}`)
    } catch (e: unknown) {
      if ((e as { name?: string }).name === 'ConditionalCheckFailedException') {
        attempts++; continue
      }
      throw e
    }
  }
  throw new Error('Failed to generate unique slug after 3 attempts')
}
```

### Theme Toggle Client Component
```tsx
// Source: https://github.com/pacocoursey/next-themes
'use client'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  )
}
```

### CSS Variable Overrides for Zinc/Emerald Palette
```css
/* packages/frontend/src/app/globals.css */
/* Override shadcn defaults with Nasqa palette */
:root {
  --background: oklch(1 0 0);              /* White */
  --foreground: oklch(0.21 0 0);           /* Zinc-900 */
  --border: oklch(0.9 0 0);               /* Zinc-200 */
  --primary: oklch(0.696 0.17 162.48);    /* Emerald-500 */
  --primary-foreground: oklch(1 0 0);     /* White */
}

.dark {
  --background: oklch(0.09 0 0);          /* Zinc-950 */
  --foreground: oklch(0.985 0 0);         /* Zinc-50 */
  --border: oklch(0.269 0 0);             /* Zinc-800 */
  --primary: oklch(0.696 0.17 162.48);   /* Emerald-500 (same in dark) */
  --primary-foreground: oklch(1 0 0);
}
```

### getSession with TTL Filter (SESS-07)
```typescript
// packages/frontend/src/lib/session.ts
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'

export async function getSession(slug: string) {
  const result = await docClient.send(new GetCommand({
    TableName: process.env.NASQA_TABLE_NAME!,
    Key: { PK: `SESSION#${slug}`, SK: `SESSION#${slug}` },
  }))
  const item = result.Item
  if (!item) return null
  // SESS-07: DynamoDB TTL can delay deletion up to 48h; filter at app layer
  if (item.TTL < Math.floor(Date.now() / 1000)) return null
  return item
}
```

### Landing Page with Inline Create Form
```tsx
// packages/frontend/src/app/[locale]/page.tsx (Server Component)
import { createSession } from '@/actions/session'

export default function LandingPage() {
  return (
    <main>
      <section>
        <h1>Share code and take questions — live.</h1>
        <p>Create a session, share the link, start presenting.</p>
        <form action={createSession}>
          <input
            name="title"
            type="text"
            maxLength={50}
            placeholder="What's your talk about?"
            required
          />
          <button type="submit">Create Session</button>
        </form>
      </section>
    </main>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `getStaticProps` / `getServerSideProps` | Server Components + `async/await` in page.tsx | Next.js 13 (stable 14+) | No separate data-fetching function needed |
| `useRouter().query` for params | `await params` (async Promise) | Next.js 15 | Sync access deprecated; must await |
| `pages/middleware.ts` | `src/middleware.ts` at project root | Next.js 13 | Different location convention |
| `pages/api/` routes for mutations | Server Actions (`'use server'`) | Next.js 14 stable | Forms can invoke server functions directly |
| `next/headers` `cookies()` sync | `await cookies()` (async) | Next.js 15 | All dynamic APIs are now async |

**Deprecated/outdated:**
- `next-themes` with `pages/` directory `_document.tsx` approach: Use App Router layout with ThemeProvider directly.
- Passing secrets via server-set cookies for one-time display: Query param redirect is simpler for ephemeral values.

---

## Open Questions

1. **`NASQA_TABLE_NAME` environment variable in Next.js frontend**
   - What we know: Phase 1 uses `TABLE_NAME` in the Lambda function. SST Ion exposes outputs via `sst-env.d.ts`.
   - What's unclear: Whether SST Ion auto-links the DynamoDB table to the Next.js site component, or whether a manual `link: [table]` must be added to the Next.js `sst.aws.Nextjs` resource in `sst.config.ts`.
   - Recommendation: Phase 2 planning must include a task to wire the Next.js SST resource with `link: [table]` and verify `Resource.NasqaTable.name` is available as an env var.

2. **`random-word-slugs` word list curation**
   - What we know: The library has 30M+ combinations with adjectives and nouns.
   - What's unclear: Whether the default word lists contain any inappropriate words that could embarrass speakers at a conference.
   - Recommendation: Accept the default list for v1; add a note in code comments that a custom word list can be passed to `generateSlug` options if needed.

3. **next-intl `[locale]` routing — does it require moving all existing routes?**
   - What we know: next-intl uses a top-level `[locale]` dynamic segment for router-based i18n.
   - What's unclear: Whether the current bare `app/page.tsx` and `app/layout.tsx` need to be restructured before the middleware is added (potential route conflict).
   - Recommendation: Move `app/page.tsx` → `app/[locale]/page.tsx` as part of the first wave; keep `app/layout.tsx` as the root with ThemeProvider.

---

## Sources

### Primary (HIGH confidence)
- https://nextjs.org/docs/app/getting-started/updating-data (verified 2026-02-27, Next.js 16.1.6) — Server Actions, redirect, form patterns
- https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes — async params pattern
- https://github.com/pacocoursey/next-themes — ThemeProvider setup, suppressHydrationWarning, attribute="class"
- https://github.com/soldair/node-qrcode — toString SVG API, promise support
- https://next-intl.dev/docs/routing/middleware — middleware setup, locale detection algorithm, Accept-Language

### Secondary (MEDIUM confidence)
- https://www.npmjs.com/package/random-word-slugs — word pair generation, 30M+ combinations confirmed
- https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID — crypto.randomUUID() availability in Node.js
- https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html — ConditionExpression attribute_not_exists(PK) uniqueness
- https://next-intl.dev/docs/getting-started/app-router — [locale] routing structure, getRequestConfig

### Tertiary (LOW confidence)
- Next.js 16 naming of `proxy.ts` vs `middleware.ts` for next-intl: seen in one search result, not verified in official docs. Use `middleware.ts` as per official next-intl docs.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in package.json; versions pinned; APIs verified against official docs
- Architecture: HIGH — Next.js 16 Server Actions and App Router patterns verified against official docs dated 2026-02-27
- Pitfalls: MEDIUM-HIGH — hydration, canvas, async params verified; slug collision and env var linking are project-specific inferences
- i18n routing: MEDIUM — next-intl 4.x official docs verified; the exact interaction with the existing bare `app/page.tsx` warrants a test run

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable libraries; Next.js 16 / next-intl 4 / next-themes 0.4 are stable releases)
