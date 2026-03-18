# Phase 13: UX Polish and Accessibility - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Every interactive element in the session view communicates its state honestly — votes show fill when active, participants see their identity before posting, and own questions are spatially recognizable in the feed. No new capabilities; this phase polishes existing interactions.

</domain>

<decisions>
## Implementation Decisions

### Vote button feedback

- Upvote fills with solid brand Indigo when active; outline-only when unvoted
- Downvote fills with muted gray when active — upvote is primary, downvote is secondary
- Mutual exclusion (switching up/down) is instant — no animation delay, previous unfills as new fills simultaneously
- Vote count updates instantly, no animation on number change
- `aria-pressed` toggles on every state change for screen readers

### Identity in input

- Notionist pixel avatar + name displayed as a label row **above** the question input (not inline)
- Anonymous participants see a default pixel avatar with the text "Anonymous"
- Identity row is always visible — no show/hide on focus
- Identity row is display-only, not tappable — name/avatar changes happen through the existing identity panel

### Own-question accent

- 3px left-border accent in brand Indigo on the participant's own questions
- Border only — no background tint, no "You" badge
- Visible only to the author — personal navigation aid, not public attribution

### Micro-interactions and motion

- Minimal/instant motion philosophy — state changes are instant, no decorative transitions
- Vote buttons have hover state (slightly brighter) and press state (scale 0.95x) for responsive feel
- Focus ring uses `focus-visible` only — visible on keyboard navigation, hidden on mouse/touch
- No haptic/vibration feedback on mobile

### Claude's Discretion

- Exact pixel avatar size in the identity row relative to text
- Spacing between identity row and input field
- Precise hover brightness increase value
- How to handle edge case where identity loads after input renders

</decisions>

<specifics>
## Specific Ideas

- Project already has a Notionist avatar system in place — identity display should use it directly
- Motion philosophy aligns with "state transparency" principle: the UI should always honestly show its current state without decorative delay
- Vote button states should feel like toggles, not actions — the visual should represent current state, not an event

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 13-ux-polish-and-accessibility_
_Context gathered: 2026-03-17_
