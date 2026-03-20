# Phase 20: Functionality and Audience View - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver five capabilities: superuser hard delete (removes from DB), line breaks + basic markdown in Q&A text, session code in share dialog, audience section headers ("Clipboard" / "Q&A"), and collapsible Q&A drawer in audience view. No new content types or interaction models.

</domain>

<decisions>
## Implementation Decisions

### Hard delete behavior

- Hard delete removes records from DynamoDB permanently (not soft-delete)
- Applies to questions, replies, AND snippets — all content types
- Cascade: deleting a question also deletes all its replies from DB
- Lives in the overflow menu (... popover) alongside Focus/Ban — destructive action tucked away
- Existing soft-delete (ban/hide) remains as separate reversible moderation action
- Confirmation dialog reuses existing delete dialog pattern (same visual style)
- Real-time: item instantly disappears from all participants' feeds — no tombstone, no fade
- Broadcast via existing subscription channel

### Line breaks & text formatting

- Basic markdown: line breaks, **bold**, _italic_, `inline code`, links
- No headings, lists, or block-level formatting
- Applies to both questions AND replies — consistent formatting everywhere
- No formatting hints in the textarea — clean input, power users discover markdown naturally
- Rendering uses a lightweight markdown parser (not full remark/rehype)

### Share dialog session code

- 6-digit code displayed as a large mono-spaced copyable chip
- Positioned prominently above the QR code and share link
- Copy button on the chip for one-tap copying
- Voice-friendly display (large, clear digits)

### Audience section headers

- "Clipboard" and "Q&A" headings visible in audience/participant view
- Always visible without any interaction required

### Collapsible Q&A drawer

- Expanded by default (current layout behavior preserved)
- User can collapse Q&A to give clipboard more space
- Collapse affordance: section header with chevron toggle
- Collapsed state shows count badge ("12 questions") in the header
- Clipboard expands to fill the vacated vertical space
- Collapse state is client-side only (not persisted)

### Claude's Discretion

- Markdown parser library choice (lightweight, no full AST)
- Hard delete Server Action implementation details
- Section header typography and spacing
- Collapse animation timing and easing
- Mobile responsive behavior for collapsible drawer

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches matching the existing design system.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

_Phase: 20-functionality-and-audience-view_
_Context gathered: 2026-03-20_
