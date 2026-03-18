# Phase 16: Optimistic Snippet Push and Client Shiki - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Zero-latency snippet push and live syntax highlighting. The host's clipboard push appears instantly before server confirmation, and syntax highlighting updates live as the host types without any server round-trip. Client Shiki replaces server-side highlighting across all views.

</domain>

<decisions>
## Implementation Decisions

### Optimistic push appearance

- No visual distinction between optimistic and confirmed snippets — identical from the moment of push
- Silent confirmation — no animation, checkmark, or visual signal when server confirms
- Textarea clears immediately on push, focus stays on textarea for rapid next-snippet workflow
- Multiple rapid pushes stack independently — each gets its own optimistic entry, all confirm independently
- Optimistic snippet gets full metadata immediately (title, language badge, line count)
- Optimistic snippet is fully interactive before confirmation (deletable, editable)
- If host edits an optimistic snippet before confirmation, the server push is deferred until editing is finished
- Keyboard shortcut: Cmd/Ctrl+Enter to push

### Snippet numbering

- Persistent creation-order numbering — snippet #1 is always #1 regardless of new pushes
- Display order is newest-first (highest number at top, numbers descend going down)
- Optimistic snippet gets its number immediately (next in sequence); if it fails, the number is released
- Both host and participant views show the same persistent numbers

### New-content indicator

- When host has scrolled away from the top, a small pill badge ("1 new") appears at the top edge of the clipboard panel
- Tapping the pill scrolls to top
- Current indicator is too bulky and misaligned — needs to be redesigned as a compact pill

### Failure and rollback

- Red border + retry button on the failed snippet card; snippet stays in the clipboard panel
- Failed snippets persist until explicitly retried or dismissed — no auto-timeout
- One silent automatic retry before showing the error state (handles transient network blips)
- If the host has started typing a new snippet, don't overwrite the textarea — the failed snippet stays in the panel with retry available
- On successful retry, snippet keeps its original position and number (red border disappears)
- Dismiss = gone permanently, no undo
- Cancel the pending server write if the host deletes an optimistic snippet before confirmation
- Failed snippets are host-only — participants never see unconfirmed or failed content

### Live syntax preview

- Edit/preview toggle sharing the same space (not side-by-side, not below)
- Eye icon button to toggle between edit mode (textarea) and preview mode (highlighted code)
- No keyboard shortcut for the toggle
- Preview updates on every keystroke — true real-time, no debounce
- Cursor position restored when toggling back from preview to edit
- Line numbers shown in the preview gutter
- Copy-to-clipboard button on the preview (copies raw code, not HTML)

### Shiki theming and scope

- Client Shiki highlighting everywhere: input preview, clipboard panel cards, and participant view
- Shiki theme matches app theme — light theme in light mode, dark theme in dark mode
- Replaces current server-side rendering with client-side Shiki across all views

### Language selection

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

</decisions>

<specifics>
## Specific Ideas

- "I want to preserve the numbers so I can reference it in the speech" — persistent numbering is critical for the live-talk use case
- Current new-snippet indicator is "bulky and misaligned" — needs a clean, compact pill redesign
- Eye icon for preview toggle — compact, not tab-like
- The whole experience should feel like the snippet teleports from input to clipboard instantly

</specifics>

<deferred>
## Deferred Ideas

- **Linkable/shareable snippet numbers with anchor jumping** — snippets should have URL anchors based on their number so the host can share a link and participants jump to that specific snippet. This is a new capability beyond optimistic push scope.

</deferred>

---

_Phase: 16-optimistic-snippet-push-and-client-shiki_
_Context gathered: 2026-03-18_
