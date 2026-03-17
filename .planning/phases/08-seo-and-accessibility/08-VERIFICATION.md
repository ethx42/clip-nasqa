---
phase: 08-seo-and-accessibility
verified: 2026-03-16T00:00:00Z
status: gaps_found
score: 7/8 must-haves verified
gaps:
  - truth: "An opengraph-image.tsx generates a static branded OG image — AND session pages reference it via generateMetadata covering SEO-03 (dynamic OG per session)"
    status: partial
    reason: "REQUIREMENTS.md SEO-03 specifies 'Dynamic OG image per session showing title and QR code'. The CONTEXT.md planning decision downgraded this to a static branded image (no dynamic generation, no QR code). The static image path /opengraph-image is referenced from session generateMetadata, covering brand consistency and social sharing, but the QR-code-per-session dynamic OG image described in SEO-03 was never built. This is a deliberate scope reduction, not an oversight, but the requirement as written is not satisfied."
    artifacts:
      - path: "packages/frontend/src/app/opengraph-image.tsx"
        issue: "Static branded image only — no per-session dynamic generation. QR code element absent."
      - path: "packages/frontend/src/app/[locale]/session/[slug]/page.tsx"
        issue: "generateMetadata references /opengraph-image (static) not a dynamic per-session OG route."
    missing:
      - "Either: a dynamic /[locale]/session/[slug]/opengraph-image.tsx route generating per-session OG image with title and QR code"
      - "Or: formal downgrade of SEO-03 in REQUIREMENTS.md to reflect the locked decision (static image only, no QR code)"
human_verification:
  - test: "Skip-to-content link visibility"
    expected: "First Tab press from any page shows the 'Skip to Q&A feed' link styled with emerald background at top-left"
    why_human: "sr-only / focus:not-sr-only CSS behaviour requires live browser Tab interaction to confirm"
  - test: "Screen reader announces new questions"
    expected: "When a new question arrives in QAPanel, screen reader reads 'N new question(s)' once, without double-reading from NewContentBanner"
    why_human: "aria-live polite region announcement requires actual assistive technology testing (VoiceOver / NVDA)"
  - test: "Session OG image renders in social preview"
    expected: "Sharing a session URL on Slack/Twitter shows the branded emerald-on-dark 'clip' image, with dynamic session title in the link preview title"
    why_human: "Social card rendering requires an actual unfurl from an external service or og:image debug tool"
---

# Phase 8: SEO and Accessibility Verification Report

**Phase Goal:** Search engines index the landing page correctly (with OG image), session pages are excluded from indexing, and all interactive components are usable by keyboard and screen reader users.
**Verified:** 2026-03-16
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                                                                                                                                                  | Status   | Evidence                                                                                                                                                                                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Fetching /robots.txt returns Disallow rules for all locale session paths and a sitemap reference                                                                                                                       | VERIFIED | `robots.ts` disallows `/en/session/`, `/es/session/`, `/pt/session/`; references `https://clip.nasqa.io/sitemap.xml`                                                                                                 |
| 2   | Fetching /sitemap.xml returns entries for the landing page in all 3 locales with hreflang alternates                                                                                                                   | VERIFIED | `sitemap.ts` maps over `["en","es","pt"]`; each entry includes `alternates.languages` with all 3 locale URLs                                                                                                         |
| 3   | The root layout declares metadataBase as https://clip.nasqa.io with a title template                                                                                                                                   | VERIFIED | `app/layout.tsx` line 21-26: `metadataBase: new URL("https://clip.nasqa.io")`, `title: { default: "...", template: "%s — clip" }`                                                                                    |
| 4   | Session pages have generateMetadata producing dynamic title, description, noindex robots, and OG tags pointing to the static branded image                                                                             | VERIFIED | `session/[slug]/page.tsx` exports `generateMetadata`; returns `robots: { index: false, follow: false }`, `openGraph.images: ["/opengraph-image"]`, dynamic title/description from `getSession` + `getSessionData`    |
| 5   | The landing page layout includes JSON-LD WebApplication structured data                                                                                                                                                | VERIFIED | `[locale]/layout.tsx` lines 19-34: `jsonLd` object with `@type: "WebApplication"` injected via `<script type="application/ld+json" dangerouslySetInnerHTML>`                                                         |
| 6   | An opengraph-image.tsx generates a static branded OG image with emerald-on-dark composition                                                                                                                            | VERIFIED | `app/opengraph-image.tsx`: `ImageResponse` with `#09090b` background, emerald radial glow, "clip" wordmark at 96px `#10b981`; exports `alt`, `size`, `contentType`                                                   |
| 7   | SEO-03: Dynamic OG image per session showing title and QR code                                                                                                                                                         | FAILED   | SEO-03 in REQUIREMENTS.md specifies a dynamic per-session OG image with title and QR code. CONTEXT.md locked decision: use static branded image for all pages. No per-session OG route exists; no QR code generated. |
| 8   | SessionShell uses semantic HTML: header, nav, section with aria-label; QAPanel has permanently-mounted aria-live polite region; skip-to-content link appears on Tab; language switcher has aria-label and aria-current | VERIFIED | All four components verified below                                                                                                                                                                                   |

