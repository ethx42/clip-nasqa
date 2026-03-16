# Pitfalls Research

**Domain:** Real-time React component refactoring (v1.3 participant & host UX refactor)
**Researched:** 2026-03-16
**Confidence:** HIGH — findings grounded in direct codebase inspection (all component files read) plus verification against official React docs, Motion docs, and WAI-ARIA APG.

---

## Critical Pitfalls

### Pitfall 1: AnimatePresence Breaks When the Keyed Wrapper Moves Inside an Extracted Component

**What goes wrong:**
`AnimatePresence` tracks child mounts/unmounts by the `key` prop on its **immediate** children. In `qa-panel.tsx`, each `motion.div` wraps a `QuestionCard` and holds the question ID as the key. If the refactor moves `QuestionCard` into state-specific variants (normal, banned, hidden) and any variant component returns its own outer wrapper, while the `motion.div` is moved inside those variants or eliminated in favor of them, the exit animation stops working silently. Items disappear instantly instead of fading out with the configured `exit={{ opacity: 0, height: 0 }}`.

Current risk zone — `qa-panel.tsx` lines 141–173:

```tsx
<AnimatePresence initial={false}>
  {sortedQuestions.map((question) => (
    <motion.div       // key must stay HERE, on the direct child of AnimatePresence
      key={question.id}
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
    >
      <QuestionCard ... />
    </motion.div>
  ))}
</AnimatePresence>
```

If `QuestionCard` is split into `NormalQuestionCard`, `BannedQuestionCard`, `HiddenQuestionCard` and the switch logic is moved inside the map callback, the `motion.div` wrapper must remain in `QAPanel`, not be absorbed into the variant components.

**Why it happens:**
Developers decomposing a large render block pull inner JSX into new sub-components. It is tempting to put the `motion.div` wrapper inside each variant so it "owns" its animation. The rule that `AnimatePresence` needs keys on its **direct children** is non-obvious when reading extracted code.

React Fragment wrappers compound this: if an extracted component returns `<>...</>`, React does not propagate the `key` prop into Fragment, breaking AnimatePresence's identity tracking entirely.

**How to avoid:**
Keep the `motion.div key={question.id}` permanently in `QAPanel`. Variants are pure presentation components; the animated wrapper is layout infrastructure that lives in the list owner. The rule: whichever component owns the `AnimatePresence` owns the keyed wrappers.

When `layout` prop is needed alongside exit animations (reordering the list on vote changes), wrap the whole list in `<LayoutGroup>` to ensure sibling cards outside the exiting item also animate their layout change.

**Warning signs:**

- Questions transition from normal to banned state: the card disappears instantly (pop) instead of fading out.
- Snippets deleted by the host vanish without the height collapse animation.
- Layout jumps immediately on card removal (missing LayoutGroup when layout prop is present).
- Console shows no error — animation failure is silent.

**Phase to address:** Component extraction phase — whichever phase splits `QuestionCard` into state-specific variants and extracts `SnippetCard` to its own file.

---

### Pitfall 2: Stale Closure in Extracted `useSessionMutations` Captures Wrong State for Rollback

**What goes wrong:**
Both `SessionLivePage` and `SessionLiveHostPage` define `handleDownvote` as a plain `async function` inside the component body, closing over the live `state` from `useSessionState`. The rollback calculation reads current question data:

```typescript
// In SessionLiveHostPage — identical copy exists in SessionLivePage
const q = state.questions.find((q) => q.id === questionId);
return remove ? Math.max(0, q.downvoteCount - 1) : q.downvoteCount + 1;
```

When this handler is extracted to a `useSessionMutations` hook and wrapped in `useCallback`, `state` is captured at the time `useCallback` memoizes the function. If `state` is omitted from the dependency array (common, to avoid rebuilding callbacks on every render), the rollback calculation uses the downvote count from the render when the callback was first created — not the render when the action is actually executed. In a real-time session where subscription events continuously update counts, this produces rollbacks that set counts to wrong values.

