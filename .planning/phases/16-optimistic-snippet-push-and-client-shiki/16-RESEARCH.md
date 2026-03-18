# Phase 16: Optimistic Snippet Push and Client Shiki - Research

**Researched:** 2026-03-18
**Domain:** React optimistic UI with useReducer, Shiki 4.x client-side rendering
**Confidence:** HIGH

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Optimistic push appearance**

- No visual distinction between optimistic and confirmed snippets — identical from the moment of push
- Silent confirmation — no animation, checkmark, or visual signal when server confirms
- Textarea clears immediately on push, focus stays on textarea for rapid next-snippet workflow
- Multiple rapid pushes stack independently — each gets its own optimistic entry, all confirm independently
- Optimistic snippet gets full metadata immediately (title, language badge, line count)
- Optimistic snippet is fully interactive before confirmation (deletable, editable)
- If host edits an optimistic snippet before confirmation, the server push is deferred until editing is finished
- Keyboard shortcut: Cmd/Ctrl+Enter to push

**Snippet numbering**

- Persistent creation-order numbering — snippet #1 is always #1 regardless of new pushes
- Display order is newest-first (highest number at top, numbers descend going down)
- Optimistic snippet gets its number immediately (next in sequence); if it fails, the number is released
- Both host and participant views show the same persistent numbers

**New-content indicator**

- When host has scrolled away from the top, a small pill badge ("1 new") appears at the top edge of the clipboard panel
- Tapping the pill scrolls to top
- Current indicator is too bulky and misaligned — needs to be redesigned as a compact pill

**Failure and rollback**

- Red border + retry button on the failed snippet card; snippet stays in the clipboard panel
- Failed snippets persist until explicitly retried or dismissed — no auto-timeout
- One silent automatic retry before showing the error state (handles transient network blips)
- If the host has started typing a new snippet, don't overwrite the textarea — the failed snippet stays in the panel with retry available
- On successful retry, snippet keeps its original position and number (red border disappears)
- Dismiss = gone permanently, no undo
- Cancel the pending server write if the host deletes an optimistic snippet before confirmation
- Failed snippets are host-only — participants never see unconfirmed or failed content

**Live syntax preview**

- Edit/preview toggle sharing the same space (not side-by-side, not below)
- Eye icon button to toggle between edit mode (textarea) and preview mode (highlighted code)
- No keyboard shortcut for the toggle
- Preview updates on every keystroke — true real-time, no debounce
- Cursor position restored when toggling back from preview to edit
- Line numbers shown in the preview gutter
- Copy-to-clipboard button on the preview (copies raw code, not HTML)

**Shiki theming and scope**

- Client Shiki highlighting everywhere: input preview, clipboard panel cards, and participant view
- Shiki theme matches app theme — light theme in light mode, dark theme in dark mode
- Replaces current server-side rendering with client-side Shiki across all views

**Language selection**

- Dropdown control above the textarea for language selection
- "Auto-detect" as the default option — Shiki guesses the language if the host doesn't pick one
- Host can override by selecting a specific language; preview re-highlights immediately
- Curated list of ~15-20 popular languages (JS, TS, Python, Go, Rust, Java, C, C++, etc.)
- Always resets to Auto-detect between pushes — no persistence of last choice

### Claude's Discretion

- Push button debounce/cooldown behavior
- Snippet truncation strategy in the clipboard panel (truncated with expand vs full)
- Exact curated language list
- Shiki theme pair selection (specific light/dark themes)
- Shiki bundle loading strategy (lazy, preload, etc.)

### Deferred Ideas (OUT OF SCOPE)

- **Linkable/shareable snippet numbers with anchor jumping** — snippets should have URL anchors based on their number so the host can share a link and participants jump to that specific snippet. This is a new capability beyond optimistic push scope.
  </user_constraints>

<phase_requirements>

## Phase Requirements

