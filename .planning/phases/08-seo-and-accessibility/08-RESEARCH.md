# Phase 8: SEO and Accessibility - Research

**Researched:** 2026-03-16
**Domain:** Next.js App Router metadata APIs, ARIA/semantic HTML, screen reader patterns
**Confidence:** HIGH

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**OG Image & Metadata**

- Landing page OG image: abstract branded graphic (brand colors and shapes, no screenshot, no text beyond the logo)
- Session page OG title format: "Session Title by Host Name"
- Session page OG description: dynamic session status (e.g., "Live now — 12 questions asked" or "Ended — 24 questions")
- Twitter/X card type: summary_large_image for all pages
- Session OG images: static branded image (same as landing page), not dynamically generated
- Structured data: JSON-LD with WebApplication schema on the landing page
- Canonical domain: clip.nasqa.io (no www, no trailing slashes)

**Screen Reader Announcements**

- New questions in Q&A feed: count-only announcements ("3 new questions"), not full content
- Vote actions: announce only the user's own action ("You upvoted this question. 5 votes total.")
- Politeness level: aria-live="polite" for Q&A feed announcements (wait for current reading to finish)

**Keyboard Navigation**

- Skip-to-content link: yes, targeting the Q&A feed, hidden visually until first Tab press
- Focus ring style: custom rings matching the design system (brand colors, visible offset), not browser defaults
- New-content banner focus behavior: Claude's discretion
- Q&A feed navigation pattern (roving tabindex vs tab-per-question): Claude's discretion

**Indexing & Crawling**

- Indexed pages: landing page + all locale variants (e.g., /en, /es)
- Session pages: blocked by both robots.txt Disallow AND noindex meta tag (belt-and-suspenders)
- Sitemap: static sitemap.xml listing landing page and locale variants
- Hreflang: yes, each locale page links to alternatives via hreflang tags

### Claude's Discretion

- Landing page tagline/meta description copy
- Host action screen reader announcement strategy
- New-content banner focus management for keyboard users
- Q&A feed keyboard navigation pattern (roving tabindex vs tab stops)
- OG image visual design details (exact colors, composition)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                     | Research Support                                                                                                                     |
| ------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| SEO-01  | `generateMetadata` produces dynamic title/description per session page          | `generateMetadata` async function with `params` confirmed in Next.js 16.1.6 docs; call `getSession(slug)` to get title and status    |
| SEO-02  | Static Open Graph image for landing page social sharing                         | `opengraph-image.tsx` file convention with `ImageResponse` from `next/og`; place in `app/[locale]/` or root `app/`                   |
| SEO-03  | Dynamic OG image per session showing title and QR code                          | CONTEXT.md overrides this to a static branded image — NOT dynamically generated; use same static OG image reference                  |
| SEO-04  | `robots.ts` blocks session pages from indexing, allows landing page             | `MetadataRoute.Robots` with `rules` array — disallow `/*/session/` paths                                                             |
| SEO-05  | `sitemap.ts` with landing page and locale variants                              | `MetadataRoute.Sitemap` with `alternates.languages` for en/es/pt; 3 locales × 1 page = 3 entries                                     |
| A11Y-01 | Semantic HTML audit — replace div wrappers with main/nav/section/article        | `SessionShell` uses `<div>` for content area that should be `<main>`; layout.tsx already has `<main>` but session page duplicates it |
| A11Y-02 | ARIA labels on all icon-only buttons and live regions for real-time updates     | `NewContentBanner` needs `aria-live` region; vote buttons already have `aria-label`; language switcher buttons lack `aria-label`     |
| A11Y-03 | Keyboard navigation — logical tab order, visible focus rings, modal focus traps | Skip-to-content link needed; focus ring already set on buttons via design system; dialogs use base-ui Dialog (handles focus trap)    |

</phase_requirements>

---

## Summary