**Why it happens:**
Developers correctly know that `dispatch` is stable and can be omitted from deps. By analogy they omit `state`, not realizing that `dispatch` is special (React guarantees its identity) while `state` is a plain object that changes on every reducer dispatch.

**How to avoid:**

Option A (preferred) — move rollback computation into the reducer so it always has current state:

```typescript
// New action type: let the reducer compute rollback from its own state
dispatch({ type: "DOWNVOTE_ROLLBACK", payload: { questionId, wasRemoving: remove } });
// Inside sessionReducer, case "DOWNVOTE_ROLLBACK":
//   reads state.questions.find(...) on the current state at dispatch time
```

Option B — use a `stateRef` that the hook reads instead of closing over `state`:

```typescript
const stateRef = useRef(state);
useLayoutEffect(() => {
  stateRef.current = state;
});
// Handlers read stateRef.current.questions.find(...) — always current
```

Option C — React 19's `useEffectEvent` (stable in React 19.2): wrap the rollback calculation in a `useEffectEvent` callback that reads the latest `state` without being a reactive dependency.

Do NOT solve this by including `state` in `useCallback` dependencies — that rebuilds all handlers on every reducer dispatch, causing all `QuestionCard` children to re-render on every vote from any participant.

**Warning signs:**

- Downvote rollback after a server error sets the count to 0 or a value from a previous render.
- Unit test for rollback passes when run in isolation (single mutation), fails when run after prior mutations have changed state.
- Double vote: optimistic +1 applied, network error triggers rollback, rollback uses stale count producing net -1 instead of 0.

**Phase to address:** `useSessionMutations` hook extraction phase (the 270-line orchestrator → 40-line composition root refactor).

---

### Pitfall 3: `aria-live` Announcement Storms Under High Real-Time Load

**What goes wrong:**
Adding `aria-live` to `NewContentBanner` (planned in v1.3) in a session with 50+ active participants causes screen readers to queue dozens of sequential announcements. NVDA and JAWS do not debounce `aria-live="polite"` regions — they announce every DOM text change the moment the user is idle. Questions arriving at 2–5 per second produce "3 new questions… 4 new questions… 5 new questions…" as a continuous stream the screen reader cannot escape.

The `NewContentBanner` in `new-content-banner.tsx` currently has no ARIA annotation. If `aria-live` is placed directly on the banner element that shows/hides, there is a second problem: `if (!visible) return null` unmounts the DOM node. Screen readers track live regions by DOM node identity — unmounting and remounting the node resets the listener, causing the first announcement after remount to be silently dropped.

**Why it happens:**
Developers add `aria-live` to the most visible element (the banner itself) and tie the region's presence to the banner's `visible` prop. This conflates the visual component lifecycle with the accessibility announcement lifecycle, which must be independent.

**How to avoid:**
Separate visual state from announcement state. Keep a permanently-mounted, visually-hidden `aria-live` region in a parent component (or layout root), and debounce the string written to it:

```tsx
// In QAPanel or SessionShell — always mounted, always invisible
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {debouncedAnnouncement}
</div>;

// debouncedAnnouncement: updated at most every 2s from newQuestionCount
const [debouncedAnnouncement, setDebouncedAnnouncement] = useState("");
useEffect(() => {
  if (newQuestionCount === 0) return;
  const id = setTimeout(
    () => setDebouncedAnnouncement(t("newQuestionBanner", { count: newQuestionCount })),
    2000,
  );
  return () => clearTimeout(id);
}, [newQuestionCount, t]);
```

The visual `NewContentBanner` continues to update immediately. The `aria-live` region updates at most every 2 seconds regardless of how many questions arrive.

**Warning signs:**