| ID       | Description                                                                                                                                                             | Research Support                                                                                                                                                          |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OPT-01   | Host snippet push appears instantly in clipboard via optimistic dispatch before server confirmation                                                                     | Reducer already has `ADD_SNIPPET_OPTIMISTIC` and `SNIPPET_ADDED` with `optimisticId` replacement — extend `HostInput` to call dispatch before calling `pushSnippetAction` |
| OPT-02   | Snippet reducer deduplicates optimistic entries using content-fingerprint matching (mirrors question pattern)                                                           | `SNIPPET_ADDED` already checks `optimisticId` for replacement; need to ensure dedup also fires when subscription delivers the real snippet                                |
| OPT-03   | Failed snippet push rolls back optimistic entry and restores input content                                                                                              | New "failed" state needed on optimistic snippet — failed snippets stay in panel with red border + retry; `REMOVE_OPTIMISTIC` already exists for dismiss path              |
| SHIKI-01 | Host input syntax preview renders client-side using Shiki core with JavaScript regex engine                                                                             | `shiki/core` + `createJavaScriptRegexEngine()` + dynamic language imports — replaces `renderHighlight` Server Action in `HostInput`                                       |
| SHIKI-02 | Language grammars load lazily via dynamic import (only languages in SUPPORTED_LANGUAGES)                                                                                | Each language as `() => import("shiki/langs/typescript.mjs")` — loaded on demand inside `createHighlighterCore`                                                           |
| SHIKI-03 | Shiki bundle contribution stays under 15kB gzipped (fine-grained imports, no full bundle)                                                                               | `shiki/core` + `shiki/engine/javascript` + per-language imports proven pattern; avoid `import "shiki"` top-level                                                          |
| SHIKI-04 | `renderHighlight` Server Action removed after client-side migration                                                                                                     | Remove from `snippet.ts`; update `HostInput` and `SnippetCard` to use new client hook                                                                                     |
| SHIKI-05 | Language auto-detection rewritten with stricter heuristics — plain text defaults to "text", URLs not misidentified as YAML, casual text not misidentified as JavaScript | Rewrite `detectLanguage` in `detect-language.ts` with multi-signal confidence requirement                                                                                 |
| SHIKI-06 | Host can manually override detected language via a dropdown selector when auto-detection is wrong                                                                       | Add dropdown (Select/Combobox) to `HostInput` above the textarea — value "auto" = use `detectLanguage`, value = specific = skip detection                                 |
| SHIKI-07 | Host input clears cleanly after push — no residual "selected text" visual artifact from the transparent textarea/backdrop overlay                                       | Fix the `text-transparent` class + selection highlight artifact; cursor-color and selection-color CSS required                                                            |

</phase_requirements>

---

## Summary

Phase 16 has two independent but co-deployed problems: (1) optimistic snippet push with failure state management, and (2) moving Shiki from server-side to client-side. Both problems have solid foundations already in the codebase.

The reducer (`use-session-state.ts`) already has the complete plumbing for optimistic snippets: `ADD_SNIPPET_OPTIMISTIC`, `SNIPPET_ADDED` with `optimisticId` replacement, and `REMOVE_OPTIMISTIC`. The **missing piece** is wiring the optimistic dispatch into `HostInput`, threading `dispatch` down through `ClipboardPanel` → `HostInput`, and building the "failed state" variant for snippet cards. The question optimistic pattern in `use-session-mutations.ts` is the exact blueprint to follow.

For Shiki, the installed version is **4.0.2** which has `shiki/core`, `shiki/engine/javascript`, and per-language files in `shiki/dist/langs/`. The STATE.md already contains a critical verified decision: use `import("shiki/core")` with `createJavaScriptRegexEngine()` inside an async callback — static import adds 695kB gzip. A singleton highlighter pattern with lazy language loading is the standard approach. The `renderHighlight` Server Action in `HostInput` and `SnippetCard` both call back to the server unnecessarily — replacing them with a client-side `useShikiHighlight` hook eliminates that round-trip entirely.

The persistent snippet numbering requirement is a derived computation: `Snippet` has no `snippetNumber` field. Numbers must be derived from `createdAt`-sorted position in the full snippets array — snippet #1 is the one with the lowest `createdAt`. The display order is newest-first (highest number at top), so numbering descends visually. Optimistic snippets get their number immediately from `snippets.length + 1` at push time.

**Primary recommendation:** Implement the optimistic push hook that mirrors the question pattern, add a `useShikiHighlight` client hook with singleton highlighter and lazy language loading, and thread `dispatch` into `HostInput` so it can fire optimistically before the Server Action resolves.

---

## Standard Stack

### Core

| Library              | Version                  | Purpose                                   | Why Standard                                                                        |
| -------------------- | ------------------------ | ----------------------------------------- | ----------------------------------------------------------------------------------- |
| shiki                | 4.0.2 (installed)        | Client-side syntax highlighting           | Already in project; v4 has fine-grained imports, JS regex engine eliminates WASM    |
| React useReducer     | React 19.2.3 (installed) | State management for optimistic snippets  | Already powering session state; `sessionReducer` already handles optimistic pattern |
| next-themes useTheme | 0.4.6 (installed)        | Detect current theme for Shiki dual-theme | Already used in `theme-toggle.tsx`                                                  |

### Supporting