Phase 8 covers two distinct domains: SEO/metadata and accessibility. Both are pure frontend work — no backend changes required. The existing Next.js 16.1.6 App Router provides first-class file-convention APIs for robots, sitemap, opengraph-image, and `generateMetadata` that cover all SEO requirements without any third-party libraries.

For SEO, the main work is: (1) creating `app/robots.ts` and `app/sitemap.ts` in the project root `app/` directory, (2) adding `generateMetadata` to the session page, (3) creating an `opengraph-image.tsx` using `ImageResponse` from `next/og` (already included in Next.js — no additional install), and (4) adding JSON-LD structured data to the landing page. The session OG image is explicitly decided to use the same static branded image as the landing page — SEO-03 becomes trivially "point to the same static OG image" in metadata, not a dynamic image route.

For accessibility, the work involves: semantic HTML fixes in `SessionShell` (the primary shell component uses `<div>` everywhere except the outer wrapper), adding a permanently-mounted `aria-live` region in `QAPanel` for new question announcements (replacing the current conditional render approach of `NewContentBanner`), a skip-to-content link in the layout, and ARIA labels on the language switcher buttons. The base-ui `Dialog` component already handles focus traps. Focus rings are already defined in the design system and applied to most buttons; the audit will catch any stragglers.

**Primary recommendation:** Implement SEO work first (robots, sitemap, OG image, generateMetadata) as independent file drops, then tackle accessibility as targeted component edits. No new libraries are needed for either domain.

---

## Standard Stack

### Core

| Library                                    | Version        | Purpose                                 | Why Standard                                                            |
| ------------------------------------------ | -------------- | --------------------------------------- | ----------------------------------------------------------------------- |
| `next/og` (built-in)                       | Next.js 16.1.6 | `ImageResponse` for OG image generation | Bundled with Next.js, no install; Satori-based JSX-to-PNG at build time |
| `MetadataRoute` (built-in)                 | Next.js 16.1.6 | Types for robots.ts and sitemap.ts      | First-class API, generates correct output format automatically          |
| `Metadata` / `generateMetadata` (built-in) | Next.js 16.1.6 | Per-page dynamic metadata               | Server Component only; memoized with page data fetches                  |

### Supporting

| Library                            | Version           | Purpose                                                 | When to Use                    |
| ---------------------------------- | ----------------- | ------------------------------------------------------- | ------------------------------ |
| `@base-ui/react/dialog`            | already installed | Focus trap for modal dialogs                            | Already used; no change needed |
| CSS `sr-only` / Tailwind `sr-only` | Tailwind          | Visually hidden but screen-reader accessible skip links | Skip-to-content link           |

### Alternatives Considered

| Instead of                       | Could Use                             | Tradeoff                                                                                                                                                                                                |
| -------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `next/og` ImageResponse          | Pre-rendered static PNG in `/public`  | Static PNG is simpler (no build-time generation) but cannot use brand fonts; ImageResponse with built-in Poppins via Google Fonts fetch is cleaner                                                      |
| File-based `opengraph-image.png` | `opengraph-image.tsx` (ImageResponse) | File-based PNG is zero-code — if the OG image is truly static, dropping a PNG in `app/opengraph-image.png` works with zero code. Given decision for abstract branded graphic, PNG is valid and simpler. |

**Installation:** No new packages needed. Everything is in Next.js 16.1.6 and existing dependencies.

---

## Architecture Patterns

### Recommended File Structure

```
packages/frontend/src/app/
├── robots.ts                          # SEO-04: blocks /*/session/* paths
├── sitemap.ts                         # SEO-05: landing + locale variants
├── opengraph-image.tsx                # SEO-02: static branded OG image
├── opengraph-image.alt.txt            # Alt text for OG image
├── layout.tsx                         # Update: metadataBase, title template, JSON-LD
└── [locale]/
    ├── layout.tsx                     # Update: hreflang alternates metadata
    ├── page.tsx                       # Update: landing page metadata + JSON-LD
    └── session/[slug]/
        └── page.tsx                   # SEO-01/03: generateMetadata for session
```

### Pattern 1: robots.ts — Disallow session paths