- NVDA or VoiceOver testing during active sessions produces continuous speech that cannot be interrupted.
- `aria-live` is on an element that conditionally returns `null`.
- Multiple `aria-live` regions in the component tree (each one announces independently).

**Phase to address:** Accessibility pass phase — the ARIA `aria-live` on NewContentBanner and `role="tablist"` on SessionShell are planned together in v1.3.

---

### Pitfall 4: Memoizing `QuestionCard` Without Stabilizing Callback Props Wastes the Optimization

**What goes wrong:**
The v1.3 plan includes memoizing the `repliesByQuestion` grouping. But `QAPanel` rebuilds the `repliesByQuestion` Map inline on every render:

```typescript
// qa-panel.tsx — rebuilt on every render, new reference every time
const repliesByQuestion = new Map<string, Reply[]>();
for (const reply of replies) {
  const existing = repliesByQuestion.get(reply.questionId) ?? [];
  existing.push(reply);
  repliesByQuestion.set(reply.questionId, existing);
}
```

Even after wrapping `QuestionCard` in `React.memo`, it will re-render on every parent render because the callback props (`onUpvote`, `onDownvote`, `onReply`, `onFocus`, `onBanQuestion`, `onBanParticipant`, `onRestore`) are recreated as new function references on every render of `SessionLiveHostPage` / `SessionLivePage`. `React.memo` shallow-compares props — a new function reference always fails the comparison, making the `memo` wrapper have zero effect.

In a session with 50 questions, every subscription event that updates any state (a single vote from another participant) causes all 50 `QuestionCard` instances to re-render unnecessarily.

**Why it happens:**
Developers apply `React.memo` to the component and `useMemo` to data, but forget that callback props are part of the props object that `memo` compares. The optimization appears correct in code review but has no runtime effect.

**How to avoid:**
All three must be done together to achieve the optimization:

1. `React.memo` on `QuestionCard`.
2. `useMemo` for `repliesByQuestion` in `QAPanel` (dependency: `[replies]`).
3. `useCallback` for every handler prop passed to `QuestionCard`, with correct dependencies.

For handlers in `useSessionMutations`, the stable-dispatch pattern means `dispatch` can stay in deps without causing rebuilds. The problematic deps are `state` (see Pitfall 2) and `fingerprint` (changes only on first load from localStorage). Fingerprint should be read via ref inside callbacks if it causes unnecessary rebuilds.

**Warning signs:**

- React DevTools Profiler: a single vote event highlights all 50 `QuestionCard` components as re-rendered, not just the one whose data changed.
- Frame drops during active voting visible in Chrome DevTools Performance tab.
- Adding `React.memo` to `QuestionCard` has no visible effect in the profiler (memos always miss).

**Phase to address:** QuestionCard extraction and memoization — must be done as one atomic phase. Partial application (memo without useCallback, or useCallback without memo) produces no benefit.

---

### Pitfall 5: Mobile Tab Switch Unmounts the Inactive Panel, Losing Scroll Position and Local State

**What goes wrong:**
`SessionShell` on mobile renders:

```tsx
{
  activeTab === "clipboard" ? clipboardSlot : qaSlot;
}
```

Switching tabs unmounts the inactive panel completely. `QAPanel` holds non-trivial local state: `showNewBanner`, `newQuestionCount`, `debouncedQuestions`, and a `scrollContainerRef`. When the user switches to Clipboard and back to Q&A, all of this resets. The scroll position is lost — if the user had scrolled through 20 questions and found one to reply to, they are returned to the top. Worse, if a `QuestionCard` had an open reply textarea, the text they typed is gone.

Adding ARIA `role="tablist"` / `role="tab"` / `role="tabpanel"` to the current buttons also requires both tabpanels to be present in the DOM simultaneously — a hidden tabpanel should use the `hidden` attribute, not DOM removal, per WAI-ARIA APG spec. With conditional rendering, the ARIA attributes will reference non-existent DOM elements, causing screen readers to fail silently.