| Library                 | Version | Purpose                                       | When to Use                                              |
| ----------------------- | ------- | --------------------------------------------- | -------------------------------------------------------- |
| shiki/core              | 4.0.2   | Fine-grained Shiki import without full bundle | Required for SHIKI-03 — avoid `import "shiki"` top-level |
| shiki/engine/javascript | 4.0.2   | JS-based regex engine (no WASM)               | Required for client bundle — WASM adds 400kB+            |
| shiki/langs/{lang}      | 4.0.2   | Individual language grammars                  | One per supported language, dynamically imported         |
| shiki/themes/{theme}    | 4.0.2   | Individual theme files                        | `github-light` and `github-dark` verified to exist       |

### Alternatives Considered

| Instead of                           | Could Use                            | Tradeoff                                                                                 |
| ------------------------------------ | ------------------------------------ | ---------------------------------------------------------------------------------------- |
| `shiki/core` + JS engine             | `shiki/bundle/web`                   | bundle/web pre-bundles everything — violates SHIKI-03 (not lazy)                         |
| `createHighlighterCore` singleton    | New highlighter per highlight call   | Per-call creates new highlighter — massive overhead, defeats purpose                     |
| Client-side `useShikiHighlight` hook | Keep `renderHighlight` Server Action | Server Action adds network round-trip on every keystroke — violates SHIKI-01 requirement |

**Installation:** No new packages needed. `shiki@4.0.2` is already installed.

---

## Architecture Patterns

### Recommended File Structure

```
packages/frontend/src/
├── hooks/
│   ├── use-session-state.ts          # MODIFY: new actions for failed snippet state
│   ├── use-host-snippet-push.ts      # NEW: optimistic push hook (mirrors question pattern)
│   └── use-shiki-highlight.ts        # NEW: singleton client Shiki hook
├── lib/
│   └── detect-language.ts            # MODIFY: stricter heuristics (SHIKI-05)
├── components/session/
│   ├── host-input.tsx                # MODIFY: use hook, remove renderHighlight calls
│   ├── snippet-card.tsx              # MODIFY: use useShikiHighlight, failed state UI
│   ├── clipboard-panel.tsx           # MODIFY: thread dispatch + push hook, pill redesign
│   └── new-content-banner.tsx        # MODIFY: compact pill style
└── actions/
    └── snippet.ts                    # MODIFY: remove renderHighlight export (SHIKI-04)
```

### Pattern 1: Optimistic Snippet Push (mirrors question pattern)

**What:** Dispatch `ADD_SNIPPET_OPTIMISTIC` immediately before calling `pushSnippetAction`. When the server confirms, `SNIPPET_ADDED` with `optimisticId` replaces the placeholder. On failure, transition the optimistic snippet to "failed" state.

**When to use:** Any host push action where instant feedback is needed.

**Key difference from question pattern:** Snippets need a "failed" variant that stays visible in the panel (not removed like optimistic questions on failure). Failed snippets need retry + dismiss affordances.

```typescript
// Source: pattern from use-session-mutations.ts (lines 228-270)
// New hook: use-host-snippet-push.ts
const tempId = `_opt_${Date.now()}`;
const optimisticSnippet: OptimisticSnippet = {
  id: tempId,
  sessionCode,
  type,
  content,
  language: lang !== "text" ? lang : undefined,
  createdAt: Math.floor(Date.now() / 1000),
  TTL: 0,
  snippetNumber: nextSnippetNumber, // derived from snippets.length + 1
  status: "pending", // "pending" | "failed"
};

dispatch({ type: "ADD_SNIPPET_OPTIMISTIC", payload: optimisticSnippet });

// Clear input immediately
setValue("");

const result = await safeAction(pushSnippetAction(...), tErrors("networkError"));

if (!result.success) {
  // First silent retry
  const retry = await safeAction(pushSnippetAction(...), tErrors("networkError"));
  if (!retry.success) {
    // Transition to failed state — stays in panel
    dispatch({ type: "SNIPPET_PUSH_FAILED", payload: { id: tempId } });
  }
}
```

### Pattern 2: Client Shiki Singleton Highlighter

**What:** Create a single `HighlighterCore` instance that persists across renders. Languages load lazily on first use. The singleton is cached in module scope outside the hook.

**When to use:** Anywhere syntax highlighting is needed client-side (`HostInput` preview, `SnippetCard`).

**Critical:** Must be inside `async` callback — never at module top level.

