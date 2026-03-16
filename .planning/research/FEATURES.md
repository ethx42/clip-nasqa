# Feature Research

**Domain:** Real-time audience participation Q&A — UX refactor (participant & host, Nasqa Live v1.3)
**Researched:** 2026-03-16
**Confidence:** MEDIUM — Competitor internals (Slido, Vevox, Pigeonhole, Mentimeter) are not publicly documented at interaction-design granularity. Patterns derived from official help documentation, community forums, and UX literature. Core findings corroborated across multiple sources. Implementation specifics against the existing codebase are HIGH confidence (components read directly).

---

## Context: Scope of This Refactor

This research supports v1.3: a structural and interaction-quality refactor of already-shipped session pages. The question is not "will we build this?" but rather "what interaction quality does the ecosystem demand, and what separates good from great in this domain?"

Existing components studied in full: `SessionShell`, `ClipboardPanel`, `QAPanel`, `QuestionCard`, `QAInput`, `IdentityEditor`, `SessionLiveHostPage` (270-line orchestrator), `ReplyList`, `NewContentBanner`, `PixelAvatar`.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in any live Q&A tool. Missing these = product feels broken or amateur.

| Feature                                                       | Why Expected                                                                                                                                                                                                                                                                              | Complexity | Existing State                                                                                                                                                                                   | Notes                                                                                                                                                                                                    |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vote button active-state color fill                           | Every upvote system (Reddit, Stack Overflow, Slido) visually fills or highlights the button when the user has voted. An icon that only changes hue without fill or scale feedback reads as unresponsive.                                                                                  | LOW        | Partial — icon turns emerald on vote, but no background fill, no press animation                                                                                                                 | Need `active:scale-95` press animation + filled icon background when in voted state                                                                                                                      |
| Mutual-exclusion vote visual feedback with transition         | When upvote is active and user clicks downvote, the upvote must visually clear in the same gesture. Logic already exists; the missing piece is a smooth color transition on the swap so it reads as intentional, not glitchy.                                                             | LOW        | Logic correct; swap is instant but has no animated transition                                                                                                                                    | Add `transition-all duration-150` to vote button class so the color/fill swap animates                                                                                                                   |
| "You" / own-question structural indicator                     | Slido shows "Waiting for review" on your own moderated questions; Vevox shows the participant's profile icon next to their own comments. Users need to locate their own contribution spatially in the feed — not just by text color.                                                      | LOW        | Partial — author name renders as "You" in emerald text. No structural left-border or other spatial signal.                                                                                       | Add a left-border or accent strip to own-question cards so ownership reads at a glance, not just by reading the name                                                                                     |
| Identity chip at the submission point                         | Participants need to know what name will appear on their question before posting. Discovering they posted anonymously after the fact (when they wanted a name attached) is a persistent frustration in Q&A tools.                                                                         | MEDIUM     | Missing — `QAInput` has no identity display. `IdentityEditor` is only reachable from the header, two taps away from the input.                                                                   | Add avatar + truncated name chip inline in `QAInput`; clicking the chip opens `IdentityEditor` popover                                                                                                   |
| Contextual empty state copy                                   | NNGroup guideline: empty states must communicate system status AND provide a learning cue AND enable a direct action. A generic muted icon with "No questions yet" leaves participants unsure whether they should wait, refresh, or act.                                                  | LOW        | Partial — `QAPanel` has generic `noQuestions` key. `ClipboardPanel` already has connection-aware copy ("Speaker is live" vs "Waiting for speaker"). QAPanel does not receive `connectionStatus`. | QAPanel empty state should be connection-aware. Participant view (connected): "Be the first to ask — questions appear here in real time". Host view: "No questions yet — share the link to get started". |
| Replies collapsed by default (focused question auto-expanded) | GetStream research on livestream chat UX: always-visible replies dominate the viewport and kill conversational flow in live events. Collapsed-by-default is the universal pattern. The focused question is the exception — it is the "current topic" and should show replies immediately. | LOW        | Mostly correct — `showReplies` defaults to `question.isFocused`. But if `isFocused` changes while the card is already mounted, the local `showReplies` state does not follow the prop change.    | Fix the stale-state bug with a `useEffect` that syncs `showReplies` whenever `isFocused` changes                                                                                                         |
| ARIA semantics for mobile tab bar                             | Mobile tab bar uses plain `<button>` elements with no `role="tablist"` / `role="tab"` / `aria-selected`. Screen readers announce them as buttons without panel context; keyboard users cannot navigate tabs correctly per WCAG 4.1.2.                                                     | LOW        | Missing — `SessionShell` tab bar has no ARIA tablist semantics                                                                                                                                   | Wrap tabs in `role="tablist"`, set `role="tab"` and `aria-selected` on each button, associate panels with `aria-controls` / `id`                                                                         |
| `aria-live` on new-content banner                             | Screen reader users do not hear the "N new questions" banner when it appears while they are reading the list. This is a polite live region announcement — universally expected in any real-time feed UI.                                                                                  | LOW        | Missing — `NewContentBanner` has no `aria-live` attribute                                                                                                                                        | Add `aria-live="polite"` and `aria-atomic="true"` to the banner container                                                                                                                                |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required by convention, but valued when present and not found in comparable tools.