**Why it happens:**
Conditional rendering is the simplest tab implementation. The ARIA requirement that panels remain in the DOM is non-intuitive.

**How to avoid:**
Replace conditional rendering with CSS visibility using the `hidden` attribute:

```tsx
<div
  role="tabpanel"
  id="panel-clipboard"
  aria-labelledby="tab-clipboard"
  hidden={activeTab !== "clipboard"}
  className={activeTab !== "clipboard" ? "hidden" : "flex h-full w-full"}
>
  {clipboardSlot}
</div>
<div
  role="tabpanel"
  id="panel-qa"
  aria-labelledby="tab-qa"
  hidden={activeTab !== "qa"}
  className={activeTab !== "qa" ? "hidden" : "flex h-full w-full"}
>
  {qaSlot}
</div>
```

`hidden` keeps the DOM and React state alive (scroll preserved by the browser), while the ARIA `hidden` attribute makes the inactive panel inert for screen readers. Both requirements are satisfied simultaneously.

Tab buttons must use `role="tab"` with `aria-controls` referencing their panel ID, and `aria-selected` to reflect active state. The WAI-ARIA APG keyboard pattern requires left/right arrow keys to move between tabs:

```typescript
function handleTabKeyDown(e: React.KeyboardEvent, current: Tab) {
  if (e.key === "ArrowRight") setActiveTab(current === "clipboard" ? "qa" : "clipboard");
  if (e.key === "ArrowLeft") setActiveTab(current === "qa" ? "clipboard" : "qa");
}
```

**Warning signs:**

- Switching to Clipboard and back resets the QA panel's new-question count to 0.
- Reply text typed in a `QuestionCard` is lost on tab switch.
- axe-core flags "tab references non-existent panel element" after adding ARIA attributes.
- Screen reader does not announce panel content on tab switch.

**Phase to address:** ARIA tablist / SessionShell accessibility phase.

---

### Pitfall 6: `QuestionCard` Local State Desynchronizes from Subscription-Driven `isFocused` Prop

**What goes wrong:**
`QuestionCard` initializes `showReplies` from the `question.isFocused` prop:

```typescript
const [showReplies, setShowReplies] = useState(question.isFocused);
```

`useState` reads its argument only once — at mount. If a question becomes focused via a subscription event after the card has mounted, `showReplies` stays `false`. The planned v1.3 feature "auto-expand replies for focused questions" will silently not work for any card that was already mounted when the focus event arrived.

Splitting `QuestionCard` into state-specific variants makes this worse. If the variant switches (e.g., `isHidden` becomes `true`) without a React key change, the new render uses the existing component instance and the stale `useState` initialization is never re-run.

**Why it happens:**
`useState(initialValue)` is a common pattern for "derived initial state" that developers assume stays synchronized with prop changes. React explicitly does not re-initialize state on re-render — this is the expected behavior, but it surprises developers when props are subscription-driven.

**How to avoid:**
Replace the `useState` initialization with a `useEffect` that syncs one-way from prop to state (open on focus, do not auto-close on unfocus to preserve user intent):

```typescript
const [showReplies, setShowReplies] = useState(question.isFocused);
useEffect(() => {
  if (question.isFocused) setShowReplies(true);
}, [question.isFocused]);
```

When splitting into variants, give each variant a compound key so React remounts cleanly on variant change:

```tsx
// In QAPanel map callback:
key={`${question.id}-${question.isBanned ? "banned" : question.isHidden ? "hidden" : "normal"}`}
```

This forces a clean remount on state transition, resetting all local state consistently. Pair with the AnimatePresence rule from Pitfall 1: the key must be on the `motion.div`, not inside a variant component.

**Warning signs:**

- Host focuses a question; participant who already has the card mounted sees the focused ring/badge appear but the reply section remains collapsed.
- Manual "show replies" toggle works, but subscription-driven auto-expand does not.
- Unit test for auto-expand only passes when `isFocused: true` was set before the component mounted.