```typescript
// Source: STATE.md verified decision + Shiki 4.x core API
// New hook: use-shiki-highlight.ts
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

// Module-level cache — one instance shared across all components
let highlighterPromise: Promise<HighlighterCore> | null = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      engine: createJavaScriptRegexEngine(),
      themes: [
        () => import("shiki/themes/github-light.mjs"),
        () => import("shiki/themes/github-dark.mjs"),
      ],
      langs: [], // Start empty, load lazily
    });
  }
  return highlighterPromise;
}

// Language lazy-load on first use
const LANG_LOADERS: Record<string, () => Promise<unknown>> = {
  typescript: () => import("shiki/langs/typescript.mjs"),
  javascript: () => import("shiki/langs/javascript.mjs"),
  python: () => import("shiki/langs/python.mjs"),
  go: () => import("shiki/langs/go.mjs"),
  // ... rest of SUPPORTED_LANGUAGES
};

export function useShikiHighlight(code: string, lang: string, theme: "light" | "dark") {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!code.trim() || lang === "text") {
      setHtml(null);
      return;
    }

    let cancelled = false;
    async function highlight() {
      const hl = await getHighlighter();

      // Load language if not yet loaded
      const loadedLangs = hl.getLoadedLanguages();
      if (!loadedLangs.includes(lang) && LANG_LOADERS[lang]) {
        await hl.loadLanguage(LANG_LOADERS[lang] as LanguageInput);
      }

      if (cancelled) return;

      const result = hl.codeToHtml(code, {
        lang,
        theme: theme === "dark" ? "github-dark" : "github-light",
      });
      setHtml(result);
    }

    void highlight();
    return () => {
      cancelled = true;
    };
  }, [code, lang, theme]);

  return html;
}
```

### Pattern 3: Snippet Number Derivation

**What:** Persistent creation-order numbers are derived from the sorted snippet array. No backend change needed.

**Key insight:** `Snippet.createdAt` is Unix epoch seconds (from DynamoDB). Sort all snippets by `createdAt` ascending to get #1 = oldest. Display newest-first (highest number at top). Optimistic snippet gets `snippets.length + 1` as its number at push time.

```typescript
// Derive stable numbers from createdAt order
function getSnippetNumber(snippet: Snippet, allSnippets: Snippet[]): number {
  const sorted = [...allSnippets].sort((a, b) => a.createdAt - b.createdAt);
  const index = sorted.findIndex((s) => s.id === snippet.id);
  return index + 1; // 1-based
}
```

**Warning:** When an optimistic snippet's `tempId` is replaced by the real ID after server confirmation, the number stays stable because the `createdAt` value is set at push time (same second).

### Pattern 4: Failed Snippet State

**What:** The reducer needs a way to mark an optimistic snippet as "failed" rather than removing it. This requires extending the `SessionAction` type and the `SessionState` to track failure status.

**Approach:** Add `failedSnippetIds: Set<string>` to `SessionState` rather than adding a field to the `Snippet` type (which is defined in `@nasqa/core` and used across packages). A separate set of failed IDs in the reducer is cleaner than mutating the core type.

```typescript
// In use-session-state.ts
type SessionAction =
  | ... existing actions ...
  | { type: "SNIPPET_PUSH_FAILED"; payload: { id: string } }
  | { type: "SNIPPET_RETRY"; payload: { id: string } };

interface SessionState {
  snippets: Snippet[];
  questions: Question[];
  replies: Reply[];
  bannedFingerprints: Set<string>;
  failedSnippetIds: Set<string>; // NEW: tracks optimistic snippets that failed
}
```

### Pattern 5: Edit/Preview Toggle in HostInput

**What:** Toggle between the current textarea (edit mode) and a Shiki-highlighted preview (preview mode) using an eye icon button. Both share the same DOM space.

**Implementation:** Add `const [showPreview, setShowPreview] = useState(false)` to `HostInput`. When `showPreview` is true, render the Shiki output instead of the textarea. Use `textareaRef.current.selectionStart` before toggling to restore cursor position on return.

**No debounce:** Per locked decision, preview updates on every keystroke in preview mode. The `useShikiHighlight` hook handles this via `useEffect` on `code` change — no debounce in the hook itself.

### Pattern 6: Language Dropdown

**What:** Replace the current language badge (read-only indicator) with a `<select>` or custom combobox above the textarea. Default: `"auto"` = call `detectLanguage()`. Any other value: skip detection, use selected language directly.

**State model:**

```typescript
const [manualLang, setManualLang] = useState<string>("auto");
const activeLang = manualLang === "auto" ? detectLanguage(value) : manualLang;
```

**Reset on push:** After successful push, set `manualLang` back to `"auto"` — per locked decision.

### Anti-Patterns to Avoid