| Feature                                                     | Value Proposition                                                                                                                                                                                                                                                         | Complexity | Existing State                                                                            | Notes                                                                                                               |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Vote button press micro-animation (`active:scale-95`)       | Slido, Vevox, Pigeonhole all have static vote buttons with no tactile press feedback. A subtle scale-down + color fill on press makes voting feel satisfying and responsive — it differentiates on perceived quality without adding any bundle weight.                    | LOW        | Missing — vote buttons have `transition-colors hover:bg-accent` but no `active:` state    | Add `active:scale-95 transition-transform` to both upvote and downvote buttons                                      |
| Separate upvote and downvote counts displayed independently | Slido hides downvotes inside a combined net score by default; showing both separately ("5 up / 2 down") is behind a Labs feature flag. Transparent dual-count display lets participants understand community sentiment more completely.                                   | LOW        | Already exists — both counts shown in the vote column                                     | No change needed; protect from regression during refactor                                                           |
| Speaker reply visual distinction (emerald border + badge)   | Vimeo allows host replies and distinguishes them with styling; Microsoft Teams distinguishes "Organizer" posting. Most audience Q&A tools do not distinguish host replies at all. The emerald border + "Speaker" badge differentiates Nasqa on host reply signal clarity. | LOW        | Exists — `ReplyList` uses emerald border + "Speaker" badge                                | Protect from regression. No behavior change.                                                                        |
| Focused question pulsing glow                               | No surveyed competitor shows a "currently active / speaker is addressing this" visual state on a specific question card. The emerald glow distinguishes the live moment in a way that is genuinely useful for large sessions.                                             | LOW        | Exists — `ring-2 ring-emerald-500/50 shadow-[0_0_12px...]` is static. No pulse animation. | Optionally add a slow `animate-pulse` on the ring, or leave static glow. Low priority; current state is functional. |
| Debounced question re-sorting (sort stabilization)          | Vote spikes during live sessions cause "musical chairs" — cards jump positions with every vote, breaking reading flow. A 1-second debounce on sort order (while showing latest counts immediately) is not a pattern found in any surveyed competitor.                     | MEDIUM     | Exists — `debouncedQuestions` logic in `QAPanel`. Correct behavior.                       | Protect from regression. Do not remove during QAPanel refactor.                                                     |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature                                          | Why Requested                                           | Why Problematic                                                                                                                                                                                                                                                                              | Alternative                                                                                                 |
| ------------------------------------------------ | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Multi-level reply threading                      | Users expect Discord/Slack-style nested replies         | One additional level adds meaningful complexity to the DynamoDB schema (REPLY# of REPLY#), significantly increases rendering complexity, and kills conversational momentum in a live presentation context (GetStream research is unambiguous). Out of scope for v1.3 and likely permanently. | One-level threading is the correct scope for real-time Q&A. Host replies auto-expand for focused questions. |
| Emoji reactions on vote buttons                  | Feels expressive; Slack does it                         | v1.2 is the correct scope for emoji reactions. Adding them during a structural refactor conflates two concerns, risks violating the 80kB bundle budget, and requires DynamoDB schema changes.                                                                                                | Defer to v1.2.                                                                                              |
| Real-time animated card reordering on every vote | "Show winning questions rising" feels engaging          | Causes layout thrash and reading disruption. If you are reading a question and it jumps position mid-read, you lose your place. Slido, notably, debounces sort updates for this exact reason.                                                                                                | The existing 1-second debounce with Framer Motion `layout` transitions is the correct pattern.              |
| Persistent identity / user accounts              | "I want my history"                                     | Directly contradicts the no-accounts, ephemeral-by-design core value. All data TTLs in 24 hours.                                                                                                                                                                                             | localStorage-based optional name/email via `IdentityEditor` is the correct ceiling.                         |
| Dedicated "My Questions" tab                     | Vevox-style filter to own questions                     | At 50–500 participants, the Q&A list is manageable without a separate tab. A tab adds navigation complexity, needs an additional route or state layer, and solves a problem that a left-border + "You" label already solves at zero navigation cost.                                         | Structural own-question indicator (left-border + "You" label) is sufficient.                                |
| Upvote count preview on submission input         | "Show how many upvotes my question has before it posts" | No competitor does this; creates false urgency before submission; the optimistic card insertion with `upvoteCount: 0` is the correct model — the question appears immediately and counts start from zero honestly.                                                                           | Optimistic card insertion with `upvoteCount: 0` is the right pattern.                                       |

---

## Feature Dependencies

```
[Vote button active-state fill + animation]
    └──requires──> votedQuestionIds Set prop — already wired into QuestionCard

[Identity chip in QAInput]
    └──requires──> useIdentity hook — already exists
    └──requires──> IdentityEditor popover — already exists
    └──enhances──> [Own question indicator] (name at submission = name on card)

[Contextual QAPanel empty state]
    └──requires──> connectionStatus prop — NOT currently passed to QAPanel
                   (only passed to ClipboardPanel)
    └──blocks──> connection-aware copy until prop is threaded through

[Auto-expand replies on isFocused change]
    └──requires──> useEffect sync of local showReplies state to isFocused prop changes
    └──fixes──> stale-state bug in current QuestionCard

[ARIA tablist semantics]
    └──requires──> no new props; pure markup change in SessionShell
    └──requires──> panel elements assigned id attributes for aria-controls

[aria-live on NewContentBanner]
    └──requires──> no new props; pure markup change in NewContentBanner

[QuestionCard state variant extraction]
    └──no behavior change — internal refactor only
    └──enhances──> testability; each variant becomes independently testable

[useSessionMutations hook extraction]
    └──requires──> SessionLiveHostPage (currently 270-line God Orchestrator)
    └──unblocks──> all mutation-related unit tests (handlers are currently anonymous closures)
    └──no behavior change

[formatRelativeTime deduplication]
    └──currently duplicated in: ClipboardPanel (inline), QuestionCard (inline)
    └──extract to: packages/frontend/src/lib/format-time.ts
    └──no behavior change

[Remove duplicate sort from QAPanel]
    └──requires──> caller (SessionLiveHostPage) to pass pre-sorted questions
    └──QAPanel owns only debounced visual stability (debounce remains)
    └──simplifies QAPanel props contract
```

### Dependency Notes

- **`connectionStatus` not wired to QAPanel:** `ClipboardPanel` receives `connectionStatus` from `SessionLiveHostPage`; `QAPanel` does not. Adding contextual empty-state copy to QAPanel requires threading this prop. It is a one-line prop addition in both `QAPanel` and `SessionLiveHostPage`. Do this early — it unblocks the empty-state copy.
- **`useSessionMutations` extraction is the highest-value structural change:** All mutation handlers in `SessionLiveHostPage` are anonymous async closures that are impossible to test in isolation. Extracting them to a named hook with a stable interface is the prerequisite for any mutation-level unit tests. It does not change observable behavior.
- **Identity chip and own-question indicator are independent but complementary:** The chip solves "before posting" identity awareness; the left-border solves "after posting" ownership recognition. Both use `useIdentity` as their data source. They can be built independently.
- **Reply auto-expand fix is a bug fix, not a feature:** If a question gains focus while the QuestionCard is already mounted, `showReplies` stays false (it initialized to `question.isFocused` at mount time only). A `useEffect` syncing the local state to the prop is the minimal fix.

---

## MVP Definition (for v1.3 Refactor)

### Must Ship (blocking quality and accessibility bar)

- [ ] Vote button `active:scale-95` press animation + visual fill on voted state — interaction honesty baseline
- [ ] Identity chip inside `QAInput` (avatar + name, click to edit) — participants must know posting identity before posting
- [ ] Auto-expand replies when `isFocused` prop changes while card is mounted — bug fix, not a feature
- [ ] ARIA tablist semantics on `SessionShell` mobile tab bar — accessibility baseline
- [ ] `aria-live` on `NewContentBanner` — screen reader accessibility

### Ship After Core (high value, low risk)

- [ ] Thread `connectionStatus` to `QAPanel` and implement contextual empty state copy (participant vs host variant)
- [ ] Own question left-border structural indicator (color alone is insufficient for spatial recognition)
- [ ] Extract `useSessionMutations` hook from `SessionLiveHostPage`
- [ ] Extract `QuestionCard` state variants (normal / hidden / banned) into separate small components
- [ ] Extract shared `formatRelativeTime` utility (currently duplicated in `ClipboardPanel` and `QuestionCard`)
- [ ] Remove duplicate sort logic from `QAPanel` (accept pre-sorted; retain debounce)

### Defer to Future Milestones

- [ ] Emoji reactions — v1.2 scope, do not conflate with v1.3 structural refactor
- [ ] Multi-level reply threading — permanently out of scope for this product
- [ ] Animated per-vote card reordering — anti-feature
- [ ] "My Questions" tab — anti-feature at current scale

---

## Feature Prioritization Matrix

| Feature                                             | User Value           | Implementation Cost | Priority |
| --------------------------------------------------- | -------------------- | ------------------- | -------- |
| Vote button active-state fill + press animation     | HIGH                 | LOW                 | P1       |
| Identity chip in QAInput                            | HIGH                 | MEDIUM              | P1       |
| ARIA tablist semantics                              | HIGH (a11y)          | LOW                 | P1       |
| `aria-live` on NewContentBanner                     | HIGH (a11y)          | LOW                 | P1       |
| Auto-expand replies on `isFocused` change (bug fix) | MEDIUM               | LOW                 | P1       |
| Contextual QAPanel empty state                      | MEDIUM               | LOW                 | P2       |
| Own question left-border indicator                  | MEDIUM               | LOW                 | P2       |
| `useSessionMutations` hook extraction               | LOW (DX/testability) | MEDIUM              | P2       |
| `QuestionCard` state variant extraction             | LOW (DX/testability) | MEDIUM              | P2       |
| `formatRelativeTime` deduplication                  | LOW (DX)             | LOW                 | P2       |
| Remove duplicate sort from QAPanel                  | LOW (DX)             | MEDIUM              | P2       |
| Focused question pulsing glow animation             | LOW                  | LOW                 | P3       |

**Priority key:**

- P1: Must have for this milestone
- P2: Should have; add after P1 items are complete
- P3: Nice to have; future consideration

---

## Competitor Feature Analysis

| Interaction Pattern              | Slido                                                        | Vevox                                                           | Pigeonhole Live                                    | Mentimeter                          | Nasqa Live (current)                                            | Nasqa Live (v1.3 target)                                                                                                               |
| -------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Vote button active state         | Color fill on voted (standard)                               | Vote button visually highlighted when active                    | Upvote count increments; no documented button fill | N/A (no participant upvotes in Q&A) | Icon color changes to emerald; no fill or scale                 | Filled icon + emerald background fill + `active:scale-95` press animation                                                              |
| Upvote/downvote mutual exclusion | Yes — switching removes prior vote                           | Yes (per 2024 update adding optional downvotes)                 | Upvote only                                        | Upvote only, no downvote            | Yes — logic correct; no animated transition on swap             | Add `transition-all duration-150` to make the swap visually smooth                                                                     |
| Score display                    | Combined net score by default; separate counts via Labs flag | Combined by default                                             | Upvote count only                                  | N/A                                 | Separate upvote + downvote counts (already differentiated)      | Protect from regression; keep separate                                                                                                 |
| Own question indicator           | "Waiting for review" label in moderated sessions             | Profile icon next to own comment                                | Not documented                                     | Not visible to participant          | "You" in emerald text in author row                             | "You" + left-border accent strip for spatial recognition                                                                               |
| Identity at submission point     | No inline chip; anonymous by default                         | Name shown in Q&A board after submission                        | Not documented                                     | Anonymous only                      | No identity chip in input field                                 | Identity chip (pixel avatar + name) inline in `QAInput`; click to open `IdentityEditor`                                                |
| Reply threading visibility       | No threading in core Q&A (comment feature separate)          | Replies visible; participant-to-participant replies not allowed | Comments visible                                   | Not available                       | Collapsed by default; auto-expand for focused question at mount | Same — plus fix stale-state: sync `showReplies` to `isFocused` prop changes                                                            |
| Empty state (no questions)       | Not publicly documented                                      | Not publicly documented                                         | Not publicly documented                            | Not publicly documented             | Generic icon + "no questions" key string                        | Connection-aware: "Be the first to ask" (participant, connected) / "Waiting for connection" (disconnected) / "No questions yet" (host) |
| Host reply distinction           | Host answers verbally; no in-thread reply UI                 | Moderator answers visible; no visual badge                      | Not documented                                     | N/A                                 | Emerald border + "Speaker" badge on host replies                | Protect from regression; no change                                                                                                     |
| Tab bar accessibility            | Not applicable (single panel)                                | Not applicable                                                  | Not applicable                                     | Not applicable                      | `<button>` elements, no ARIA tablist semantics                  | `role="tablist"` + `role="tab"` + `aria-selected` + `aria-controls`                                                                    |
| Live region for new content      | Not applicable                                               | Not applicable                                                  | Not applicable                                     | Not applicable                      | `NewContentBanner` has no `aria-live`                           | `aria-live="polite"` + `aria-atomic="true"` on banner container                                                                        |

---

## Sources

- Slido community — downvote display: https://community.slido.com/audience-q-a-42/enable-downvotes-for-your-q-a-440 (MEDIUM confidence — help article, no interaction screenshots)
- Slido new interface feature continuity: https://community.slido.com/new-slido-interface-125/new-slido-interface-feature-continuity-3845 (MEDIUM)
- Slido Q&A features page: https://www.slido.com/features-live-qa (MEDIUM — marketing copy)
- Mentimeter Q&A audience perspective: https://help.mentimeter.com/en/articles/1501608-questions-from-audience-the-audience-perspective (MEDIUM — confirms anonymous model, no ownership indicator)
- Vevox upvotes and downvotes in Q&A board: https://help.vevox.com/hc/en-us/articles/21397841414941 (MEDIUM — 403 on direct fetch; confirmed by search result snippet)
- Vevox participant user manual (profile icon ownership): https://help.vevox.com/hc/en-us/articles/360014327757-Participant-user-manual (MEDIUM)
- Pigeonhole Live Q&A features: https://pigeonholelive.com/features-qna/ (LOW — marketing page, no UX detail)
- GetStream — livestream chat threading UX: https://getstream.io/blog/exploring-livestream-chat-ux-threads-and-replies/ (HIGH — engineering blog with design rationale)
- Nielsen Norman Group — empty state design: https://www.nngroup.com/articles/empty-state-interface-design/ (HIGH — authoritative UX research)
- UI Patterns — Vote to Promote: https://ui-patterns.com/patterns/VoteToPromote (MEDIUM — design pattern library)
- Vevox product update September 2024: https://www.vevox.com/blog/vevox-product-update-september-2024 (MEDIUM — confirms optional downvotes added)

---

_Feature research for: Nasqa Live v1.3 participant & host UX refactor_
_Researched: 2026-03-16_
