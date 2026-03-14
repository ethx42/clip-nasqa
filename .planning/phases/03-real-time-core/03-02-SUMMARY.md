---
phase: 03-real-time-core
plan: 02
subsystem: frontend-ui
tags: [shiki, clipboard, snippet, host-input, server-actions, rsc]

# Dependency graph
requires:
  - phase: 03-real-time-core
    plan: 01
    provides: appsyncClient, PUSH_SNIPPET mutation, @nasqa/core Snippet type
  - phase: 02-session-and-view-shell
    provides: ClipboardPanel slot wiring, CopyButton component

provides:
  - ShikiBlock async RSC for dual-theme server-side syntax highlighting
  - linkify.tsx shared utility for URL auto-linking in text content
  - SnippetHero full-width hero card with line numbers and copy button
  - SnippetCard compact history card with truncation
  - detect-language.ts client-safe language detection heuristics
  - renderHighlight and pushSnippetAction Server Actions
  - HostInput composer with live Shiki preview, language override, Cmd+Enter
  - ClipboardPanel Client Component with hero/history layout, lazy loading, empty state

affects:
  - 03-03 (SubscriptionProvider will update ClipboardPanel snippets prop via state)
  - 03-04 (QAPanel — linkify.tsx is ready for Q&A text rendering)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shiki kept server-side only via async RSC (ShikiBlock) and Server Action (renderHighlight)"
    - "ClipboardPanel is Client Component; snippet rendering delegated to Server Action for new snippets"
    - "linkify.tsx exported as shared util for both clipboard text snippets and Q&A replies"
    - "IntersectionObserver sentinel pattern for lazy history loading (visibleCount + 10)"
    - "300ms debounced renderHighlight Server Action call for live preview without client Shiki bundle"
    - "Cmd/Ctrl+Enter shortcut in HostInput; input clears optimistically on push"

key-files:
  created:
    - packages/frontend/src/components/session/shiki-block.tsx
    - packages/frontend/src/components/session/snippet-hero.tsx
    - packages/frontend/src/components/session/snippet-card.tsx
    - packages/frontend/src/lib/linkify.tsx
    - packages/frontend/src/lib/detect-language.ts
    - packages/frontend/src/actions/snippet.ts
    - packages/frontend/src/components/session/host-input.tsx
  modified:
    - packages/frontend/src/components/session/clipboard-panel.tsx (replaced: Server Component stub -> Client Component with full layout)
    - packages/frontend/src/app/globals.css (added: Shiki dark mode CSS + line number gutter)
    - packages/frontend/src/app/[locale]/session/[slug]/host/page.tsx (updated: ClipboardPanel stub props)

key-decisions:
  - "ShikiBlock remains pure RSC (no use client) — Shiki stays entirely out of client bundle"
  - "ClipboardPanel is Client Component; HeroCard/HistoryCard are inline sub-components that call renderHighlight Server Action for new snippets"
  - "linkify.tsx placed in lib/ and exported for reuse in Q&A text rendering (Plan 04)"
  - "SnippetCard shows raw text truncation (line-clamp-3) in collapsed state, not Shiki HTML — avoids Server Action call for history items unless expanded"
  - "host/page.tsx ClipboardPanel updated with stub props (slug, snippets=[], hostSecretHash=) so TypeScript passes; Plan 04 will supply real data"

# Metrics
duration: 5min
completed: 2026-03-14
---

# Phase 3 Plan 02: Clipboard UI Components Summary

**Shiki server-side syntax highlighting RSC, dual-theme via CSS variables, SnippetHero/Card display components, HostInput composer with live Server Action preview, ClipboardPanel Client Component with lazy history loading**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-14T15:57:40Z
- **Completed:** 2026-03-14T16:03:04Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- ShikiBlock async RSC renders dual-theme Shiki HTML (github-light/dark) via `codeToHtml` — no client bundle cost
- globals.css now has Shiki dark mode CSS that activates when `html.dark` is set by next-themes
- linkify.tsx utility wraps URLs in anchor tags and is exported for reuse in Q&A (Plan 04)
- SnippetHero renders the latest snippet full-width with language badge, relative timestamp, line numbers for code, CopyButton with 2s checkmark swap (pre-existing behavior confirmed)
- SnippetCard shows collapsed history items with `line-clamp-3` truncation; `expanded` prop toggles full ShikiBlock view
- detect-language.ts client-safe module with regex heuristics for 13 languages and `SUPPORTED_LANGUAGES` array
- renderHighlight Server Action enables live Shiki preview without importing shiki in client bundle
- pushSnippetAction Server Action calls AppSync PUSH_SNIPPET mutation via appsyncClient
- HostInput ('use client') has auto-resize textarea, language chip with override dropdown, 300ms debounced preview, Push Snippet button + Cmd+Enter shortcut, optimistic clear on push
- ClipboardPanel ('use client') renders HostInput (if host), empty state with animate-pulse, HeroCard for latest snippet, lazy-loaded HistoryCard list with IntersectionObserver sentinel

