# Phase 18: Header and Navigation - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the current two-bar header (73px global bar + ~44px session bar) with a single 56px unified header bar. The bar shows branding and session context on the left, hamburger menu and profile on the right. Theme toggle and language switcher move inside the hamburger. All pages (session, landing, /join) share the same bar structure — session-specific elements appear/disappear based on context.

</domain>

<decisions>
## Implementation Decisions

### Single bar layout

- **Height:** 56px, use a CSS variable `--header-height: 56px` everywhere (replace all `calc(100dvh-73px)` references)
- **Background:** Slightly tinted (`bg-muted` or similar) — not same as page background
- **Edge:** Soft drop shadow instead of `border-b` — no visible bottom border line
- **Width:** Full width edge-to-edge, content padded inside
- **Position:** Static (scrolls with content), NOT sticky
- **Desktop layout:** Two visual groups left-aligned: [Logo + CLIP] then [Session Title + Live indicator] ... gap ... [Share] [Hamburger] [Profile + Name]
- **Mobile layout (< 640px):** Logo stays left, session title moves to center (smaller font for long titles), controls stay right. Hide app name ("CLIP") and Live indicator text on mobile.
- **Tab bar:** Remains as a separate element below the header (not merged into header bar)
- **Separator:** Extra spacing (16-24px) between Share button and personal controls — no visible divider
- **Logo:** Smaller/simplified to fit 56px bar. Icon-only on mobile if needed.
- **Logo link:** Links to home page; inside sessions shows a confirmation dialog before navigating ("Leave this session?")
- **Long session titles:** Truncate with ellipsis by default, clicking expands to show full title

### Live indicator

- **Layout:** Vertical stack — pulsing colored dot on top, text below in small caps
- **States remain:** LIVE (green pulsing), Reconnecting (yellow), Paused (grey)
- **Desktop:** Shows after session title as part of left-side session context group
- **Mobile:** Hidden (space constraint) — session title centered takes priority

### Hamburger menu

- **Style:** Dropdown panel (not side drawer, not full overlay) — drops down from the hamburger icon
- **Contents:**
  1. Theme toggle — labeled switch ("Dark mode" + toggle), NOT icon-only
  2. Language switcher — inline EN | ES | PT toggles (same as current style)
  3. About link or app version info
- **Position:** Right side of header, leftmost of the right-side controls

### Profile + identity

- **Profile icon:** Generic user silhouette (lucide User or similar) for anonymous users; Notion-style avatar (initial circle or similar) for identified users
- **Name display:** First name only when identified; nothing (just icon) when anonymous
- **Click behavior:** Opens the existing IdentityEditor popover — same editing experience as now
- **Position:** Right side of header, to the right of hamburger (rightmost element)

### Non-session pages

- **Landing page:** Logo + CLIP on left, hamburger + profile on right — no session title, no Live, no Share
- **Join page:** Same as landing page — consistent across all non-session pages
- **Profile icon present:** Always shown, even outside sessions — identity persists
- **Visual style:** Identical 56px height, tinted background, shadow — session-specific elements just don't render

### Host-specific elements

- **Share button:** Stays visible in the header bar (not inside hamburger) — host-only, primary action
- **Other host tools:** Move inside hamburger menu if any exist

### Claude's Discretion

- Exact shadow value (subtle, not heavy)
- Exact tint color for header background
- Hamburger icon choice (three lines, dots, etc.)
- Animation for dropdown panel open/close
- Mobile breakpoint exact pixel value
- How the "expand title" interaction works visually
- Notion-style avatar implementation details
- z-index layering for dropdown panel

</decisions>

<specifics>
## Specific Ideas

- Desktop: `[Logo CLIP] [Session Title • Live] ............ [Share] [☰] [👤 Santiago]`
- Mobile: `[Logo] ......... [Session Title] ......... [Share] [☰] [👤]`
- Live indicator as a vertical micro-column: dot on top, "LIVE" in small caps below — proportional sizing
- Hamburger dropdown has a clean utility-menu feel with labeled controls, not bare icons
- Logo+CLIP linking home with a confirmation dialog prevents accidental session exit while maintaining standard web navigation convention

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 18-header-and-navigation_
_Context gathered: 2026-03-18_