- **Static top-level Shiki import:** `import { codeToHtml } from "shiki"` at module top level pulls 695kB gzip into the initial bundle. Must use `import("shiki/core")` inside an async callback.
- **New highlighter per call:** Creating a new `HighlighterCore` on every render or on every keystroke defeats lazy loading and causes visible lag. Use the module-level singleton.
- **Using WASM engine client-side:** `createOnigurumaEngine()` requires fetching a WASM binary — adds ~400kB. Use `createJavaScriptRegexEngine()` exclusively for client rendering.
- **Mutating the `Snippet` core type for failed state:** `@nasqa/core` types are shared. Track failed state in the reducer's `SessionState` as a separate `Set<string>`, not as a field on `Snippet`.
- **Re-computing snippet numbers on every render without memoization:** Sort + findIndex on every render is O(n²). Compute once in `ClipboardPanel` via `useMemo` keyed on `snippets`.
- **Calling `renderHighlight` Server Action in `SnippetCard`:** Already happening — the effect in `SnippetCard` calls `renderHighlight` on mount. This is the exact pattern being replaced by `useShikiHighlight`.

---

## Don't Hand-Roll

| Problem                              | Don't Build                       | Use Instead                                                                     | Why                                                                                            |
| ------------------------------------ | --------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| WASM-based regex in browser          | Custom regex engine               | `createJavaScriptRegexEngine()` from `shiki/engine/javascript`                  | Shiki ships it; avoids WASM binary fetch                                                       |
| Singleton pattern for async resource | Custom singleton cache with locks | Module-level `let highlighterPromise` — simple Promise cache                    | React renders are concurrent; a plain module-level Promise is safe and correct                 |
| Language lazy loading                | Custom import maps or manifest    | Shiki per-language imports (`shiki/langs/typescript.mjs`) + `hl.loadLanguage()` | Already works with Next.js dynamic imports                                                     |
| Content-fingerprint deduplication    | Custom hash function              | `_opt_${Date.now()}` + matching on `(sessionCode, fingerprint, text)` tuples    | Existing `SNIPPET_ADDED` with `optimisticId` is the correct approach — see reducer lines 59-75 |

**Key insight:** The Shiki API in v4 is specifically designed for fine-grained tree-shakeable imports. Using `shiki/core` + individual language/theme imports is the documented pattern for keeping bundle size minimal in browser environments.

---

## Common Pitfalls

### Pitfall 1: Duplicate Snippet on Subscription Arrival

**What goes wrong:** Host pushes, optimistic snippet appears (`_opt_123`). Server confirms. AppSync subscription fires `SNIPPET_ADDED` with the real snippet. Both the optimistic AND the real snippet appear.
**Why it happens:** `SNIPPET_ADDED` reducer checks for `optimisticId` but the host's `HostInput` must pass the `optimisticId` up so the subscription handler can include it.
**How to avoid:** When dispatching `SNIPPET_ADDED` from the subscription handler in `use-session-updates.ts`, do NOT pass an `optimisticId` — the `SNIPPET_ADDED` handler already deduplicates by real `id`. But the optimistic snippet has a different ID (`_opt_123`). The dedup in the current reducer (`SNIPPET_ADDED` case line 59-76) handles replacement only if `optimisticId` is passed. If no `optimisticId` is passed, the real snippet is just prepended — and the `_opt_123` entry remains until cleaned up.
**Solution:** When the push succeeds, dispatch `SNIPPET_ADDED` with `optimisticId: tempId` explicitly from the push hook (not waiting for subscription). Or: have the subscription handler do a content-fingerprint match to find and replace matching optimistic entries. The content-fingerprint approach (matching on `sessionCode + content + language + type`) is more robust — mirrors the question dedup pattern in `QUESTION_ADDED` (lines 91-114).
**Warning signs:** Two identical snippets appearing in the panel after a push.

### Pitfall 2: Shiki Module-Level Import

**What goes wrong:** Bundler includes the entire Shiki tree in the initial JS bundle, adding 400-700kB to first load.
**Why it happens:** `import { createHighlighterCore } from "shiki/core"` at the top of a `"use client"` file causes Next.js to include it in the client bundle at build time, not lazily.
**How to avoid:** Wrap all Shiki imports inside `async function` bodies that are only called at runtime. The module-level `highlighterPromise` is fine — it's a variable assignment, not an import. The imports inside `() => import("shiki/langs/typescript.mjs")` are dynamic and will be code-split.
**Warning signs:** Run `next build` and check bundle analyzer — `shiki` should appear only in lazy chunks, not in the main bundle.

### Pitfall 3: Stale Language Loader in HighlighterCore

**What goes wrong:** Host types code, Shiki re-highlights but shows wrong language because the language wasn't loaded yet.
**Why it happens:** `hl.codeToHtml()` called with a language that hasn't been loaded yet throws or silently falls back to plain text.
**How to avoid:** Always call `hl.loadLanguage()` before `hl.codeToHtml()` if the language isn't in `hl.getLoadedLanguages()`. This is a no-op if already loaded, so it's safe to call every time.
**Warning signs:** Syntax highlighting showing no colors for a newly-selected language on first use.

