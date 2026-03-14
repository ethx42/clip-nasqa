# Phase 4: Moderation, Identity, and Polish - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Community moderation (downvotes, host bans, auto-ban), optional participant identity (display name + email), i18n for en/es/pt, and server-side rate limiting. The product becomes production-ready after this phase.

</domain>

<decisions>
## Implementation Decisions

### Moderation UX
- Inline ban/delete icons on question cards — appear on hover (desktop), always visible for host (mobile)
- No separate moderation panel; all actions are contextual and inline
- When host bans a question: replaced with "This question was removed" placeholder for all participants
- When host bans a participant (by fingerprint): confirmation dialog before executing
- No confirmation needed for hiding a single question (speed over safety for individual actions)
- Banned participant sees explicit message: "You've been blocked from posting in this session" with input disabled

### Community Downvoting
- Separate thumbs-down button alongside existing upvote — both counts visible to everyone
- Both upvote and downvote are toggles (click again to retract) — this changes current upvote behavior to also be retractable
- Upvote and downvote are mutually exclusive per question (clicking one removes the other, like Reddit)
- Auto-hide threshold: 50% of participants who voted on that specific question (not total connected audience)
- Auto-hidden questions show as collapsed: "Hidden by community" with a [show] expand option
- Host can restore community-hidden questions (override the auto-hide)

### Optional Identity
- Join screen with optional name + email fields and a "Skip" button — shown when participant first enters a session
- Display name replaces "Anonymous" label on questions and replies — no avatar, just the name text
- Profile icon in session header allows editing name/email mid-session
- Name and email persist in localStorage across sessions — join screen pre-fills with saved values
- Email is stored but never displayed publicly (per IDENT-03)

### i18n
- Browser-detected locale with manual language switcher dropdown in the header (EN | ES | PT)
- Everything translated: marketing/landing page and in-session UI
- Claude generates es.json and pt.json translations during implementation (good enough for v1)
- Language preference persists in localStorage — overrides browser detection on subsequent visits
- Translation covers UI chrome only, not user-generated content (per I18N-04)

### Claude's Discretion
- Rate limiting implementation details (INFRA-05: 10 snippets/min host, 3 questions/min participant)
- Device fingerprint (localStorage UUID) implementation for ban enforcement
- Auto-ban logic after 3 banned posts (MOD-06)
- Animation/transition details for moderation actions
- Language switcher exact placement and styling
- Join screen layout and skip flow design

</decisions>

<specifics>
## Specific Ideas

- Host moderation icons should feel lightweight — small, subtle icons that don't clutter the question cards
- Community-hidden content should be expandable ("Hidden by community [show]") so curious participants can still read it — transparency over censorship
- The voting model should feel like Reddit: one vote per question, mutually exclusive up/down, toggleable
- Join screen should feel optional and fast — not a gate, just an invitation to identify yourself

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-moderation-identity-and-polish*
*Context gathered: 2026-03-14*
