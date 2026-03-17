# Phase 10: Reactions Frontend State and UI - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Render a `ReactionBar` component below every Question and Reply with live emoji counts, optimistic toggle behavior, visual highlight for the user's own active reactions, full ARIA accessibility, and 44px mobile touch targets. The backend (mutations, subscriptions, DynamoDB) is already built in Phase 9 — this phase is purely frontend: component, state management, and real-time sync.

</domain>

<decisions>
## Implementation Decisions

### Primary Reference: Slack

The entire reaction UX should mirror Slack's model. Slack is the authoritative reference for how reactions look, feel, and behave. Specific decisions below are all informed by this reference.

### Emoji Set

- 6 emojis: 👍 ❤️ 😂 😮 🙏 👀
- Dropped 😢 (sad) from classic set in favor of 👀 (eyes/watching)
- Order is fixed as listed above

### Reaction Bar Layout

- **No full bar shown by default** — only a small add-reaction trigger button (smiley face icon, like Slack)
- When reactions exist on an item, they appear individually as inline pills (emoji + count) in a horizontal row
- New reactions are added to the render as they appear — they accumulate visually, not all shown upfront
- Count displayed to the right of each emoji: `👍 3`
- All reaction buttons are uniform size (no scaling by count)
- Reaction bar lives inside the card footer, below content, with standard spacing (12-16px from content)
- Always visible on both QuestionCard and ReplyCard — no hover-only behavior for replies

### Add-Reaction Trigger

- Small smiley face / ➕ icon always visible (even when reactions already exist on the item)
- Clicking opens an inline expansion showing the 6 emoji options (not a popover)
- Auto-closes after picking one emoji
- This is how users add the FIRST reaction AND add additional reaction types

### Optimistic Toggle Feel (Slack-style)

- Tap feedback: Slack-style subtle background highlight — no dramatic animation, emoji gets a tinted pill/chip background
- Silent revert if server rejects (no toast, no error UI — just undo the visual toggle quietly)
- 300ms debounce on rapid toggles before sending mutation to server
- When subscription event arrives with different count: instant swap (no number animation)

### Own-Reaction Highlight

- Slack-style: your active reaction has a tinted pill background using neutral gray (not brand indigo)
- Inactive reactions (others' only) have transparent/no background
- Removing your reaction: instant un-highlight, no fade animation
- If you're the last person to remove a specific emoji, that button disappears (zero-count hide rule)

### Host Behavior

- Host can react same as any participant — no special badge or visual distinction
- Reactions are count-only — no tooltip showing who reacted (anonymous)

### Count Overflow

- Display exact count up to 99, then show "99+"
- Button width is fixed regardless of count — no layout shifts

### Claude's Discretion

- Exact spacing values within the design system scale
- Add-reaction trigger icon choice (smiley vs plus — as long as it mirrors Slack's affordance)
- Skeleton loading state for reaction bars during initial data fetch
- Exact animation timing for inline expansion of emoji picker
- Error state handling for subscription disconnects

</decisions>

<specifics>
## Specific Ideas

- "I want all of this to work exactly like Slack reactions" — Slack is the single reference point for every UX decision
- In Slack, there's a small button to add reactions, the full reaction set is NOT shown by default, and reactions accumulate in the render as they're added
- Highlight style: Slack's neutral tinted pill for your own reactions, not a brand-colored highlight
- Tap feel: Slack's subtle, calm toggle — no bouncy animations or material ripples

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 10-reactions-frontend-state-and-ui_
_Context gathered: 2026-03-16_