### Pitfall 4: Snippet Number Instability

**What goes wrong:** An optimistic snippet is assigned number 5. Server confirms and the real snippet has a `createdAt` 2 seconds later (due to server latency). Sorting by `createdAt` puts the confirmed snippet in a different position, so its number changes from 5 to 4 or 6.
**Why it happens:** The optimistic snippet uses `Math.floor(Date.now() / 1000)` as `createdAt`, but the server may assign a slightly different timestamp.
**How to avoid:** When computing snippet numbers, replace the optimistic snippet's position by matching its `tempId` to the confirmed snippet's real ID. Once confirmed, use the server's `createdAt` for stable sorting. In practice, the difference is usually 0-1 seconds, which rarely changes order. Accept that a number might shift by 1 after confirmation — this is correct and expected (server is the source of truth for ordering).
**Warning signs:** Snippet number visually jumping by 1 right after confirmation.

### Pitfall 5: Failed Snippet Blocking New Optimistic Pushes

**What goes wrong:** Host pushes snippet A (fails). Pushes snippet B. Snippet B gets number 1 because snippet A is in "failed" state and shouldn't count in the sequence.
**Why it happens:** The `nextSnippetNumber` computation includes failed optimistic snippets if not handled.
**How to avoid:** Include failed optimistic snippets in the number sequence — they hold their number until dismissed. If dismissed, numbers don't reorder (confirmed snippets keep their numbers). Only truly released numbers are from snippets that never confirmed AND were dismissed.

### Pitfall 6: `text-transparent` Selection Artifact (SHIKI-07)

**What goes wrong:** When the host clears the textarea after pushing, the browser sometimes shows a flash of selected/highlighted text before the transparent class removes correctly.
**Why it happens:** The `text-transparent` class on the textarea makes text invisible, but browser selection highlight is visible when content is programmatically cleared and focus is maintained.
**How to avoid:** After clearing `value`, also blur and re-focus the textarea to reset selection state. Or: deselect by setting `selectionStart = selectionEnd = 0` before calling `.focus()`.

```typescript
// After setValue(""):
if (textareaRef.current) {
  textareaRef.current.value = "";
  textareaRef.current.selectionStart = 0;
  textareaRef.current.selectionEnd = 0;
  textareaRef.current.focus();
}
```

---

## Code Examples

Verified patterns from official sources and codebase:

### Client Shiki Highlighter Singleton

```typescript
// Source: Shiki 4.x dist/core.d.mts API + STATE.md verified decision
import { createHighlighterCore, type HighlighterCore, type LanguageInput } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

// Module-scope singleton — Promise created once, shared across all hook instances
let _highlighterPromise: Promise<HighlighterCore> | null = null;

function getHighlighter(): Promise<HighlighterCore> {
  if (!_highlighterPromise) {
    _highlighterPromise = createHighlighterCore({
      engine: createJavaScriptRegexEngine(),
      themes: [
        () => import("shiki/themes/github-light.mjs"),
        () => import("shiki/themes/github-dark.mjs"),
      ],
      langs: [],
    });
  }
  return _highlighterPromise;
}

const LANG_LOADERS: Partial<Record<string, () => Promise<unknown>>> = {
  typescript: () => import("shiki/langs/typescript.mjs"),
  javascript: () => import("shiki/langs/javascript.mjs"),
  python: () => import("shiki/langs/python.mjs"),
  go: () => import("shiki/langs/go.mjs"),
  java: () => import("shiki/langs/java.mjs"),
  rust: () => import("shiki/langs/rust.mjs"),
  cpp: () => import("shiki/langs/cpp.mjs"),
  html: () => import("shiki/langs/html.mjs"),
  css: () => import("shiki/langs/css.mjs"),
  sql: () => import("shiki/langs/sql.mjs"),
  json: () => import("shiki/langs/json.mjs"),
  yaml: () => import("shiki/langs/yaml.mjs"),
  bash: () => import("shiki/langs/bash.mjs"),
};

export function useShikiHighlight(code: string, lang: string, resolvedTheme: "light" | "dark") {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!code.trim() || lang === "text") {
      setHtml(null);
      return;
    }
    let cancelled = false;

    async function run() {
      const hl = await getHighlighter();
      const loaded = hl.getLoadedLanguages();
      if (!loaded.includes(lang) && LANG_LOADERS[lang]) {
        await hl.loadLanguage(LANG_LOADERS[lang] as LanguageInput);
      }
      if (cancelled) return;
      const out = hl.codeToHtml(code, {
        lang,
        theme: resolvedTheme === "dark" ? "github-dark" : "github-light",
      });
      setHtml(out);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [code, lang, resolvedTheme]);

  return html;
}
```