The robots.ts file goes in `app/` (not `app/[locale]/`) because Next.js serves it at the root.

```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/*/session/", "/en/session/", "/es/session/", "/pt/session/"],
      },
    ],
    sitemap: "https://clip.nasqa.io/sitemap.xml",
  };
}
```

**Key insight:** The locale-prefixed session paths need explicit disallow entries since Next.js uses `[locale]/session/[slug]` routing. Using `/*/session/` is the most concise glob-like pattern (supported by Google), but for maximum compatibility list all known locale prefixes.

### Pattern 2: sitemap.ts — Locale alternates

```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
import type { MetadataRoute } from "next";

const BASE_URL = "https://clip.nasqa.io";
const LOCALES = ["en", "es", "pt"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return LOCALES.map((locale) => ({
    url: `${BASE_URL}/${locale}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: locale === "en" ? 1.0 : 0.8,
    alternates: {
      languages: Object.fromEntries(LOCALES.map((l) => [l, `${BASE_URL}/${l}`])),
    },
  }));
}
```

### Pattern 3: generateMetadata — Dynamic session page

Session page has access to `getSession(slug)` already. The session data contains `title`, `isActive`, and question counts need to be fetched via `getSessionData`. However, for OG description the decision says to include question count, which means `getSessionData` is also needed in `generateMetadata`. Both calls are memoized by Next.js when called from the same page render.

```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/generate-metadata
import type { Metadata } from "next";

