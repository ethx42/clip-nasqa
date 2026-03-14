# Phase 2: Session and View Shell - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Host creates a session and shares it (URL + QR code); participants navigate to the session URL and see the static view shell with theme support. No real-time features yet — this phase delivers the creation flow, the participant/host shell layout, the landing page, and the theme system.

</domain>

<decisions>
## Implementation Decisions

### Session Creation Flow
- Host provides title only (max 50 chars) — no description, no language preset
- Slug generated as random word pair (e.g., "brave-falcon") from a curated word list — memorable, easy to share verbally
- After creation: dedicated success page showing session title, host secret with copy button, host URL (secret in hash fragment), QR code for participants, and a warning that the secret won't be shown again
- QR code available on both the success page (immediate sharing) and persistently in the host view (for projecting during talks)

### Participant View Shell
- Two-column split layout: clipboard/snippets on the left, Q&A on the right
- On mobile: collapses to tabs ("Clipboard" / "Q&A") — one section visible at a time, badge on Q&A tab for new questions
- Empty state: session title at top, subtle "Waiting for the speaker to share..." message in the content area — clean, minimal, reassuring
- Host view uses the same layout as participant view, with added host controls (edit/delete buttons, snippet composer, host toolbar)

### Landing / Marketing Page
- Friendly and approachable tone — warm, inviting, explains the concept clearly for non-technical speakers too
- Hero section + CTA only above the fold — one compelling headline, subtitle, and "Create Session" button
- Session creation form is inline on the landing page (title input in hero section) — no separate /create page
- Browser-detected locale with English fallback (respects Accept-Language header)

### Theme and Visual Identity
- Light mode default — toggle available for dark mode
- Emerald accent used moderately: primary buttons, active tabs, focus indicators, plus section headings, links, badges, and highlight borders
- Playful and warm visual feel: rounded corners, colorful accents, subtle animations, friendly micro-interactions (think Figma or Slack)
- Theme toggle as sun/moon icon in the top-right header — always accessible, one click

### Claude's Discretion
- Loading skeleton design and animation style
- Exact spacing, typography choices, and font family
- Error state handling and copy
- Specific micro-interaction animations

</decisions>

<specifics>
## Specific Ideas

- Word-pair slugs should be memorable enough to say aloud at a conference ("join brave-falcon")
- Success page should make it very clear this is the only time the host secret is shown
- The inline creation form on the landing page should feel effortless — type title, hit enter/create, done
- Playful warmth inspired by Figma/Slack aesthetic — not sterile, not childish

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-session-and-view-shell*
*Context gathered: 2026-03-14*