**Phase to address:** QuestionCard variant extraction phase, specifically the auto-expand replies feature.

---

### Pitfall 7: Duplicate Sort Logic Between `useSessionState` and `QAPanel` Produces Divergent Ordering

**What goes wrong:**
Questions are sorted in two places:

1. `useSessionState.ts` lines 221–226: sorts questions for `sortedQuestions` output.
2. `qa-panel.tsx` lines 79–94: re-sorts using a debounced snapshot to implement visual stability.

Both sort by `isFocused` first, then `upvoteCount` desc, then `createdAt` desc. The two sorts can temporarily disagree when the debounce timer is active. This means the host and participant views can show different orderings during the 1-second debounce window, since `SessionLiveHostPage` passes `sortedQuestions` from `useSessionState` into `QAPanel`, which then re-sorts it.

When extracting the sort to a single canonical location, there is a risk of accidentally removing the debounce, which causes cards to visibly jump position on every vote from any participant.

**Why it happens:**
The debounce sort in `QAPanel` was added to prevent card jumping, without removing the pre-sort from `useSessionState`. The two layers are now both active and redundant.

**How to avoid:**

- `useSessionState` should NOT pre-sort questions. Return `state.questions` unsorted.
- `QAPanel` owns the sort + debounce. It receives unsorted questions from the parent.
- The debounced sort is the single source of truth for display order.

This is the correct separation: `useSessionState` is a state container; `QAPanel` is a display component that owns its display-specific optimizations (debounce, visual stability).

If `sortedQuestions` from `useSessionState` is also used elsewhere (e.g., the host toolbar showing the first focused question), provide a separate `focusedQuestion` selector in the hook rather than sorting the entire list.

**Warning signs:**

- Host and participant see different question ordering during an active vote event.
- Removing `sortedQuestions` from `useSessionState` breaks the host page (a consumer other than `QAPanel` is using it).
- After removing the pre-sort, `QAPanel` shows unsorted questions briefly before the debounce fires.

**Phase to address:** QAPanel sort deduplication phase, done simultaneously with the `useSessionMutations` extraction.

---

## Technical Debt Patterns

| Shortcut                                                                        | Immediate Benefit                     | Long-term Cost                                                                                  | When Acceptable                                                        |
| ------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Duplicate handler logic in `SessionLivePage` and `SessionLiveHostPage`          | Avoids abstraction complexity         | Two places to fix every mutation bug; `handleDownvote` is verbatim duplicated across both files | Never — extract `useSessionMutations` in v1.3                          |
| `repliesByQuestion` Map rebuilt inline on every `QAPanel` render                | Simple to read                        | Rebuilds O(n replies) on every subscription event, even if replies did not change               | Never once session has > 20 replies                                    |
| Double sort: `useSessionState` pre-sorts AND `QAPanel` re-sorts with debounce   | Each component appears self-contained | Divergent ordering during debounce window; unnecessary sort work                                | Never — one canonical sort per render path                             |
| `formatRelativeTime` defined locally in `question-card.tsx`                     | No import needed                      | Will diverge if copied to reply-list or other locations                                         | Acceptable only during initial scaffolding — extract before v1.3 ships |
| Mobile `activeTab === "clipboard" ? clipboardSlot : qaSlot` conditional unmount | Simplest tab implementation           | Panel state lost on every tab switch; ARIA tabpanel requirement violated                        | Never for a production tab UI                                          |
| `useState(question.isFocused)` for initial `showReplies`                        | Derived initial state reads naturally | Subscription-driven prop changes after mount never update the local state                       | Never when props are subscription-driven                               |

---

## Integration Gotchas

