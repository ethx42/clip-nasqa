---
phase: 16-optimistic-snippet-push-and-client-shiki
plan: "02"
subsystem: clipboard
tags: [shiki, syntax-highlighting, client-side, language-detection, ux]
dependency_graph:
  requires: [16-01]
  provides:
    [useShikiHighlight, client-shiki-highlighting, language-dropdown, stricter-detect-language]
  affects: [host-input, snippet-card, detect-language, snippet-actions]
tech_stack:
  added: []
  patterns:
    [singleton-highlighter, lazy-dynamic-import, client-side-shiki, multi-signal-language-detection]
key_files:
  created:
    - packages/frontend/src/hooks/use-shiki-highlight.ts
  modified:
    - packages/frontend/src/lib/detect-language.ts
    - packages/frontend/src/components/session/host-input.tsx
    - packages/frontend/src/components/session/snippet-card.tsx
    - packages/frontend/src/actions/snippet.ts
    - packages/frontend/messages/en.json
    - packages/frontend/messages/es.json
    - packages/frontend/messages/pt.json
decisions:
  - "useShikiHighlight uses module-level singleton promise (_highlighterPromise) shared across all hook instances — highlighter is created once on first call, language grammars loaded lazily per-language"
  - "All Shiki imports are dynamic (inside async functions) — no top-level static import prevents 695kB gzip bundle bloat"
  - "SnippetCard passes empty string to useShikiHighlight when not expanded, avoiding unnecessary grammar loads for collapsed compact cards"
  - "shiki-block.tsx pre-existing static Shiki server component left untouched — it is unused dead code, deferred to cleanup"
metrics:
  duration: "8 min"
  completed: 2026-03-18
  tasks_completed: 2
  files_changed: 7
---

# Phase 16 Plan 02: Client-Side Shiki Highlighting Summary

Client-side Shiki singleton hook with lazy dynamic imports, stricter multi-signal language detection that no longer misidentifies URLs as YAML or casual text as JavaScript, language dropdown with auto-detect in HostInput, and SnippetCard migrated entirely off the renderHighlight Server Action.

## Tasks Completed

| #   | Task                                                                | Commit  | Key Files                                                                       |
| --- | ------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------- |
| 1   | Client Shiki hook + stricter language detection + language dropdown | 3567b3d | use-shiki-highlight.ts (new), detect-language.ts, host-input.tsx, en/es/pt.json |
| 2   | SnippetCard client Shiki migration + renderHighlight removal        | b81e9e5 | snippet-card.tsx, snippet.ts                                                    |

## What Was Built

### `use-shiki-highlight.ts` (new hook)

Singleton `HighlighterCore` shared across all hook instances via module-level `_highlighterPromise`. All Shiki imports (`shiki/core`, `shiki/engine/javascript`, themes, languages) are dynamic — never at module top-level.

- `getHighlighter()`: creates highlighter on first call, caches the promise so subsequent calls reuse the same instance
- `LANG_LOADERS`: record mapping 13 languages to lazy `() => import("shiki/langs/{lang}.mjs")` functions
- `useShikiHighlight(code, lang, resolvedTheme)`: `useEffect` with cancellation flag, lazy grammar loading via `getLoadedLanguages()` check, returns `string | null` (null while loading or for "text" lang)

### `detect-language.ts` (rewritten)

Multi-signal confidence heuristics replacing the old single-signal approach:

- URL-first check (`/^https?:\/\//`) before YAML rule — prevents `https://example.com` misidentified as YAML
- TypeScript requires ALL THREE signals: (keyword) AND (`{}`) AND (`;` or `=>` or `: `)
- JavaScript requires 2-of-3 signals: curly braces, statement semicolons, function/arrow/var keywords
- YAML rule now also excludes `;` to avoid false positives
- Casual text like `hey what's up; let me know()` correctly returns "text"

### `host-input.tsx` (rewritten)

- Replaced `scheduleHighlight` + `debounceRef` + `renderHighlight` Server Action call with `useShikiHighlight` hook
- `manualLang` state (`"auto"` default) + computed `activeLang` (`manualLang === "auto" ? detectLanguage(value) : manualLang`)
- Language `<select>` dropdown above textarea (visible when text is present): "Auto-detect (detected-lang)" + all 13 supported languages
- Eye/EyeOff preview toggle button: switches between textarea+backdrop editor and syntax-highlighted preview with line number gutter and copy button
- Cursor position preserved across edit/preview toggle via `cursorPos` ref and `setSelectionRange` on return
- `manualLang` resets to `"auto"` and `showPreview` resets to `false` after push

### `snippet-card.tsx` (migrated)

- Removed `renderHighlight` import and `html` useState
- Added `useShikiHighlight` and `useTheme`
- Hook called with empty string when card is collapsed (compact variant, not expanded) — avoids loading grammars for off-screen content
- `shikiHtml` used directly in JSX; existing `<pre>` fallback renders while Shiki loads

### `snippet.ts` (simplified)

- Deleted `renderHighlight` export function entirely
- Removed `import { codeToHtml } from "shiki"` and `import type { BundledLanguage } from "shiki"`
- Zero remaining `renderHighlight` imports across codebase

## Decisions Made

1. **Singleton highlighter pattern** — `_highlighterPromise` at module level (not React state) ensures the highlighter is created exactly once across all hook instances, even if multiple SnippetCards mount simultaneously.

2. **Lazy per-language loading** — grammar files loaded on demand via `getLoadedLanguages()` check. Once loaded, subsequent renders reuse the cached grammar without re-loading.

3. **SnippetCard empty-string optimization** — passing `""` to the hook when a compact card is collapsed means the `useEffect` exits immediately (empty code check) without triggering a highlighter load. Grammar is only loaded when the card is expanded or in hero position.

4. **shiki-block.tsx deferred** — pre-existing unused server component with static `from "shiki"` import. Left untouched as it has no callers and is out of scope; recorded as deferred item.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - ESLint Error] Added eslint-disable comment for synchronous setState in useEffect**

- **Found during:** Task 1 — pre-commit hook failed with `react-hooks/set-state-in-effect` error on `setHtml(null)` in the early-return path
- **Fix:** Added `// eslint-disable-next-line react-hooks/set-state-in-effect -- resetting highlight when input becomes empty or lang is plain text` comment, matching the project's established pattern for legitimate setState-in-effect cases
- **Files modified:** packages/frontend/src/hooks/use-shiki-highlight.ts
- **Commit:** 3567b3d

**2. [Rule 2 - Missing i18n keys] Added 4 new session namespace translation keys**

- **Found during:** Task 1 — host-input.tsx used `t("selectLanguage")`, `t("autoDetect")`, `t("editMode")`, `t("previewMode")` which did not exist in the `session` namespace
- **Fix:** Added all 4 keys to en.json, es.json, pt.json
- **Files modified:** packages/frontend/messages/en.json, es.json, pt.json
- **Commit:** 3567b3d

### Deferred Items

- `packages/frontend/src/components/session/shiki-block.tsx` has static `from "shiki"` imports. This is pre-existing dead code (zero callers) not in scope for this plan. Logged to `deferred-items.md`.

## Self-Check: PASSED