**Score:** 7/8 truths verified

---

## Required Artifacts

### Plan 01 Artifacts

| Artifact                                                     | Provides                                      | Exists | Substantive                                                                                                                                                               | Wired                                                                  | Status   |
| ------------------------------------------------------------ | --------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------- |
| `packages/frontend/src/app/robots.ts`                        | robots.txt with session path disallow rules   | Yes    | Yes — 12 lines, correct Disallow array + sitemap ref                                                                                                                      | Used by Next.js file-based routing                                     | VERIFIED |
| `packages/frontend/src/app/sitemap.ts`                       | sitemap.xml with locale variants and hreflang | Yes    | Yes — 16 lines, 3-locale map with alternates.languages                                                                                                                    | Used by Next.js file-based routing                                     | VERIFIED |
| `packages/frontend/src/app/opengraph-image.tsx`              | Static branded OG image via ImageResponse     | Yes    | Yes — 46 lines, `ImageResponse` with correct composition; exports `alt`, `size`, `contentType`, `default`                                                                 | Referenced by `generateMetadata` in session page as `/opengraph-image` | VERIFIED |
| `packages/frontend/src/app/[locale]/session/[slug]/page.tsx` | Dynamic generateMetadata for session pages    | Yes    | Yes — `generateMetadata` function present, calls `getSession(slug)` and `getSessionData(slug)`, returns full metadata including `robots: { index: false, follow: false }` | Exported from Next.js page file; invoked by framework at request time  | VERIFIED |

### Plan 02 Artifacts

| Artifact                                                     | Provides                                                         | Exists | Substantive                                                                                                                                                                                                                                                       | Wired                                                                | Status   |
| ------------------------------------------------------------ | ---------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------- |
| `packages/frontend/src/components/session/session-shell.tsx` | Semantic landmarks: header, nav, section                         | Yes    | Yes — `<header>` on title bar (line 67), `<nav aria-label={t("sessionPanels")}>` on mobile tab bar (line 79), `<section aria-label={t("clipboard")}>` and `<section aria-label={t("qa")}>` for desktop columns (lines 122-125), `<section>` for mobile (line 131) | Rendered inside `<main>` from layout.tsx; no duplicate main landmark | VERIFIED |
| `packages/frontend/src/components/session/qa-panel.tsx`      | Permanently-mounted aria-live region and id anchor for skip link | Yes    | Yes — `<div aria-live="polite" aria-atomic="true" className="sr-only">` at line 136 (unconditional, outside scroll container); `id="qa-feed"` on scroll container div (line 142)                                                                                  | Used in session page via SessionLivePage                             | VERIFIED |
| `packages/frontend/src/components/language-switcher.tsx`     | ARIA labels on locale buttons                                    | Yes    | Yes — `role="group" aria-label="Language"` on wrapper (line 29); `aria-label={`Switch to ${l.language}`}` on each button (line 39); `aria-current={locale === l.code ? "true" : undefined}` (line 40); separator pipes have `aria-hidden="true"`                  | Rendered in locale layout header                                     | VERIFIED |
| `packages/frontend/src/app/[locale]/layout.tsx`              | Skip-to-content link                                             | Yes    | Yes — `<a href="#qa-feed">` with `sr-only focus:not-sr-only` pattern (lines 36-41); localized via `t("skipToQaFeed")` with all 3 locale message keys present                                                                                                      | Before `<header>` in locale layout, renders on every page            | VERIFIED |

---

## Key Link Verification

### Plan 01 Key Links

| From                      | To               | Via                                                          | Status | Details                                                                                                                                                                     |
| ------------------------- | ---------------- | ------------------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `session/[slug]/page.tsx` | `lib/session.ts` | `getSession(slug)` call in generateMetadata                  | WIRED  | `getSession` and `getSessionData` are imported (line 5) and called in both `generateMetadata` and `SessionPage`; `lib/session.ts` exports both functions at lines 15 and 60 |
| `app/layout.tsx`          | all pages        | `metadataBase: new URL("https://clip.nasqa.io")` propagation | WIRED  | `metadataBase` present at line 21; Next.js framework propagates to all child pages                                                                                          |

### Plan 02 Key Links