| Integration                                      | Common Mistake                                                                                                                                                                                                                | Correct Approach                                                                                                                                                 |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AppSync + optimistic update + extraction         | Moving mutation handlers to a hook breaks the `_opt_` ID dedup in the reducer if the handler no longer passes `optimisticId`                                                                                                  | Pass `optimisticId: tempId` in all `SNIPPET_ADDED` and `QUESTION_ADDED` dispatches after extraction; the reducer dedup logic depends on it                       |
| AppSync + subscription + component extraction    | Moving `useSessionUpdates` into a child component (e.g., inside `QAPanel`) causes a new WebSocket handshake every time the parent re-renders                                                                                  | `useSessionUpdates` must remain in the root orchestrator — never descend into panel components                                                                   |
| next-intl + shared utility extraction            | `formatRelativeTime` currently takes `tSession` as a parameter. Calling `useTranslations()` inside a plain utility function fails (hooks can only be called inside components/hooks)                                          | Keep the translation function as a required parameter of the utility: `formatRelativeTime(createdAt, tSession)`, or make it a hook: `useRelativeTime(createdAt)` |
| Framer Motion + React 19 concurrent rendering    | Rapid subscription events (5+ per second) can cause AnimatePresence to miss exit animations for fast-changing lists                                                                                                           | Use `mode="sync"` on `AnimatePresence` if items disappear without exit animations during rapid events; `"popLayout"` is best for reordering                      |
| Framer Motion `layout` + `AnimatePresence`       | `layout` prop on list items causes sibling cards to animate when one is removed, but without `LayoutGroup` they may not animate their layout change                                                                           | Wrap the animated list in `<LayoutGroup>` when both `layout` and exit animations are active on the same list                                                     |
| Base UI Dialog + QuestionCard variant extraction | The ban confirmation `Dialog.Root` is embedded in the main `QuestionCard`; extracting a `BannedQuestionCard` variant that does not contain the Dialog breaks the confirm flow                                                 | Keep `Dialog.Root` only in the full (normal) `QuestionCard` variant; banned and hidden variants are pure display components                                      |
| `useCallback` + `useReducer` dispatch            | Wrapping handlers in `useCallback` with `dispatch` as the only dependency is safe because `dispatch` is stable. Adding `state` to deps rebuilds all callbacks on every state change, causing all memo'd children to re-render | Move state-reading logic from handlers into the reducer; keep callback deps to `[dispatch, sessionSlug, fingerprint]`                                            |

---

## Performance Traps

| Trap                                                                             | Symptoms                                                                        | Prevention                                                                            | When It Breaks                                       |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| All `QuestionCard` instances re-render on every subscription event               | Frame drops on vote events; DevTools shows 50 card re-renders for 1 data change | `React.memo` + `useCallback` on all handler props + `useMemo` for `repliesByQuestion` | Noticeable at ~15 questions on mobile, severe at 40+ |
| `repliesByQuestion` Map rebuilt inline on every `QAPanel` render                 | O(n replies) per render; minor cost grows with session length                   | `useMemo([replies])`                                                                  | Relevant at 200+ total replies                       |
| Double sort per render (useSessionState + QAPanel)                               | CPU proportional to question count; both runs execute even when nothing changed | Remove pre-sort from `useSessionState`; QAPanel owns single debounced sort            | Noticeable at 30+ questions                          |
| Debounce timer in `QAPanel` reset on every tab switch (mobile unmount)           | Sort order jumps on tab return; debounce state lost                             | Keep panels mounted with CSS `hidden`; debounce state survives                        | Every tab switch on mobile                           |
| `linkifyText` called for every question on every render                          | Grows with question text length × question count                                | Memoize per `question.id + question.text` with `useMemo` inside QuestionCard          | Noticeable at 50+ questions with long text           |
| `QAPanel`'s `prevQuestionCount.current` ref tracking broken after mobile unmount | New content banner counter resets silently to 0 on every tab switch             | Keep panels mounted (same fix as scroll preservation)                                 | Every tab switch on mobile                           |

---

## UX Pitfalls

