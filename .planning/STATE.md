# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-13)

**Core value:** Real-time clipboard and Q&A with sub-200ms latency across all connected devices — if the audience can't see what the speaker shares instantly, the product fails
**Current focus:** Phase 4 - Moderation and Polish

## Current Position

Phase: 4 of 4 (Moderation and Polish)
Plan: 2 of 3 in current phase — COMPLETE
Status: In Progress
Last activity: 2026-03-14 — 04-02 complete (i18n routing with persistent cookie, language switcher, complete en/es/pt translations, useIdentity hook, JoinModal, IdentityEditor)

Progress: [█████████▒] 93% (Phase 4 plan 2/3)

## Performance Metrics

**Velocity:**
- Total plans completed: 2
- Average duration: 5 min
- Total execution time: 0.17 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-infrastructure | 2 | 10 min | 5 min |
| 02-session-and-view-shell | 2 | 5 min | 2.5 min |

**Recent Trend:**
- Last 5 plans: 01-01 (8 min), 01-02 (2 min), 02-01 (3 min), 02-02 (2 min)
- Trend: stable

*Updated after each plan completion*
| Phase 01-infrastructure P03 | 1 | 1 tasks | 0 files |
| Phase 02-session-and-view-shell P01 | 3 | 2 tasks | 13 files |
| Phase 02-session-and-view-shell P02 | 2 | 2 tasks | 5 files |
| Phase 02-session-and-view-shell P03 | 15 | 3 tasks | 8 files |
| Phase 03-real-time-core P01 | 3 | 2 tasks | 9 files |
| Phase 03-real-time-core P03 | 5 | 2 tasks | 7 files |
| Phase 03-real-time-core P02 | 5min | 2 tasks | 10 files |
| Phase 03-real-time-core P04 | 4min | 2 tasks | 12 files |
| Phase 03-real-time-core P05 | 6min | 2 tasks | 8 files |
| Phase 03-real-time-core P06 | human-verify | 1 tasks | 4 files |
| Phase 04-moderation-identity-and-polish P01 | 3 min | 2 tasks | 8 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Single-table DynamoDB with ULID sort keys — no GSIs in v1
- Single AppSync union-type subscription channel per session — enforced server-side session isolation
- Device fingerprint via localStorage UUID — avoids shared-WiFi false positives with IP tracking
- Host secret stored only as SHA-256 hash; raw secret passed once in URL hash fragment
- Tagged union SessionUpdate {eventType, sessionSlug, payload: AWSJSON} over native GraphQL union — AppSync native union in subscriptions is inconsistent
- Subscription @aws_subscribe(mutations: ["_stub"]) placeholder allows schema to compile before real mutations exist in Phase 3
- DynamoDB item interfaces (SessionItem etc.) separated from application interfaces (Session etc.) — keeps resolver output clean of PK/SK internals
- NONE data source for subscription resolver — setSubscriptionFilter handles session isolation without backing resource
- Removed rootDir from functions tsconfig to allow cross-package @nasqa/core imports in monorepo
- npm run deploy enforces lint + typecheck + AWS_REGION=us-east-1 before any sst deploy call
- [Phase 01-infrastructure]: AWS credentials must be configured before deploy can proceed (auth gate)
- [Phase 02-session-and-view-shell Plan 01]: ThemeProvider must be in providers.tsx client wrapper — RSC root layouts cannot use hooks
- [Phase 02-session-and-view-shell Plan 01]: useSyncExternalStore pattern for mounted state (avoids react-hooks/set-state-in-effect)
- [Phase 02-session-and-view-shell Plan 01]: NasqaSite Nextjs SST resource linked to DynamoDB table (siteUrl in sst outputs)
- [Phase 02-session-and-view-shell Plan 02]: redirect() called outside try/catch in createSession — NEXT_REDIRECT must not be swallowed
- [Phase 02-session-and-view-shell Plan 02]: ConditionalCheckFailedException imported from @aws-sdk/client-dynamodb for correct instanceof check
- [Phase 02-session-and-view-shell Plan 02]: tableName() reads SST_NasqaTable_name first, then NASQA_TABLE_NAME, then 'NasqaTable'
- [Phase 02-session-and-view-shell Plan 03]: QRCodeDisplay generates SVG server-side via qrcode package — no client-side canvas bundle cost
- [Phase 02-session-and-view-shell Plan 03]: SessionShell is Client Component for mobile tab state; ClipboardPanel/QAPanel are Server Components passed as slots
- [Phase 02-session-and-view-shell Plan 03]: Host secret shown once on success page only; page warns it won't be shown again
- [Phase 02-session-and-view-shell Plan 03]: QR code rendered persistently in host view toolbar for projecting during talks
- [Phase 03-real-time-core Plan 01]: Lambda resolver dispatches via switch on fieldName, casts arguments through any (Record<string,unknown> to specific interface requires intermediate cast)
- [Phase 03-real-time-core Plan 01]: aws-amplify full package installed for Amplify.configure SSR mode (ssr:true) — @aws-amplify/api-graphql alone does not expose this
- [Phase 03-real-time-core Plan 01]: GraphQL strings as plain constants (not codegen) — simpler, sufficient for this project scale
- [Phase 03-real-time-core Plan 01]: voters stored as DynamoDB Set, conditional expression prevents duplicate votes via contains/NOT contains
- [Phase 03-real-time-core]: QAPanel passes stub empty arrays to page routes — Plan 04 SubscriptionProvider will provide real data
- [Phase 03-real-time-core]: focused state uses static emerald glow shadow (replaced animate-pulse) — auto-expands reply thread when isFocused
- [Phase 03-real-time-core]: ShikiBlock is async RSC with no use client — Shiki stays out of client bundle entirely; renderHighlight Server Action provides live preview to HostInput
- [Phase 03-real-time-core]: ClipboardPanel is Client Component with inline HeroCard/HistoryCard sub-components — async RSC children cannot be used inside Client Components
- [Phase 03-real-time-core Plan 04]: useReducer for session state — single dispatch point avoids stale closure issues with subscription callbacks
- [Phase 03-real-time-core Plan 04]: AppSync subscription payload is AWSJSON (serialized string) — JSON.parse(payload) required in useSessionUpdates
- [Phase 03-real-time-core Plan 04]: Host secret read from window.location.hash on mount and immediately hashed via SubtleCrypto — raw secret never stored in React state
- [Phase 03-real-time-core Plan 04]: getSessionData uses single QueryCommand (PK = SESSION#slug) partitioned by SK prefix — no GSI needed
- [Phase 03-real-time-core Plan 05]: connectionStatus returned from useSessionUpdates — co-located with subscription logic, avoids prop-drilling
- [Phase 03-real-time-core Plan 05]: lastHostActivity tracks only SNIPPET_ADDED — snippets are the primary speaker liveness signal
- [Phase 03-real-time-core Plan 05]: CLIPBOARD_CLEARED toast fires only for non-hosts — host sees their own action inline
- [Phase 03-real-time-core Plan 05]: AnimatePresence mode=popLayout on hero card — prevents exit/enter race causing layout jump
- [Phase 03-real-time-core Plan 05]: 80KB bundle target unachievable with aws-amplify subscription library (68KB gz) — documented as known constraint from Phase 3 Plan 01
- [Phase 03-real-time-core]: Removed animate-pulse from focused question pin — static emerald glow shadow is less distracting during live talks
- [Phase 03-real-time-core]: Debounced Q&A sort by 1s — prevents chaotic card movement on rapid upvotes while preserving real-time feel
- [Phase 03-real-time-core]: Switched to Poppins font with increased text sizes — improves legibility on projected screens and mobile
- [Phase 04-moderation-identity-and-polish Plan 01]: BAN item uses if_not_exists(isBanned, false) so first bannedPostCount increment does not immediately ban
- [Phase 04-moderation-identity-and-polish Plan 01]: downvoteQuestion removes from voters set atomically in same UpdateCommand — DELETE on non-existent DynamoDB set member is a no-op
- [Phase 04-moderation-identity-and-polish Plan 01]: checkNotBanned called before checkRateLimit in addQuestion — banned users get clear error rather than burning rate limit quota
- [Phase 04-moderation-identity-and-polish Plan 01]: authorName written conditionally to DynamoDB items (only if truthy) to avoid null pollution
- [Phase 04-moderation-identity-and-polish Plan 02]: next-intl createNavigation typed router used in language-switcher — locale param is type-safe
- [Phase 04-moderation-identity-and-polish Plan 02]: shouldShowJoinModal() exported utility from join-modal.tsx — session page checks sessionStorage before controlling open state
- [Phase 04-moderation-identity-and-polish Plan 02]: Email never included in setIdentity server calls — hook enforces client-only constraint (IDENT-03)
- [Phase 04-moderation-identity-and-polish Plan 02]: @base-ui/react Dialog for JoinModal (full overlay), Popover for IdentityEditor (lightweight inline trigger)

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 1: SST Ion WAF ACL attachment to AppSync is MEDIUM confidence — fallback is DynamoDB minute-bucket rate limiting (already designed)
- Phase 3: AppSync enhanced subscription filter JavaScript resolver API compatibility with SST Ion needs validation before implementing SubscriptionProvider
- Phase 4: AppSync connection/disconnection lifecycle events for connected-count tracking (needed for 50% downvote threshold) is LOW confidence — fallback is fixed downvote threshold (e.g., 5 thumbs-downs regardless of audience size)

## Session Continuity

Last session: 2026-03-14
Stopped at: Completed 04-02-PLAN.md (i18n routing, language switcher, translations, useIdentity hook, JoinModal, IdentityEditor)
Resume file: None
