# Phase 14: Infrastructure and URL Routing - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Measurable backend and routing improvements: Lambda cold-start reduction (memory + arm64), DynamoDB SSR read halving, vote-driven question reordering with smooth animation, and full migration from word-pair slugs to 6-digit numeric session codes with a dedicated /join page.

</domain>

<decisions>
## Implementation Decisions

### Numeric Code Format & Generation

- 6-digit codes, range 100000-999999 (no leading zeros, always 6 digits)
- All digits 0-9 (no ambiguous digit exclusion)
- Display format: grouped 3+3 with space (e.g., "482 913") — space is display-only
- Code IS the session ID — no separate UUID, no mapping table
- Random generation with retry on collision (no sequential fallback)
- Reusable after session ends with 24-hour cooldown before recycling
- Flat URL structure: `/en/482913` (no `/session/` prefix)
- Locale-less access supported: `/482913` auto-detects locale and redirects to `/en/482913`
- Route matching: regex exactly 6 digits — `/en/[0-9]{6}` goes to session, anything else falls through
- Tab title: both session name + code (e.g., "My Session — 482 913 | nasqa")

### Share Widget

- URL in browser + share widget overlay with large code display, copy button, and QR code
- Reuse the existing QR/share component already in the codebase
- No spoken-form pronunciation hint — grouped digits are sufficient for reading aloud

### Join Page (/join)

- Standalone page — no nav bar or footer, clean and focused like a login page
- Branded landing: nasqa logo/branding at top, short tagline, then code input
- 6 individual OTP-style digit boxes (auto-advance between boxes)
- Auto-focus first digit on page load — user can type immediately
- Auto-submit when 6th digit entered — no button press needed
- Invalid code: shake animation + clear all digits
- Expired/closed session: specific "session ended" message (not same as invalid)
- Smart paste: if user pastes a full URL, extract the 6-digit code and auto-fill
- Deep-link support: `/join?code=482913` auto-fills and submits
- Locale-less: `/join` redirects to `/en/join` (consistent with session URL pattern)
- Direct navigation after valid code — no preview/confirmation step
- Branded OG card for social sharing / link previews
- Dark mode: same layout, theme-adapted colors via design system tokens

### Vote Reordering Animation

- Smooth slide/swap animation — cards physically slide to new positions (spatial continuity)
- 300ms debounce for ALL votes (including user's own) — batch changes within window, animate once
- Animation duration: 300ms with ease-out easing
- Direct slide to final position regardless of how many spots jumped (no cap)
- Vote count updates instantly (no counting animation)
- No highlight/glow after a card moves — the animation itself communicates the change
- Maintain scroll position when cards move above viewport
- Respect `prefers-reduced-motion`: instant reorder, no animation
- Tie-break: earlier submission stays above when vote counts are equal
- New questions: fade + slide in from top of list
- Same vote-driven sort for both host and participant views
- Host does NOT get a separate sort toggle

### Migration from Word-Pair Slugs

- COMPLETE REMOVAL — delete all word-pair slug generation code, routes, and dependencies
- No backward compatibility: no redirects, no fallback routes for old word-pair URLs
- Remove word-list library and any slug-generation dependencies from package.json
- Only new sessions get numeric codes — existing sessions with word-pair IDs expire naturally
- Remove redirect code after 30 days (simplified: since no redirects are being added, just ensure no word-pair route code remains)

### Lambda Cold-Start Tuning

- Memory bump to 256MB and arm64 architecture
- Config change in sst.config.ts is sufficient validation — no CloudWatch smoke test needed
- Also review and adjust Lambda timeout settings for user-facing functions

### DynamoDB Read Optimization

- Goal: halve SSR reads from 4 to 2 per session page load
- Trust the implementation — no temporary log counter for verification
- Code review is sufficient proof of read reduction

### Claude's Discretion

- Which Lambda functions get the memory/arm64 bump (audit user-facing vs background)
- DynamoDB optimization approach: consolidate items vs caching (pick most effective)
- Whether DynamoDB API surface changes or stays transparent (depends on caller count)
- Share widget positioning and trigger behavior
- Loading skeleton design for session page

</decisions>

<specifics>
## Specific Ideas

- Existing QR/share component should be reused for the share widget — do not build a new one
- The /join page should feel like a verification code entry (OTP pattern) — familiar, zero-friction
- The shake animation on invalid code is a physical signal, not just a text error
- Tab title with both name + code helps hosts with multiple sessions open
- "Session ended" message for expired codes is a deliberate UX choice — users deserve to know they had the right code

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 14-infrastructure-and-url-routing_
_Context gathered: 2026-03-17_