import { getSession, getSessionData } from "@/lib/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const session = await getSession(slug);
  if (!session) return { title: "Session not found" };

  const { questions } = await getSessionData(slug);
  const status = session.isActive
    ? `Live now — ${questions.length} questions asked`
    : `Ended — ${questions.length} questions`;

  return {
    title: `${session.title} by clip`,
    description: status,
    robots: { index: false, follow: false }, // belt-and-suspenders noindex
    openGraph: {
      title: `${session.title} by clip`, // format from CONTEXT.md
      description: status,
      images: ["/opengraph-image.png"], // same static OG as landing page
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${session.title} by clip`,
      description: status,
    },
  };
}
```

**Important:** The `robots: { index: false, follow: false }` in `generateMetadata` adds `<meta name="robots" content="noindex, nofollow">` to each session page. Combined with `robots.ts` Disallow, this is the belt-and-suspenders approach.

### Pattern 4: opengraph-image.tsx — Static branded image via ImageResponse

The OG image for the landing page. Since it's static (no dynamic data), it generates at build time and is cached indefinitely. Place at `app/opengraph-image.tsx` (root app dir) so it applies to all routes that don't override it.

```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image
import { ImageResponse } from 'next/og'

export const alt = 'clip — real-time clipboard and Q&A for live sessions'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div style={{
        background: '#0a0a0a',  // matches dark background
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Abstract branded composition — emerald accent shapes + wordmark */}
        <div style={{ fontSize: 72, fontWeight: 800, color: '#10b981' }}>
          clip
        </div>
      </div>
    ),
    { ...size }
  )
}
```

**Alternative approach (simpler):** Drop a static `app/opengraph-image.png` file. Next.js picks it up automatically — zero code. The CONTEXT.md says "abstract branded graphic (brand colors and shapes, no screenshot, no text beyond the logo)" — a static PNG designed outside the codebase and dropped into `app/` would work equally well.

### Pattern 5: JSON-LD Structured Data

JSON-LD is not supported via the `metadata` object — it must be injected as a `<script type="application/ld+json">` in the page JSX directly.

```tsx
// In landing page page.tsx (server component part or layout)
export default function LandingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "clip",
    url: "https://clip.nasqa.io",
    description: "Real-time clipboard and Q&A for live sessions",
    applicationCategory: "PresentationApplication",
    operatingSystem: "Web",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* rest of page */}
    </>
  );
}
```

**Constraint:** The landing page is currently `"use client"` because of `useActionState`. JSON-LD must be injected from a Server Component. Solution: extract the JSON-LD into the `[locale]/layout.tsx` or create a thin server wrapper that renders the script tag above the client component.

### Pattern 6: Skip-to-Content Link

```tsx
// In [locale]/layout.tsx, above the <header>
<a
  href="#qa-feed"
  className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:rounded-xl focus:bg-emerald-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
>
  Skip to Q&A feed
</a>
```

The `#qa-feed` anchor ID must be added to the Q&A panel's scroll container in `QAPanel`.

### Pattern 7: aria-live Region for New Question Announcements

The CONTEXT.md decision is count-only announcements ("3 new questions") with `aria-live="polite"`. The current `NewContentBanner` conditionally renders (`if (!visible) return null`), which breaks screen readers — an `aria-live` region must be permanently mounted to announce changes.

```tsx
// In QAPanel — permanently mounted, visually hidden
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {announcementText} {/* e.g. "3 new questions" or "" */}
</div>
```

`announcementText` is set when new questions arrive and cleared after a short delay (or set to empty when user scrolls to top). The visual `NewContentBanner` remains for sighted users.

### Pattern 8: Semantic HTML in SessionShell

Current structure in `session-shell.tsx`:

```
<div>                          // outer shell
  <div>                        // header — should be <header>
    <h1>session title</h1>
  </div>
  <div>                        // mobile tab bar — stays as div or becomes nav
  <div>                        // content area — should be <main> or stays div
    <div>{clipboardSlot}</div>
    <div>{qaSlot}</div>
  </div>
</div>
```

The `[locale]/layout.tsx` already wraps children in `<main>`. So `SessionShell`'s outer `<div>` renders inside `<main>`, and the session header `<div>` should be `<header>`. The mobile tab bar fits `<nav>`. The inner content divs wrapping clipboard and Q&A slots should use `<section>` with appropriate `aria-label`.

**Pitfall:** There cannot be a `<main>` inside `<main>`. Since `layout.tsx` already has `<main>`, `SessionShell` must not add another `<main>`. The session-specific header `<div>` → `<header>` is correct. The clipboard and Q&A columns should be `<section aria-label="Clipboard">` and `<section aria-label="Q&A">`.

### Pattern 9: Language Switcher ARIA Labels

Current `LanguageSwitcher` renders buttons with text content "EN", "ES", "PT" — these are readable by screen readers as-is (text content is accessible). However, the button meaning ("switch to English") is not fully descriptive. Add `aria-label="Switch to English"` and `aria-current="true"` for the active locale:

```tsx
<button
  onClick={() => handleLocaleChange(l.code)}
  aria-label={`Switch to ${l.label}`}
  aria-current={locale === l.code ? 'true' : undefined}
  className={...}
>
  {l.label}
</button>
```

### Anti-Patterns to Avoid

- **Two `<main>` elements:** `layout.tsx` already has `<main>`; `SessionShell` must not add another. Use `<header>`, `<section>`, `<nav>` within the existing `<main>`.
- **Conditionally rendering aria-live regions:** `aria-live` content must always be in the DOM. Only the text content changes; the element itself is always mounted.
- **Using `window.confirm` for anything:** Already prohibited by CLAUDE.md. Dialogs use base-ui Dialog (confirmed in clipboard-panel and question-card).
- **Dynamic OG images for sessions:** CONTEXT.md locks session OG images as the same static branded image as the landing page — do not create a dynamic `opengraph-image.tsx` route under the session segment.
- **robots.ts in `[locale]/app` directory:** Must be at the root `app/` level, not inside the locale segment — Next.js only serves `robots.txt` from the root.
- **JSON-LD in a client component:** `dangerouslySetInnerHTML` in a client component works but is suboptimal; prefer server component wrapper.

---

## Don't Hand-Roll

| Problem                    | Don't Build                    | Use Instead                                                     | Why                                                |
| -------------------------- | ------------------------------ | --------------------------------------------------------------- | -------------------------------------------------- |
| OG image PNG generation    | Custom Canvas/Puppeteer script | `ImageResponse` from `next/og`                                  | Built-in, build-time static, Satori JSX renderer   |
| robots.txt string building | Custom route handler           | `app/robots.ts` with `MetadataRoute.Robots`                     | First-class Next.js API, correct output guaranteed |
| sitemap.xml building       | Custom XML template strings    | `app/sitemap.ts` with `MetadataRoute.Sitemap`                   | First-class Next.js API, correct XML namespace     |
| Focus trap in modals       | Custom focus management        | `@base-ui/react/dialog` (already installed)                     | Already used in clipboard-panel and question-card  |
| JSON-LD injection          | Third-party schema library     | Plain `JSON.stringify` in `<script type="application/ld+json">` | Simple, no library overhead                        |

**Key insight:** Next.js file conventions (robots.ts, sitemap.ts, opengraph-image.tsx) generate perfectly formatted output with zero custom string manipulation. Never bypass these for custom route handlers.

---

## Common Pitfalls

### Pitfall 1: Two `<main>` elements on session pages

**What goes wrong:** Adding `<main>` to `SessionShell` while `[locale]/layout.tsx` already wraps children in `<main>` creates invalid HTML and confuses screen readers (NVDA/VoiceOver may announce "main region" twice).
**Why it happens:** Developer sees the session page has a distinct "main content area" and adds `<main>`.
**How to avoid:** Confirmed: `layout.tsx` line 29 already has `<main>{children}</main>`. `SessionShell` must use `<header>`, `<section aria-label="...">`, and `<nav>` only.
**Warning signs:** Accessibility audit tools (axe, WAVE) flag "multiple main landmarks."

### Pitfall 2: aria-live region conditionally rendered

**What goes wrong:** If `<div aria-live="polite">` is conditionally rendered (like `NewContentBanner` currently does with `if (!visible) return null`), screen readers do not announce content changes — the region must be in the DOM before content is injected.
**Why it happens:** Developer follows the same pattern as the visual banner.
**How to avoid:** Keep a permanently-mounted `<div aria-live="polite" className="sr-only">` in `QAPanel`. Swap its text content, don't conditionally render the element.
**Warning signs:** VoiceOver or NVDA does not announce new question counts during testing.

### Pitfall 3: Session pages indexed despite noindex

**What goes wrong:** `robots.ts` Disallow is a crawling directive (tells bots not to crawl) but not a noindex directive. A URL that's already indexed but later disallowed in robots.txt may remain in Google's index. The belt-and-suspenders requirement means BOTH robots.ts Disallow AND `robots: { index: false }` in `generateMetadata` are required.
**Why it happens:** Developer implements only robots.txt and considers the requirement met.
**How to avoid:** `generateMetadata` on the session page must return `robots: { index: false, follow: false }`.
**Warning signs:** Fetching `/en/session/[slug]` via `curl -I` shows no `X-Robots-Tag: noindex` header.

### Pitfall 4: landing page JSON-LD in a client component

**What goes wrong:** `app/[locale]/page.tsx` is `"use client"` (uses `useActionState`). `dangerouslySetInnerHTML` in a client component works but the JSON-LD won't be in the static HTML shell during SSR in some caching scenarios.
**Why it happens:** Naive addition of `<script>` to the existing client page.
**How to avoid:** Move JSON-LD to `[locale]/layout.tsx` (server component) where it's always rendered server-side, or create a thin server component wrapper that renders the script tag and composes the client page as a child.

### Pitfall 5: OG image path reference mismatch

**What goes wrong:** Referencing `/opengraph-image.png` in session page `generateMetadata` while the actual file is `app/opengraph-image.tsx` (which Next.js serves as `/opengraph-image`). The URL must match what Next.js generates.
**Why it happens:** Confusion between file-based (`.png` drop-in) and code-generated (`.tsx`) OG images.
**How to avoid:** If using `opengraph-image.tsx` (code-generated), Next.js serves it at `/opengraph-image` — reference as `metadataBase + '/opengraph-image'`. If using a static `opengraph-image.png` file drop, reference as `/opengraph-image.png`.

### Pitfall 6: Skip-to-content anchor target missing

**What goes wrong:** The skip link `href="#qa-feed"` has no matching `id="qa-feed"` in the DOM, so Tab+Enter on the skip link does nothing.
**Why it happens:** Skip link added to layout without updating the target component.
**How to avoid:** Add `id="qa-feed"` to the scroll container `<div ref={scrollContainerRef}>` in `QAPanel`.

---

## Code Examples

### robots.ts with locale-prefixed session disallow

```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots (v16.1.6)
// File: packages/frontend/src/app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/en/session/", "/es/session/", "/pt/session/"],
    },
    sitemap: "https://clip.nasqa.io/sitemap.xml",
  };
}
```

### sitemap.ts with hreflang alternates

```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap (v16.1.6)
// File: packages/frontend/src/app/sitemap.ts
import type { MetadataRoute } from "next";

const BASE = "https://clip.nasqa.io";
const LOCALES = ["en", "es", "pt"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return LOCALES.map((locale) => ({
    url: `${BASE}/${locale}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: locale === "en" ? 1.0 : 0.8,
    alternates: {
      languages: Object.fromEntries(LOCALES.map((l) => [l, `${BASE}/${l}`])),
    },
  }));
}
```

### Permanently-mounted aria-live region (QAPanel)

```tsx
// Inside QAPanel return — always in DOM, text content changes on new questions
const [announcement, setAnnouncement] = useState('')

