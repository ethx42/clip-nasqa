# Phase 3: Real-Time Core - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Live clipboard and Q&A are fully functional in real-time. Host pushes code/text snippets and audience sees them instantly via AppSync subscriptions. Participants submit questions anonymously, upvote, and reply. Host can focus questions, delete snippets, and clear the clipboard. Shiki syntax highlighting renders server-side. Optimistic UI for all write operations. Moderation (downvotes, banning) is Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Clipboard Hero & History Layout
- Full-width hero card for the latest snippet, prominently styled
- Older snippets collapse into a list below with first 2-3 lines truncated, click to expand
- Each snippet card shows: language badge (code only), relative timestamp (live-updating), copy button, sequential snippet number (#1, #2, etc.)
- Snippet numbers visible on both host and participant views so speaker can reference by number
- Hero code blocks have a max height (~20 lines) then internal scroll
- Show all history snippets with lazy loading as user scrolls
- Code snippets show line numbers in hero view; text snippets do not show line numbers
- Text snippets: same card style as code but plain text rendering (no syntax highlighting, no monospace), labeled "Text"
- Plain text only for text snippets — no markdown rendering
- Auto-linkify URLs in text snippets (open in new tab)
- Copy button copies raw code/text content with no formatting or metadata
- Copy confirmation: icon swaps from clipboard to green checkmark for 2s

### Clipboard Empty State
- "Waiting for the speaker..." message with a subtle pulse animation when no snippets exist

### Clipboard Deletion & Clear
- Snippet deletion: fade out + collapse animation; if hero is deleted, next snippet promotes up
- Host actions (delete, etc.) behind a three-dot menu on each snippet card
- "Clear All" as a separate subtle text button near the top of clipboard panel
- Clear All requires confirmation dialog: "Clear all snippets? This cannot be undone."
- On clear, participants see a "Clipboard cleared by speaker" toast for 3s; all snippets fade out together

### New Snippet Notification
- When participant is scrolled down in history, a sticky "New snippet from speaker" banner appears at top of clipboard area
- Tapping the banner scrolls to the hero; does not auto-scroll and disrupt reading

### Q&A Feed Layout
- Card per question showing: upvote arrow + count, question text, reply count, relative timestamp
- Questions sorted by upvote count (descending), re-sorted live in real-time as votes change
- Smooth slide animation (~300ms) when questions re-sort from vote changes
- Focused question pinned at top with pulsing emerald glow border + "FOCUSED" label
- Focusing a question auto-expands its reply thread
- Only one question can be focused at a time; focusing a new one unfocuses the previous
- Host actions (focus, delete) behind a three-dot menu on each question card (consistent with clipboard)

### Q&A Input & Submission
- Question input field sticky at bottom of Q&A panel, always accessible
- 500 character limit for questions; character counter appears only when 80%+ of limit reached (e.g., "450/500")
- After submitting: optimistic insert into feed with brief emerald flash on participant's own card; input clears immediately
- Participants see a subtle "You" badge on their own questions (based on localStorage fingerprint)
- Empty Q&A state: "Be the first to ask a question!" with input field prominently visible

### Q&A Replies
- Inline expand: click "N replies" to expand replies below the question card
- Speaker replies have emerald border + "Speaker" badge; participant replies are anonymous
- Anyone (participant or host) can reply to any question
- Reply input opens inline below the question when "Reply" button is tapped
- 500 character limit for replies (same as questions)

### Q&A Upvoting
- Optimistic: count increments immediately, arrow turns emerald
- Toggle: tapping again removes the vote (arrow returns to default, count decrements)
- If server rejects (already voted via another mechanism), reverts silently

### Q&A New Question Notification
- "N new questions" banner at top of Q&A panel when scrolled down; tap to scroll up
- Does not auto-scroll

### Q&A Content
- Auto-linkify URLs in questions and replies (same as text snippets)
- Reply count badge updates with brief highlight when new replies arrive on collapsed threads

### Real-Time Transitions
- New snippet: current hero slides down to history, new hero fades in from top with brief emerald highlight (fades after 2s)
- New question: fades in at its vote-sorted position with brief emerald flash
- Deletion: fade out + collapse animation
- Focus/unfocus: smooth slide to/from pinned position at top, glow appearing/fading
- Optimistic updates: instant appearance, no "sending" indicator; silent revert on server rejection
- Connected count: subtle number tick animation (scale) on changes

### Connection & Loading States
- WebSocket disconnect: yellow "Reconnecting..." banner at top of page; content stays visible but stale; auto-retry
- Host reconnect: "Speaker is back!" banner for 3s
- Initial load: shimmer/pulse skeleton placeholders for both clipboard and Q&A panels

### Host Input Experience
- Dedicated input zone at top of clipboard panel, always visible (both desktop and mobile)
- Accepts both typing and pasting
- Auto-detect on content: if it looks like code, show as code snippet with detected language badge; if plain text, show as text snippet
- Language is auto-detected but host can tap the language chip to override if detection was wrong
- Live Shiki-highlighted preview renders below input as host types/pastes (visible on mobile too, scrollable)
- Cmd/Ctrl+Enter keyboard shortcut to push snippet
- Input clears immediately after push

### Mobile Experience
- Host view fully functional on mobile — full feature parity
- Tab bar navigation between Clipboard and Q&A panels (same pattern as participant mobile view)
- Host input zone always visible at top on mobile (does not collapse)
- Live preview shown on mobile, scrollable if content is long
- Participant default mobile tab: Clipboard (primary content)

### Session Liveness Indicators
- Green pulsing dot with "LIVE" text in session header when host is connected
- Dot turns grey with "Paused" text when host disconnects
- Connected participant count visible to both host and participants in header
- After 2+ minutes of no host activity, show "Last snippet Xm ago" in header; disappears on new activity

### Claude's Discretion
- Exact animation timing and easing curves
- Shiki theme configuration details
- Language auto-detection algorithm/library choice
- Supported languages list for Shiki highlighting
- Exact skeleton placeholder shapes and shimmer speed
- Toast positioning and styling
- Internal reconnection retry strategy (backoff, max retries)
- Tab bar styling on mobile

</decisions>

<specifics>
## Specific Ideas

- Snippet cards should feel clean and modern — language badge, snippet number, timestamp, copy button as metadata below the code block
- The host experience should feel like a "broadcast console" — paste/type at top, see your feed below, manage Q&A on the other panel
- Q&A should feel like Slido — vote-sorted cards, instant feedback on upvote, focused question with a glow that draws attention
- Auto-detect for code vs text makes the host flow friction-free: paste and go
- The "new snippet" banner pattern (like Twitter's "new tweets" bar) prevents disrupting participants who are reading history

</specifics>

<deferred>
## Deferred Ideas

- Downvoting questions (MOD-04) — Phase 4: Moderation
- Community auto-hide via downvote threshold (MOD-05) — Phase 4: Moderation
- Host ban by question/participant (MOD-02, MOD-03) — Phase 4: Moderation
- Auto-ban after 3 banned posts (MOD-06) — Phase 4: Moderation
- Device fingerprinting for ban enforcement (MOD-01) — Phase 4: Moderation

</deferred>

---

*Phase: 03-real-time-core*
*Context gathered: 2026-03-14*
