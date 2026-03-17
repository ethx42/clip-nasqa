# 08 — Reaction Animation Language

## Brief

Micro-interaction spec for emoji reaction toggle. When a participant taps an emoji: what moves, what scales, what transitions? The DESIGN_SYSTEM.md rule: "If you notice the animation, it's too much."

This is a **code spec**, not a GenAI asset. Documented here for visual consistency governance.

## Animation Principles for Reactions

1. **Feedback, not spectacle.** The user needs to know their tap registered. They don't need fireworks.
2. **Fast in, ease out.** The reaction should appear instantly (< 100ms) and settle gracefully (200-300ms).
3. **Count transitions matter.** Going from "3" to "4" should feel smooth, not jarring. Number should slide/fade, not jump.
4. **Optimistic feel.** Since we're using optimistic updates, the animation happens immediately — no waiting for server.

## Spec: Reaction Toggle On

```
Phase 1 — Tap (0-100ms):
  - Emoji container: scale(1.15) over 80ms, ease-out
  - Emoji itself: no transform (native emoji don't scale well)
  - Container background: transition from zinc-800 to indigo-500/15
  - Container border: transition from transparent to indigo-500/40

Phase 2 — Settle (100-300ms):
  - Emoji container: scale(1.15) → scale(1.0) over 200ms, spring ease (cubic-bezier(0.34, 1.56, 0.64, 1))
  - Count number: +1 with a vertical slide-up transition (old number slides up and fades, new slides in from below)
  - Count color: transition from zinc-400 to indigo-400

Total duration: 300ms
```

## Spec: Reaction Toggle Off

```
Phase 1 — Tap (0-80ms):
  - Emoji container: scale(0.95) over 60ms, ease-in
  - Container background: transition from indigo-500/15 to zinc-800
  - Container border: transition from indigo-500/40 to transparent

Phase 2 — Settle (80-250ms):
  - Emoji container: scale(0.95) → scale(1.0) over 170ms, ease-out
  - Count number: -1 with vertical slide-down transition
  - Count color: transition from indigo-400 to zinc-400

Total duration: 250ms (slightly faster than toggle-on — removal should feel lighter)
```

## Spec: Count Increment from Subscription (someone else reacted)

```
- No container animation (it's not the user's action)
- Count number only: vertical slide-up transition, 200ms, ease-out
- If count goes from 0 to 1: the entire reaction pill fades in (opacity 0→1, 200ms)
- If count goes from 1 to 0: the reaction pill fades out (opacity 1→0, 150ms), then removed from DOM
```

## Spec: First-Time Reaction Appearance

```
When a question/reply first receives ANY reaction (the bar appears):
  - Reaction bar container: height 0 → auto, opacity 0 → 1, 250ms, ease-out
  - Staggered pill entrance: each pill fades in with 30ms delay (total 180ms for 6)

When the last reaction is removed (the bar disappears):
  - Reaction bar container: opacity 1 → 0, height auto → 0, 200ms, ease-in
```

## CSS Implementation Reference

```css
/* Reaction pill base */
.reaction-pill {
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Active state (user has reacted) */
.reaction-pill[data-active="true"] {
  background: rgba(99, 102, 241, 0.15);
  border-color: rgba(99, 102, 241, 0.4);
}

/* Tap feedback */
.reaction-pill:active {
  transform: scale(0.95);
  transition-duration: 60ms;
}

/* Count transition */
.reaction-count {
  transition: color 200ms ease-out;
}

/* Spring bounce on toggle-on */
@keyframes reaction-bounce {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.15);
  }
  100% {
    transform: scale(1);
  }
}

.reaction-pill[data-animating="true"] {
  animation: reaction-bounce 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

## Reference Prompt (for motion mockup / video reference)

```
A short animation loop showing a reaction emoji being toggled in a chat UI. Dark background (#18181b). A small rounded pill contains a thumbs-up emoji and the number "3". On tap: the pill briefly scales up 15%, the background shifts to a subtle indigo green tint, and the number smoothly transitions from "3" to "4" with a slide-up effect. Then the pill settles back to normal size with a gentle spring bounce. Clean, minimal, fast. Total animation under 300ms. No particle effects, no glow.

Style: UI micro-interaction demonstration. Dark mode. Minimal, functional motion design.

Negative: flashy, particle effects, confetti, neon, slow motion, 3D, complex
```

## Parameters

| Param     | Value                                                |
| --------- | ---------------------------------------------------- |
| Tool      | Code (CSS + Framer Motion)                           |
| GenAI use | Motion reference only (if using video-capable GenAI) |
| Duration  | 250-300ms per interaction                            |
| Easing    | Spring for toggle-on, ease-out for toggle-off        |

## Placement

- `packages/frontend/src/components/session/reaction-bar.tsx` (Phase 10)
- CSS in component or `globals.css` depending on reuse

## Design System Compliance Check

- [x] "Motion should be felt, not seen" — all animations < 300ms, no attention-grabbing effects
- [x] `duration-200` baseline — used for container transitions
- [x] No `hover:scale` conflicts — reaction pills don't use the CTA scale pattern
- [x] Spring ease for positive feedback (toggle-on), linear ease for removal (toggle-off)
- [x] Framer Motion `<AnimatePresence>` for bar appear/disappear (matches existing qa-panel pattern)
