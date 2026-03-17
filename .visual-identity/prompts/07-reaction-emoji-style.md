# 07 — Reaction Emoji Rendering Style

## Brief

Define how the 6 reaction emojis render visually across the product. This is a **brand decision** that affects Phase 10 (Reactions Frontend). Native emoji rendering varies wildly across OS/browser — this spec locks the visual treatment.

## The 6 Emojis

| Key      | Emoji      | Label     |
| -------- | ---------- | --------- |
| thumbsup | :thumbsup: | Thumbs up |
| heart    | :heart:    | Heart     |
| party    | :tada:     | Party     |
| laugh    | :joy:      | Laugh     |
| thinking | :thinking: | Thinking  |
| eyes     | :eyes:     | Eyes      |

## Options Analysis

### Option A — Native Emoji (recommended)

**Pros:** Zero bundle size, instantly recognizable, no maintenance, automatic OS updates.
**Cons:** Looks different on Apple vs Android vs Windows vs Linux. Samsung's emoji set is particularly divergent.

**When to use:** When cross-platform consistency is acceptable and the product's visual identity doesn't depend on emoji rendering. This is the case for nasqa-clip — emojis are functional indicators, not brand elements.

### Option B — Twemoji (Twitter's open-source set)

**Pros:** Consistent across all platforms, well-designed, SVG available.
**Cons:** 6 SVGs to bundle (~2-4KB each), Twitter branding association, set is now maintained by community (less active since X rebrand).

### Option C — Noto Emoji (Google's set)

**Pros:** Consistent, flat design that aligns with our minimal aesthetic, actively maintained.
**Cons:** Flat style may feel less expressive than Apple/Samsung native. Bundle size.

### Option D — Custom SVG Set

**Pros:** Total brand control, perfect consistency.
**Cons:** High effort for 6 icons, maintenance burden, users may not recognize custom interpretations.

## Recommendation: Option A (Native) with guardrails

Native emoji is the right call for nasqa-clip. The emojis are functional reaction indicators inside a session — they're not the brand. The visual inconsistency across platforms is acceptable and even desirable (feels native to each user's device).

**Guardrails for implementation:**

- Render emoji at `font-size: 1.125rem` (18px) — large enough to be tappable, small enough to stay subordinate to content
- Wrap each emoji in a container with consistent sizing (`h-7 w-7 flex items-center justify-center`) so layout doesn't shift across platforms
- Use `role="img"` and `aria-label` with the English label for accessibility
- On the reaction bar, show counts in Poppins 600 adjacent to each emoji

## Master Prompt (for reference mockup only)

```
A horizontal reaction bar UI component for a chat/Q&A application. Dark card background (#18181b). A row of 6 emoji reactions displayed at small scale: thumbs up, heart, party popper, laughing face, thinking face, eyes. Each emoji is inside a subtle rounded pill (zinc-800 #27272a background, rounded-full, px-2 py-1) with a small count number (e.g., "3", "12") next to it in zinc-400 (#a1a1aa), small sans-serif font. One reaction (heart) has an indigo (#6366f1) border and slightly brighter background, indicating "I reacted to this." The bar has generous horizontal spacing between pills. Clean, minimal, functional.

Style: clean minimalist UI component mockup. Dark mode. SaaS application. Functional, not decorative.

Negative: large emoji, photographic, 3D, neon, busy background, ornate
```

## Parameters

| Param     | Value                                         |
| --------- | --------------------------------------------- |
| Tool      | Native emoji (no GenAI needed for production) |
| GenAI use | Reference mockup only                         |
| Format    | Code component (React + Tailwind)             |

## Placement

- `packages/frontend/src/components/session/reaction-bar.tsx` (Phase 10)
- Appears below each Question and Reply card in the session view
