---
phase: 08-seo-and-accessibility
plan: "01"
subsystem: seo
tags: [seo, metadata, opengraph, structured-data, robots, sitemap]
dependency_graph:
  requires: []
  provides: [robots-txt, sitemap-xml, og-image, session-generateMetadata, root-metadataBase, json-ld]
  affects: [packages/frontend/src/app, packages/frontend/src/app/[locale]/layout.tsx, packages/frontend/src/app/[locale]/session/[slug]/page.tsx]
tech_stack:
  added: [next/og ImageResponse]
  patterns: [Next.js App Router metadata API, generateMetadata async export, JSON-LD via dangerouslySetInnerHTML]
key_files:
  created:
    - packages/frontend/src/app/robots.ts
    - packages/frontend/src/app/sitemap.ts
    - packages/frontend/src/app/opengraph-image.tsx
  modified:
    - packages/frontend/src/app/layout.tsx
    - packages/frontend/src/app/[locale]/layout.tsx
    - packages/frontend/src/app/[locale]/session/[slug]/page.tsx
decisions:
  - "Session pages use static /opengraph-image (not dynamic) — brand consistency over per-session thumbnails"
  - "Product name is 'clip' in all metadata and header link — not 'nasqa'"
  - "Session pages carry noindex robots (belt-and-suspenders) — sessions are ephemeral and audience-scoped"
  - "JSON-LD injected in locale layout (server component) — landing page is client component; structure-data always in static HTML shell"
metrics:
  duration: "2 min"
  completed: "2026-03-17"
  tasks_completed: 2
  files_changed: 6
---

# Phase 8 Plan 01: SEO Metadata Infrastructure Summary

**One-liner:** Complete SEO infrastructure — robots.txt, sitemap.xml with hreflang, static branded OG image (emerald-on-dark), dynamic session generateMetadata with noindex, root metadataBase, and WebApplication JSON-LD.

## What Was Built

**Task 1: robots.ts, sitemap.ts, opengraph-image.tsx**

- `robots.ts` exports `MetadataRoute.Robots` disallowing `/en/session/`, `/es/session/`, `/pt/session/` for all user agents; references `https://clip.nasqa.io/sitemap.xml`
- `sitemap.ts` returns 3 entries (one per locale) with `changeFrequency: "monthly"`, `priority: 1.0` for `en` and `0.8` for `es`/`pt`, plus `alternates.languages` hreflang for all 3 locales per entry
- `opengraph-image.tsx` generates a 1200×630 PNG via `ImageResponse`: Zinc-950 background (#09090b), radial emerald glow (rgba 16,185,129), centered "clip" wordmark in emerald-500 (#10b981) at 96px bold

**Task 2: metadataBase, JSON-LD, generateMetadata**

- `app/layout.tsx`: `metadataBase: new URL("https://clip.nasqa.io")`, title template `"%s — clip"`, `openGraph.siteName: "clip"`, `twitter.card: "summary_large_image"`
- `[locale]/layout.tsx`: WebApplication JSON-LD structured data injected as `<script type="application/ld+json">` before the header; header link text updated from "nasqa" to "clip"
- `[locale]/session/[slug]/page.tsx`: `generateMetadata` awaits params, calls `getSession` (returns `{ title: "Session not found" }` on miss), calls `getSessionData` for question count, builds live/ended status string, returns full metadata with `robots: { index: false, follow: false }` and static `/opengraph-image` reference

## Verification

- `npx tsc --noEmit -p packages/frontend/tsconfig.json` — passes (pre-existing test file error in `qa-input.test.tsx` is out-of-scope)
- `npm run build --prefix packages/frontend` — succeeds; routes `/robots.txt`, `/sitemap.xml`, `/opengraph-image` shown as static; `/[locale]/session/[slug]` shown as dynamic (ƒ)

## Deviations from Plan

None — plan executed exactly as written.

## Deferred Items

- `packages/frontend/src/__tests__/qa-input.test.tsx` line 17 TypeScript error (`Mock<Procedure | Constructable>` not assignable to `(text: string) => void`) — pre-existing, out-of-scope for this plan.

## Self-Check: PASSED

Files verified:

- packages/frontend/src/app/robots.ts — FOUND
- packages/frontend/src/app/sitemap.ts — FOUND
- packages/frontend/src/app/opengraph-image.tsx — FOUND

Commits verified:

- fe9ca73 (Task 1) — FOUND
- 9b104fd (Task 2) — FOUND