## Task Commits

1. **Task 1: Shiki dual-theme RSC block and snippet display components** - `994bab7` (feat)
2. **Task 2: Host input composer with live preview and clipboard panel layout** - `637251e` (feat)

## Files Created/Modified

- `packages/frontend/src/components/session/shiki-block.tsx` - Async RSC with codeToHtml dual-theme + text/linkify fallback
- `packages/frontend/src/components/session/snippet-hero.tsx` - Full-width hero card accepting optional highlightedHtml
- `packages/frontend/src/components/session/snippet-card.tsx` - Compact history card with line-clamp-3 truncation
- `packages/frontend/src/lib/linkify.tsx` - URL auto-linkify utility (shared for clipboard + Q&A)
- `packages/frontend/src/lib/detect-language.ts` - Client-safe language detection + SUPPORTED_LANGUAGES
- `packages/frontend/src/actions/snippet.ts` - renderHighlight + pushSnippetAction Server Actions
- `packages/frontend/src/components/session/host-input.tsx` - Client composer with live preview and push
- `packages/frontend/src/components/session/clipboard-panel.tsx` - Replaced stub with full Client Component
- `packages/frontend/src/app/globals.css` - Shiki dark mode CSS variables + line number gutter
- `packages/frontend/src/app/[locale]/session/[slug]/host/page.tsx` - Updated ClipboardPanel props

## Decisions Made

- ClipboardPanel is a Client Component (needs useState for snippet state and IntersectionObserver). SnippetHero/SnippetCard cannot be async RSC children of a Client Component, so they are implemented as inline client sub-components (HeroCard, HistoryCard) that call renderHighlight Server Action on demand.
- SnippetCard shows raw `line-clamp-3` text in collapsed state (no Server Action) for performance — only full ShikiBlock render on expand.
- linkify.tsx placed in `lib/` for reuse; the plan explicitly notes it will be used in Q&A.
- host/page.tsx stub props (`snippets={[]}`, `hostSecretHash=""`) allow TypeScript to pass; Plan 04 will replace with SSR-loaded session data.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SnippetHero/SnippetCard cannot be async RSC inside Client Component**
- **Found during:** Task 2
- **Issue:** ClipboardPanel is a Client Component but plan expected to use async SnippetHero/SnippetCard (Server Components). Client Components cannot render async RSC children directly.
- **Fix:** Implemented HeroCard and HistoryCard as synchronous inline sub-components within clipboard-panel.tsx that call `renderHighlight` Server Action for highlighting. SnippetHero and SnippetCard RSC files kept intact for potential direct server-parent usage.
- **Files modified:** `clipboard-panel.tsx`, `snippet-hero.tsx` (added `highlightedHtml` prop)

**2. [Rule 3 - Blocking] TypeScript errors in host/page.tsx after ClipboardPanel prop changes**
- **Found during:** Task 2 verification
- **Issue:** `ClipboardPanel isHost` was missing required `sessionSlug` and `snippets` props after interface update
- **Fix:** Updated host/page.tsx to pass `sessionSlug={slug}`, `snippets={[]}`, `hostSecretHash=""` as stubs with TODO comment for Plan 04
- **Files modified:** `packages/frontend/src/app/[locale]/session/[slug]/host/page.tsx`

## Next Phase Readiness

- ClipboardPanel accepts `snippets: Snippet[]` — Plan 03 SubscriptionProvider will pass live snippets via this prop
- renderHighlight Server Action is ready for use by SubscriptionProvider when new snippets arrive via WebSocket
- pushSnippetAction is ready for HostInput — will work as soon as AppSync is deployed
- linkify.tsx is ready for QAPanel integration in Plan 04

## Self-Check: PASSED

All 8 key files confirmed present. Both task commits (994bab7, 637251e) verified in git history.

---
*Phase: 03-real-time-core*
*Completed: 2026-03-14*