| Pitfall                                                                                  | User Impact                                                                                                | Better Approach                                                                                              |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Vote buttons without `active:scale-95` or pending state                                  | No tactile feedback; users double-tap, triggering accidental double-dispatch visible as optimistic flicker | Add `active:scale-95` CSS + disable the clicked button during in-flight request                              |
| No identity chip in QAInput                                                              | Participant does not know which name will appear on their question before submitting                       | Show avatar + name chip in `QAInput`; click to open `IdentityEditor` directly                                |
| Own question indistinguishable from others at a glance                                   | Participant loses track of their question in high-vote sessions                                            | Left border + subtle background tint on `isOwn === true` questions                                           |
| Empty state shown to banned users with same copy as regular empty state                  | Banned user sees "Ask a question" empty state but input is disabled — confusing                            | Contextually different empty state for `isUserBanned === true`                                               |
| Two clicks required to reply to a focused question (show replies, then open reply input) | Friction reduces engagement for the host's featured question                                               | Auto-open reply section for `question.isFocused === true`; merge reply action into the section header        |
| `NewContentBanner` not visually dismissible via keyboard                                 | Keyboard-only users cannot scroll to top using the banner                                                  | `role="button"` + `tabIndex={0}` is already implemented — verify in test suite; ensure focus ring is visible |

---

## "Looks Done But Isn't" Checklist

- [ ] **QuestionCard variants extracted:** Verify `AnimatePresence` still produces exit animations when a question becomes `isBanned: true` via subscription event — add a visual regression or interaction test.
- [ ] **`useSessionMutations` extracted:** Run rollback tests on the 2nd, 3rd, and 4th mutation call with state changes between each call. Stale closure bugs are invisible in first-call tests.
- [ ] **ARIA tablist added to `SessionShell`:** Verify with axe-core that `role="tab"` has `aria-controls` pointing to a present `role="tabpanel"` element — requires both panels to be in DOM.
- [ ] **`aria-live` on NewContentBanner:** Test with a screen reader simulation during rapid question arrival (10 events in 3 seconds) — confirm announcements are debounced and not fired per-event.
- [ ] **`repliesByQuestion` memoized:** Confirm with React DevTools Profiler that a new question subscription event does not cause cards with unchanged replies to re-render.
- [ ] **Mobile tab switch preserves scroll:** QA panel scrolled 200px, switch to Clipboard, switch back — scroll position must be at 200px, not 0.
- [ ] **`isFocused` auto-expand:** With a card already mounted (`showReplies = false`), dispatch `QUESTION_UPDATED` with `isFocused: true` — reply section must open without user interaction.
- [ ] **Duplicate sort removed:** After removing pre-sort from `useSessionState`, confirm no other consumer of `sortedQuestions` breaks (grep for all `sortedQuestions` usages).

---

## Recovery Strategies

| Pitfall                                                       | Recovery Cost | Recovery Steps                                                                                                                           |
| ------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| AnimatePresence key broken after extraction                   | LOW           | Identify the `motion.div` that lost its direct-child position; move it back to `QAPanel`'s map callback; structural fix, no logic change |
| Stale closure in extracted hook causing wrong rollback counts | MEDIUM        | Add `stateRef` pattern immediately as a quick fix; schedule full reducer-based rollback refactor as follow-up                            |
| `aria-live` announcement storm                                | LOW           | Wrap the live region text update in `setTimeout(..., 2000)` debounce; move `aria-live` to a permanently-mounted element                  |
| All `QuestionCard` instances re-rendering                     | MEDIUM        | Add `React.memo` + `useCallback` on handlers; can be applied incrementally per handler                                                   |
| Mobile panel state lost on tab switch                         | MEDIUM        | Replace conditional rendering with `hidden` attribute; requires verifying both panels render on initial mobile load                      |
| `isFocused` not auto-expanding replies                        | LOW           | Add `useEffect` sync from `question.isFocused` → `showReplies` state                                                                     |

