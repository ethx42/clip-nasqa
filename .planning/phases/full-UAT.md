---
status: testing
phase: all (01-04)
source: 01-01 through 04-04 SUMMARY.md
started: 2026-03-15T00:00:00Z
updated: 2026-03-15T00:00:00Z
---

## Current Test

number: 1
name: Landing Page and Session Creation
expected: |
  Visit the landing page. You see a headline ("Share code and take questions — live."), subtitle, and a form with a title input and "Create Session" button. Enter a talk title and submit.
awaiting: user response

## Tests

### 1. Landing Page and Session Creation
expected: Visit the landing page. Headline, subtitle, feature cards, and inline form with title input + emerald CTA button visible. Enter a title and submit — you are redirected to a success page.
result: [pending]

### 2. Success Page — Secret, URLs, QR Code
expected: After creating a session, the success page shows: (a) the raw host secret with a copy button, (b) an amber warning that it won't be shown again, (c) a host URL with #secret hash, (d) a participant URL, and (e) a QR code SVG for the participant URL.
result: [pending]

### 3. Theme Toggle
expected: Click the theme toggle (sun/moon icon). The page switches between dark (zinc-950 background) and light (white background) modes with no layout shift. Emerald-500 accent color is consistent in both themes.
result: [pending]

### 4. Language Switcher (i18n)
expected: Click EN | ES | PT buttons in the header. All UI text (labels, buttons, placeholders) changes to the selected language. Refresh the page — the locale persists (cookie-based). The language switcher appears on both the landing page and session pages.
result: [pending]

### 5. Participant View Shell
expected: Open the participant URL. You see a two-column layout: clipboard on the left, Q&A on the right. On mobile, these collapse to tabs. Empty states show "Waiting for the speaker to share..." and "No questions yet."
result: [pending]

### 6. Host View Shell
expected: Open the host URL (with #secret hash). You see the same two-column layout as participant, plus a persistent QR code in the toolbar and host input controls for pushing snippets.
result: [pending]

### 7. Host Pushes a Code Snippet
expected: In the host view, type or paste code into the input, select a language, and submit. The snippet appears as the "Hero" (prominently displayed) with Shiki syntax highlighting. Previous snippets move to the history list below.
result: [pending]

### 8. Real-Time Snippet Broadcast
expected: With host and participant views open in separate windows: host pushes a snippet → participant sees it appear within ~200ms without refreshing. The latest snippet is the Hero on both views.
result: [pending]

### 9. Shiki Syntax Highlighting — Dual Theme
expected: Code snippets render with syntax highlighting in both light and dark themes. Toggle the theme — highlighting colors change appropriately with no layout shift.
result: [pending]

### 10. Host Deletes Snippet / Clears Clipboard
expected: In host view, click the delete button (···) on a snippet — a confirmation appears, then it disappears for all participants. Click "Clear All" — a confirmation appears; confirming removes all snippets. Participants see a "clipboard was cleared" toast.
result: issue
reported: "clicking the three dots removes the cards immediately without confirmation"
severity: major

### 11. Submit a Question (Participant)
expected: In the participant Q&A tab, type a question (up to 500 chars) and submit. Character counter appears at 80% (400 chars) and turns red near 500. The question appears in the feed immediately.
result: [pending]

### 12. Real-Time Q&A Broadcast
expected: Participant submits a question → it appears on all connected clients (host and other participants) in real-time without refresh.
result: [pending]

### 13. Upvote a Question
expected: Click the upvote arrow on a question — it turns emerald and the count increases. Click again — the upvote is removed (toggle). Questions sort by vote count in real-time (with a brief debounce). Refreshing the page preserves your vote state (localStorage).
result: [pending]

### 14. Reply to a Question
expected: Click "Reply" on a question — an inline text area appears (500-char limit). Submit a reply — it appears nested below the question. Host replies show an emerald left border and "Speaker" badge.
result: [pending]

### 15. Focus a Question (Host)
expected: In host view, hover over a question and click the focus toggle (○/●). The question gets pinned to the top with an emerald glow border and "Focused" badge. Clicking again unfocuses it.
result: [pending]

### 16. Connection Status Indicator
expected: The session header shows a live indicator: green pulsing dot + "LIVE" when connected. If you disconnect (e.g., toggle airplane mode briefly), it shows yellow "Reconnecting..." then recovers.
result: [pending]

### 17. JoinModal on First Visit
expected: Open a session URL in a new incognito window. A modal appears asking for your display name (optional) and email (optional). Click "Join session" or "Skip". Refresh — the modal does NOT appear again.
result: [pending]

### 18. Identity — Display Name on Questions
expected: Set a display name via JoinModal or IdentityEditor (user icon in header). Submit a question — your name appears on the question card. Another participant without a name shows "Anonymous".
result: issue
reported: "el user agrega su name pero nunca se ve en las cards del QA"
severity: major

### 19. Downvote a Question
expected: Click the thumbs-down icon on a question — downvote count increases. If you had upvoted, the upvote is removed (mutually exclusive). Click thumbs-down again to retract.
result: issue
reported: "downvote doesn't work"
severity: major

### 20. Community Auto-Hide (Downvote Threshold)
expected: When a question receives enough downvotes (>= 50% of voters), it collapses to "Hidden by community [Show]" for all participants. Clicking [Show] reveals the content. Host sees a "Restore" button to unhide it.
result: [pending]

### 21. Host Ban Question
expected: In host view, hover over a question and click the shield-X icon. The question immediately shows "This question was removed" (tombstone) for all participants.
result: [pending]

### 22. Host Ban Participant
expected: In host view, hover over a question and click the ban icon. A confirmation dialog appears. Confirm — the participant's input is disabled with "You've been blocked from posting in this session."
result: [pending]

### 23. Auto-Ban After 3 Strikes
expected: Have a participant submit 3 questions that the host bans. After the 3rd ban, the participant is automatically blocked from posting further.
result: [pending]

### 24. Rate Limiting
expected: As a participant, submit questions rapidly (> 3 in one minute) — the 4th is rejected with a rate limit message. As host, push snippets rapidly (> 10 in one minute) — the 11th is rejected.
result: [pending]

### 25. Framer Motion Animations
expected: New snippets animate in (fade/slide). The hero card transitions smoothly when a new snippet arrives. Question cards don't jump chaotically on rapid upvotes (debounced sort).
result: [pending]

## Summary

total: 25
passed: 0
issues: 3
pending: 22
skipped: 0

## Gaps

- truth: "Downvote count updates optimistically on click"
  status: fixed
  reason: "User reported: downvote doesn't work — missing optimistic dispatch in handleDownvote (both participant and host pages)"
  severity: major
  test: 19
  root_cause: "handleDownvote updated localStorage but never dispatched QUESTION_UPDATED to reducer — UI count stayed stale"
  artifacts:
    - path: "packages/frontend/src/components/session/session-live-page.tsx"
      issue: "missing dispatch for downvoteCount"
    - path: "packages/frontend/src/components/session/session-live-host-page.tsx"
      issue: "missing dispatch for downvoteCount"

- truth: "Clicking ··· on a snippet shows confirmation before deleting"
  status: fixed
  reason: "User reported: clicking the three dots removes the cards immediately"
  severity: major
  test: 10
  root_cause: "HeroCard and HistoryCard ··· button called onDelete directly without window.confirm"
  artifacts:
    - path: "packages/frontend/src/components/session/clipboard-panel.tsx"
      issue: "no confirmation dialog on individual snippet delete"