### Optimistic Push Hook

```typescript
// Source: mirrors use-session-mutations.ts lines 228-270, use-host-mutations.ts pattern
// New file: use-host-snippet-push.ts
export function useHostSnippetPush({
  sessionCode,
  hostSecretHash,
  dispatch,
  snippetsLength, // to compute next number
}: UseHostSnippetPushParams) {
  const tErrors = useTranslations("actionErrors");

  const handlePush = useCallback(
    async (content: string, lang: string) => {
      if (!content.trim() || !hostSecretHash) return false;

      const tempId = `_opt_${Date.now()}`;
      const type = lang !== "text" ? "code" : "text";
      const optimisticSnippet: Snippet = {
        id: tempId,
        sessionCode,
        type,
        content,
        language: lang !== "text" ? lang : undefined,
        createdAt: Math.floor(Date.now() / 1000),
        TTL: 0,
      };

      dispatch({ type: "ADD_SNIPPET_OPTIMISTIC", payload: optimisticSnippet });

      async function attemptPush() {
        return safeAction(
          pushSnippetAction({
            sessionCode,
            hostSecretHash,
            content,
            type,
            language: lang !== "text" ? lang : undefined,
          }),
          tErrors("networkError"),
        );
      }

      let result = await attemptPush();
      if (!result.success) {
        // One silent retry
        result = await attemptPush();
      }

      if (!result.success) {
        dispatch({ type: "SNIPPET_PUSH_FAILED", payload: { id: tempId } });
        return false; // Input NOT restored — caller must preserve typed content
      }
      return true;
    },
    [sessionCode, hostSecretHash, dispatch, tErrors],
  );

  const handleRetry = useCallback(
    async (tempId: string, content: string, lang: string) => {
      dispatch({ type: "SNIPPET_RETRY", payload: { id: tempId } }); // clear failed state
      const type = lang !== "text" ? "code" : "text";
      const result = await safeAction(
        pushSnippetAction({
          sessionCode,
          hostSecretHash,
          content,
          type,
          language: lang !== "text" ? lang : undefined,
        }),
        tErrors("networkError"),
      );
      if (!result.success) {
        dispatch({ type: "SNIPPET_PUSH_FAILED", payload: { id: tempId } });
      }
    },
    [sessionCode, hostSecretHash, dispatch, tErrors],
  );

  const handleDismissFailed = useCallback(
    (tempId: string) => {
      dispatch({ type: "REMOVE_OPTIMISTIC", payload: { id: tempId } });
    },
    [dispatch],
  );

  return { handlePush, handleRetry, handleDismissFailed };
}
```

### Snippet Number Derivation (memoized)

```typescript
// Source: based on Snippet.createdAt sort in use-session-state.ts
// In ClipboardPanel or useSessionState:
const snippetNumbers = useMemo(() => {
  const sorted = [...snippets].sort((a, b) => a.createdAt - b.createdAt);
  return new Map(sorted.map((s, i) => [s.id, i + 1]));
}, [snippets]);

// Usage: snippetNumbers.get(snippet.id) → number
```

### Compact Pill for New-Content Banner

```typescript
// Replace current NewContentBanner (full-width sticky bar) with compact pill
// CONTEXT.md: "Current indicator is too bulky and misaligned — needs to be redesigned as a compact pill"
<button
  className="absolute top-2 left-1/2 -translate-x-1/2 z-10 rounded-full bg-indigo-500 px-3 py-1 text-xs font-semibold text-white shadow-lg"
  onClick={scrollToTop}
>
  1 new
</button>
```

---

## State of the Art

| Old Approach                                | Current Approach                                        | When Changed | Impact                                                             |
| ------------------------------------------- | ------------------------------------------------------- | ------------ | ------------------------------------------------------------------ |
| Server-side `renderHighlight` Server Action | Client `useShikiHighlight` singleton hook               | Phase 16     | Eliminates network round-trip on every keystroke; no spinner       |
| `codeToHtml` from `"shiki"` (full bundle)   | `createHighlighterCore` from `"shiki/core"` + JS engine | Shiki v2+    | Keeps Shiki out of initial bundle                                  |
| Oniguruma WASM regex engine                 | `createJavaScriptRegexEngine()`                         | Shiki v1.24+ | Eliminates WASM binary (~400kB); pure JS works in all environments |
| Full-bundle `import "shiki"`                | Fine-grained `shiki/langs/{lang}`                       | Shiki v1.x+  | Per-language code splitting                                        |
| Host push: wait for server then update UI   | `ADD_SNIPPET_OPTIMISTIC` → replace on confirm           | Phase 16     | 0ms perceived latency on push                                      |