// When new questions arrive (in the existing useEffect):
setAnnouncement(`${newQuestionCount} new question${newQuestionCount !== 1 ? 's' : ''}`)

// When user scrolls to top (in scrollToTop callback):
setAnnouncement('')

// In JSX — always rendered:
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {announcement}
</div>
```

### Skip-to-content link

```tsx
// In [locale]/layout.tsx, before <header>
<a
  href="#qa-feed"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-xl focus:bg-emerald-500 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
>
  Skip to Q&A feed
</a>
```

### Session page generateMetadata

```typescript
// File: packages/frontend/src/app/[locale]/session/[slug]/page.tsx
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const session = await getSession(slug);
  if (!session) return { title: "Session not found — clip" };

  const { questions } = await getSessionData(slug);
  const status = session.isActive
    ? `Live now — ${questions.length} questions asked`
    : `Ended — ${questions.length} questions`;

  const ogImageUrl = "https://clip.nasqa.io/opengraph-image";

  return {
    title: `${session.title} — clip`,
    description: status,
    robots: { index: false, follow: false },
    openGraph: {
      title: `${session.title} by clip`,
      description: status,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: "clip — real-time Q&A" }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${session.title} by clip`,
      description: status,
      images: [ogImageUrl],
    },
  };
}
```

### Root layout metadataBase

```typescript
// File: packages/frontend/src/app/layout.tsx — update existing metadata export
export const metadata: Metadata = {
  metadataBase: new URL("https://clip.nasqa.io"),
  title: {
    default: "clip — real-time clipboard and Q&A",
    template: "%s — clip",
  },
  description: "Share code snippets and collect audience questions in real time.",
  openGraph: {
    siteName: "clip",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};
```

---

## State of the Art

| Old Approach                            | Current Approach                                  | When Changed                 | Impact                                                                           |
| --------------------------------------- | ------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------- |
| `next-seo` library                      | Built-in `metadata` object + `generateMetadata`   | Next.js 13.2 (stable in 13+) | No library needed; first-class API                                               |
| `opengraph-image.alt.txt` separate file | `export const alt = '...'` in opengraph-image.tsx | Next.js 13.3                 | Collocated exports; simpler                                                      |
| Custom `robots.txt` static file         | `app/robots.ts` file convention                   | Next.js 13.3                 | TypeScript types, programmatic generation                                        |
| Custom sitemap route handler            | `app/sitemap.ts` file convention                  | Next.js 13.3                 | Automatic XML formatting, hreflang via `alternates`                              |
| Streaming metadata (new)                | `generateMetadata` can stream in Next.js 15.2+    | Next.js 15.2                 | In Next.js 16.1.6, streaming is default; HTML-limited bots get blocking metadata |
| `params` as plain object                | `params` is a `Promise<{...}>`                    | Next.js 16.0                 | Must `await params` — current session page already does this                     |

**Deprecated/outdated:**

- `next-seo`: Third-party library replaced by first-class Next.js metadata APIs. Do not install.
- `themeColor` / `colorScheme` / `viewport` in `metadata` object: deprecated since Next.js 14, moved to `generateViewport`.
- Static `public/robots.txt`: Works but is not programmatic; file-convention `app/robots.ts` is preferred.

---

## Open Questions

1. **OG image: static PNG vs ImageResponse TSX**
   - What we know: Both work. CONTEXT.md says "abstract branded graphic." ImageResponse gives brand font control; static PNG requires an external design tool.
   - What's unclear: Whether the planner should specify the exact visual (colors, layout) for the ImageResponse JSX or defer to the implementer.
   - Recommendation: Use `app/opengraph-image.tsx` with `ImageResponse` for full control. The OG image design details are Claude's discretion per CONTEXT.md. Implement with emerald-500 (#10b981) on near-black background with the "clip" wordmark — matches brand exactly.

2. **`getSessionData` call in `generateMetadata` — performance**
   - What we know: Next.js memoizes `fetch` calls but `getSessionData` uses DynamoDB SDK directly (not `fetch`). React `cache()` can be used to memoize non-fetch calls.
   - What's unclear: Whether the DynamoDB call in `generateMetadata` causes a double-fetch (once for metadata, once for the page).
   - Recommendation: Wrap `getSession` and `getSessionData` with React `cache()` in `lib/session.ts` so both `generateMetadata` and the page component share the same cached result. This is a one-line change per function.

3. **Q&A feed keyboard navigation: roving tabindex vs individual tab stops**
   - What we know: CONTEXT.md leaves this to Claude's discretion. Questions are in an `AnimatePresence`-managed list with dynamic ordering.
   - What's unclear: Whether roving tabindex is worth the complexity given dynamic reordering.
   - Recommendation: Use standard tab-per-question (each QuestionCard is in natural tab order). Roving tabindex adds significant complexity and is better suited for toolbar/menu patterns, not feed lists. The focus ring design system rule already covers individual card focus visibility.

---

## Sources

### Primary (HIGH confidence)

- `https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots` — `MetadataRoute.Robots` API, version 16.1.6 verified
- `https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap` — `MetadataRoute.Sitemap` API with `alternates.languages`, version 16.1.6 verified
- `https://nextjs.org/docs/app/api-reference/functions/generate-metadata` — `generateMetadata`, `openGraph`, `twitter`, `robots` metadata fields, version 16.1.6 verified
- `https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image` — `ImageResponse` file convention, `alt`/`size`/`contentType` exports, version 16.1.6 verified
- Codebase audit: `session-shell.tsx`, `qa-panel.tsx`, `new-content-banner.tsx`, `language-switcher.tsx`, `theme-toggle.tsx`, `clipboard-panel.tsx`, `question-card.tsx`, `layout.tsx` (locale + root) — direct inspection

### Secondary (MEDIUM confidence)

- DESIGN_SYSTEM.md — focus ring pattern, emerald-500 brand color, semantic HTML requirements
- CONTEXT.md — all locked decisions treated as authoritative for research scope

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all APIs verified against official Next.js 16.1.6 docs retrieved live
- Architecture: HIGH — patterns derived from official docs + direct codebase inspection
- Pitfalls: HIGH — grounded in actual codebase state (e.g., confirmed two-`<main>` risk from reading layout.tsx)

**Research date:** 2026-03-16
**Valid until:** 2026-06-16 (stable Next.js APIs; 90 days)
