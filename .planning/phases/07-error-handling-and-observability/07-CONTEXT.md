# Phase 7: Error Handling and Observability - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Branded error fallback UIs for root layout crashes, session-scoped errors, and 404/expired sessions. Structured error returns from server actions (no unhandled exceptions reaching the client). Structured JSON logging in Lambda resolvers via pino. No new features or capabilities — this phase hardens existing functionality.

</domain>

<decisions>
## Implementation Decisions

### Error page UX

- Tone and visual design: Claude's discretion — fit the existing Nasqa brand (Zinc/Emerald, clean UI)
- 404/expired session page: single page for both cases — "This session has ended or doesn't exist"
- 404 primary action: "Create a new session" CTA linking to landing page
- global-error.tsx crash recovery: clean restart only — "Try again" button reloads from scratch, no state preservation
- Session-scoped error.tsx: show error type hint ("Connection lost" vs "Server error") — not full technical details, not fully generic

### Server action error shape

- Error display: toast notifications (non-blocking), consistent with existing optimistic UI toasts from Phase 3
- Toast auto-dismisses after 5 seconds
- Error messages: localized via next-intl (en/es/pt) — consistent with rest of UI
- Error contract: messages only (no error codes) — { success: false, error: "localized message" }
- Client-side validation: prevent submit when input is invalid (disable button), server validation as safety net
- Rate limit errors: show remaining cooldown time in toast ("Too many questions. Try again in 45s")
- Rate limit UX: allow retry (don't disable input during cooldown), show toast again on each attempt
- Ban feedback: disable inputs with visible "You've been blocked from posting" message
- Current server actions: let Claude inspect current code and decide which actions need structured error wrapping

### Logging detail level

- Library: pino (user chose over console.log)
- Required fields: level, sessionSlug, operation, durationMs, timestamp (core fields only — no fingerprint/userAgent)
- Error stack traces: Claude's discretion
- Log levels for successful operations: Claude's discretion

### Crash vs expected errors

- Session error.tsx recovery strategy: Claude's discretion (reset() vs in-place reconnection)
- Client-side error reporting: prepare a reportError() stub that logs to console now but can be swapped for Sentry later (MON-01 is in Future Requirements)

### Claude's Discretion

- Error page tone and visual design (fit Zinc/Emerald brand)
- Whether error-level logs include full stack traces
- Log level strategy for successful operations (INFO vs DEBUG)
- Session error.tsx recovery approach (reset() vs reconnect in-place)
- Which existing server actions need structured error wrapping (audit current code)

</decisions>

<specifics>
## Specific Ideas

- Rate limit toast should include the actual cooldown time remaining (e.g., "Try again in 45s")
- Ban state should be visually obvious — greyed out inputs, not silent rejection
- Error type hints in session error boundary: "Connection lost" vs "Server error" level of specificity
- reportError() stub for future Sentry integration — logging to console for now

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 07-error-handling-and-observability_
_Context gathered: 2026-03-16_