**Deprecated/outdated:**

- `renderHighlight` Server Action: being removed in this phase (SHIKI-04)
- `ShikiBlock` async Server Component: currently used for SSR rendering — will continue to exist for SSR paths (initial page load) but the client-side hook takes over for live updates
- `SnippetWithHtml` type with `highlightedHtml?: string`: can be simplified — `highlightedHtml` was pre-rendered SSR HTML; client hook renders on-demand

---

## Open Questions

1. **Should `ShikiBlock` (async Server Component) be kept or removed?**
   - What we know: `ShikiBlock` is used for initial SSR rendering of snippets. With client Shiki, initial render could still show SSR-highlighted HTML to avoid flash-of-unstyled-code.
   - What's unclear: Whether the SSR path still benefits from `ShikiBlock` or if the client hook handles first render without FOUC.
   - Recommendation: Keep `ShikiBlock` for the SSR path in participant view (initial load); client hook takes over after hydration. The `SnippetCard` effect already handles this transition — just replace the `renderHighlight` call with `useShikiHighlight`.

2. **Should the `Snippet` core type be extended with a `snippetNumber` field?**
   - What we know: `snippetNumber` is display-only, derived from `createdAt` sort position. The DynamoDB schema (`SnippetItem`) has no such field.
   - What's unclear: Whether the backend Lambda needs to persist numbers (for the deferred anchor-link feature).
   - Recommendation: Keep as a derived client-side computation for this phase. The deferred anchor-link feature (CONTEXT.md deferred) would require backend changes — out of scope.

3. **`HighlighterCore.getLoadedLanguages()` API shape in Shiki 4.x**
   - What we know: `getLoadedLanguages()` exists in `@shikijs/core` type definitions.
   - What's unclear: Return type — `string[]` or `LanguageRegistration[]`? Need to verify at implementation time.
   - Recommendation: Check `hl.getLoadedLanguages()` return at implementation time; if it returns `LanguageRegistration[]`, compare against `lang` via `.name` property.

---

## Sources

### Primary (HIGH confidence)

- `/node_modules/shiki/package.json` — version 4.0.2, exports map verified
- `/node_modules/shiki/dist/langs/` — per-language `.mjs` files verified for all SUPPORTED_LANGUAGES
- `/node_modules/shiki/dist/themes/github-light.mjs`, `github-dark.mjs` — confirmed
- `/node_modules/@shikijs/core/dist/index.d.mts` — `createHighlighterCore`, `createHighlighterCoreSync`, `codeToHtml`, `loadLanguage` APIs verified
- `/node_modules/@shikijs/engine-javascript/dist/index.mts` — `createJavaScriptRegexEngine` confirmed
- `packages/frontend/src/hooks/use-session-state.ts` — `ADD_SNIPPET_OPTIMISTIC`, `SNIPPET_ADDED` with `optimisticId`, `REMOVE_OPTIMISTIC` all exist and verified
- `packages/frontend/src/hooks/use-session-mutations.ts` — question optimistic pattern (lines 228-270) verified as blueprint
- `packages/frontend/src/components/session/host-input.tsx` — current `renderHighlight` call location verified
- `packages/frontend/src/components/session/snippet-card.tsx` — current `renderHighlight` effect verified
- `packages/core/src/types.ts` — `Snippet` type has no `snippetNumber` field; `createdAt` is Unix epoch seconds
- `.planning/STATE.md` — verified decision: `import("shiki/core")` must be inside async callback; static import adds 695kB gzip

### Secondary (MEDIUM confidence)

- `packages/frontend/src/app/globals.css` lines 144-161 — Shiki dual-theme CSS already present (`html.dark .shiki` selector) — client Shiki output will work with existing CSS

### Tertiary (LOW confidence)

- Assumption: `HighlighterCore.codeToHtml()` is synchronous after `loadLanguage()` completes — based on `createHighlighterCoreSync` type signature in `@shikijs/core`. Verify at implementation time.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — Shiki 4.0.2 installed, all imports verified in node_modules; React 19 + existing reducer patterns verified in source
- Architecture: HIGH — existing reducer actions confirmed, question pattern is exact blueprint, Shiki singleton pattern verified against type definitions
- Pitfalls: HIGH — duplicate snippet pitfall derived directly from reading the existing reducer code; Shiki static import pitfall verified from STATE.md decision

**Research date:** 2026-03-18
**Valid until:** 2026-04-17 (Shiki 4.x is stable; React 19 patterns are stable; 30 days)