---

## Pitfall-to-Phase Mapping

| Pitfall                                | Prevention Phase                                               | Verification                                                                                                              |
| -------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| AnimatePresence key stability          | Component extraction (QuestionCard variants, SnippetCard)      | Interaction test: ban a question via subscription event; confirm animated exit plays (not instant pop)                    |
| Stale closure in `useSessionMutations` | Hook extraction phase                                          | Unit test: call `handleDownvote` twice with a reducer dispatch between calls; assert correct rollback count on both calls |
| `aria-live` announcement storm         | Accessibility pass (aria-live + ARIA tablist phase)            | Screen reader audit: dispatch 10 `QUESTION_ADDED` events in 3s; assert ≤ 2 announcements were made                        |
| `QuestionCard` re-render cascade       | QuestionCard + QAPanel optimization (same phase as extraction) | React DevTools Profiler: single vote event touches only 1 card out of 50                                                  |
| Mobile tab panel remount               | ARIA tablist / SessionShell phase                              | E2E: scroll QA panel 200px, switch tab, switch back; assert `scrollTop` is ~200, not 0                                    |
| `isFocused` desync                     | QuestionCard variant + auto-expand feature                     | Integration test: mount card with `isFocused: false`, update prop to `true` via dispatch, assert reply section opens      |
| Duplicate sort                         | `useSessionMutations` + QAPanel cleanup phase                  | Assert `useSessionState` output is unsorted; assert `QAPanel` output is sorted; no double-sort in profiler                |

---

## Sources

- [Motion docs: AnimatePresence](https://motion.dev/docs/react-animate-presence) — official API and key prop requirements
- [The Power of Keys in Framer Motion — nan.fyi](https://www.nan.fyi/keys-in-framer-motion) — key stability patterns and decomposition mistakes
- [AnimatePresence + layout animations bug #1983 — motiondivision/motion](https://github.com/motiondivision/motion/issues/1983) — documented interaction between `layout` and exit animations
- [AnimatePresence fast-changing content bug #907 — framer/motion](https://github.com/framer/motion/issues/907) — rapid subscription events confusing exit tracking
- [Hooks, Dependencies and Stale Closures — TkDodo](https://tkdodo.eu/blog/hooks-dependencies-and-stale-closures) — authoritative guide to stale closures in custom hooks
- [useEffectEvent — React official docs](https://react.dev/reference/react/useEffectEvent) — stable React 19.2 solution for stale closures in effects
- [React functional component WebSocket stale handler #16975](https://github.com/facebook/react/issues/16975) — canonical example of stale closure in subscription callbacks
- [ARIA live regions — MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions) — authoritative spec for live region behavior
- [Accessible notifications with aria-live — Sara Soueidan Part 1](https://www.sarasoueidan.com/blog/accessible-notifications-with-aria-live-regions-part-1/) and [Part 2](https://www.sarasoueidan.com/blog/accessible-notifications-with-aria-live-regions-part-2/) — debouncing and singleton announcer patterns
- [When your live region isn't live — k9n.dev 2025](https://k9n.dev/blog/2025-11-aria-live/) — React-specific live region pitfalls including element remounting
- [WAI-ARIA Tabs Pattern — W3C APG](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) — authoritative keyboard navigation and DOM structure requirements for tablist
- [How to avoid performance pitfalls with memo, useMemo, useCallback — DigitalOcean](https://www.digitalocean.com/community/tutorials/how-to-avoid-performance-pitfalls-in-react-with-memo-usememo-and-usecallback) — memoization pairing requirements
- [How to use memo and useCallback — developerway.com](https://www.developerway.com/posts/how-to-use-memo-use-callback) — when memoization has zero effect without stabilizing all props

---

_Pitfalls research for: Nasqa Live — v1.3 Participant & Host UX Refactor_
_Researched: 2026-03-16_