| From                  | To             | Via                                                | Status | Details                                                                                                                                                                                                                               |
| --------------------- | -------------- | -------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[locale]/layout.tsx` | `qa-panel.tsx` | skip link `href="#qa-feed"` targets `id="qa-feed"` | WIRED  | layout.tsx line 37: `href="#qa-feed"`; qa-panel.tsx line 142: `id="qa-feed"` on scroll container div                                                                                                                                  |
| `qa-panel.tsx`        | screen reader  | `aria-live="polite"` region text content swap      | WIRED  | Lines 136-138: `<div aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>` — permanently mounted, not conditionally rendered; `announcement` state set by useEffect on `questions.length` change (line 107) |

---

## Requirements Coverage

| Requirement | Description                                                                     | Source Plan | Status                         | Evidence                                                                                                                                                                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------- | ----------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEO-01      | `generateMetadata` produces dynamic title/description per session page          | 08-01       | SATISFIED                      | `generateMetadata` in session page: dynamic `title: session.title`, `description: status` (live/ended + count)                                                                                                                                                                      |
| SEO-02      | Static Open Graph image for landing page social sharing                         | 08-01       | SATISFIED                      | `opengraph-image.tsx` generates static branded PNG; `app/layout.tsx` provides `metadataBase` so the relative path resolves correctly                                                                                                                                                |
| SEO-03      | Dynamic OG image per session showing title and QR code                          | 08-01       | NOT SATISFIED                  | CONTEXT.md decision locked this as static branded image. No per-session dynamic OG route with title or QR code was built. Session pages reference the same static `/opengraph-image`. The requirement text in REQUIREMENTS.md has NOT been updated to reflect this scope reduction. |
| SEO-04      | `robots.ts` blocks session pages from indexing, allows landing page             | 08-01       | SATISFIED                      | `robots.ts`: `disallow: ["/en/session/", "/es/session/", "/pt/session/"]`; `allow: "/"`                                                                                                                                                                                             |
| SEO-05      | `sitemap.ts` with landing page and locale variants                              | 08-01       | SATISFIED                      | `sitemap.ts`: 3 locale entries with `alternates.languages` hreflang                                                                                                                                                                                                                 |
| A11Y-01     | Semantic HTML audit — replace div wrappers with main/nav/section/article        | 08-02       | SATISFIED                      | SessionShell: `<header>`, `<nav>`, `<section>` landmarks in place; no duplicate `<main>` (layout.tsx already wraps children in `<main>`)                                                                                                                                            |
| A11Y-02     | ARIA labels on all icon-only buttons and live regions for real-time updates     | 08-02       | SATISFIED                      | LanguageSwitcher: `aria-label` + `aria-current` on buttons; QAPanel: permanently-mounted `aria-live="polite"` region; NewContentBanner: `aria-hidden="true"` prevents double-announcement                                                                                           |
| A11Y-03     | Keyboard navigation — logical tab order, visible focus rings, modal focus traps | 08-02       | SATISFIED (pending human test) | Skip link present with `sr-only focus:not-sr-only` pattern; NewContentBanner has `focus:ring-2 focus:ring-emerald-500`; focus ring styles via Tailwind design system                                                                                                                |

---

## Anti-Patterns Found

| File                     | Line | Pattern                                                        | Severity | Impact                                                                                                                                                                                          |
| ------------------------ | ---- | -------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `new-content-banner.tsx` | 21   | `if (!visible) return null` — component conditionally unmounts | Info     | By design: the visual banner intentionally unmounts when hidden. Screen reader announcements are handled exclusively by the always-mounted `aria-live` region in QAPanel. No accessibility gap. |

No blocker or warning-level anti-patterns found.

---

## Human Verification Required

### 1. Skip-to-content link visibility

**Test:** Open the session page in a browser. Press Tab once from the URL bar.
**Expected:** A styled emerald link "Skip to Q&A feed" (or locale equivalent) appears at top-left of the viewport.
**Why human:** `sr-only` / `focus:not-sr-only` requires live browser keyboard interaction to confirm the CSS transition fires correctly.

### 2. Screen reader announces new questions

**Test:** With VoiceOver (macOS) or NVDA (Windows) active, open a live session page. Have another user submit a new question.
**Expected:** Screen reader announces "N new question(s)" once. The visual NewContentBanner (if visible) does not cause a second announcement.
**Why human:** `aria-live` polite region behaviour requires actual assistive technology; `aria-hidden="true"` on NewContentBanner is verified in code but double-announcement suppression needs end-to-end confirmation.

### 3. Session OG image renders in social preview

**Test:** Share a session URL (e.g., `https://clip.nasqa.io/en/session/my-session`) in Slack or use `https://www.opengraph.xyz/` to unfurl it.
**Expected:** Preview shows the branded emerald-on-dark "clip" image (1200x630), the dynamic session title in the title field, and the live/ended status in the description.
**Why human:** Social card rendering requires an external service unfurl; `metadataBase` resolution cannot be verified statically.

---

## Gaps Summary

One gap found: **SEO-03 as written in REQUIREMENTS.md is not satisfied.**

The requirement specifies a "Dynamic OG image per session showing title and QR code." During phase planning, CONTEXT.md locked a deliberate scope reduction: session pages use the same static branded OG image as the landing page. No per-session dynamic image route (`/[locale]/session/[slug]/opengraph-image.tsx`) was built, and no QR code generation was implemented.

This is a documented, intentional decision — not a regression or oversight. However, the REQUIREMENTS.md entry still reads "Dynamic OG image per session showing title and QR code" and is marked `[x] Complete`, which is inaccurate.

**Resolution options (choose one):**

1. Build the dynamic per-session OG route using `next/og` `ImageResponse` with session title text and a rendered QR code (full SEO-03 as written).
2. Update REQUIREMENTS.md SEO-03 description to reflect what was actually built: "Static branded OG image referenced from session generateMetadata; dynamic title and status in OG metadata fields" — and close the gap by documentation only.

---

_Verified: 2026-03-16_
_Verifier: Claude (gsd-verifier)_
