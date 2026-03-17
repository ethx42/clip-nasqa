# Requirements: Nasqa Live

**Defined:** 2026-03-17
**Core Value:** Real-time clipboard and Q&A with sub-200ms latency across all connected devices

## v1.3 Requirements

Requirements for v1.3 Participant & Host UX Refactor. Each maps to roadmap phases.

### Structure & Reuse

- [ ] **STRUC-01**: Shared `formatRelativeTime` utility extracted to common module
- [ ] **STRUC-02**: `useSessionMutations` hook extracted from session-shell
- [ ] **STRUC-03**: SnippetCard extracted as standalone component from clipboard panel
- [ ] **STRUC-04**: QAPanel sort logic deduplicated into shared utility
- [ ] **STRUC-05**: QuestionCard split into host and participant variants

### UX Interactions

- [ ] **UXINT-01**: Vote buttons show filled state when user has voted
- [ ] **UXINT-02**: Identity chip displays current device identity
- [ ] **UXINT-03**: Own questions visually distinguished from others

### Accessibility

- [ ] **A11Y-01**: Vote buttons use `aria-pressed` to reflect toggle state

## Future Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### Accessibility

- **A11Y-02**: ARIA tablist role on mobile tab navigation
- **A11Y-03**: aria-live region on NewContentBanner for screen reader announcements

## Out of Scope

| Feature                                | Reason                                                      |
| -------------------------------------- | ----------------------------------------------------------- |
| Full component library extraction      | Scope creep — extract only what's needed for this milestone |
| Storybook or visual regression testing | Adds tooling overhead without shipping user value           |
| WCAG AAA compliance                    | Level AA is realistic; AAA conflicts with real-time UI      |
| Mobile native patterns                 | Web-first, responsive design covers mobile                  |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase    | Status  |
| ----------- | -------- | ------- |
| STRUC-01    | Phase 11 | Pending |
| STRUC-02    | Phase 11 | Pending |
| STRUC-03    | Phase 12 | Pending |
| STRUC-04    | Phase 12 | Pending |
| STRUC-05    | Phase 12 | Pending |
| UXINT-01    | Phase 13 | Pending |
| UXINT-02    | Phase 13 | Pending |
| UXINT-03    | Phase 13 | Pending |
| A11Y-01     | Phase 13 | Pending |

**Coverage:**

- v1.3 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0

---

_Requirements defined: 2026-03-17_
_Last updated: 2026-03-17 after roadmap creation_
