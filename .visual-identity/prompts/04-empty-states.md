# 04 — Empty State Illustrations

## Brief

Three illustrations for the app's empty states. These replace the current icon-only empty states (large gray Lucide icon + text). The illustrations should add warmth, personality, and a touch of storytelling. Think Notion's empty states — they make you feel something, not just inform you of nothing.

## Design Philosophy

Empty states are emotional moments. The user expects something and it's not there yet. The illustration's job is to reframe that emptiness as **anticipation**, not absence. Each illustration should feel like a quick, confident sketch — something a creative person drew in 30 seconds with a marker, capturing the essence of a feeling.

## Design Constraints

- Must work in BOTH light and dark mode (provide two variants or use adaptive strokes)
- Line style: confident felt-tip marker quality, slightly varying stroke weight (1.5-3px natural variation)
- Primary stroke: zinc-500 (#71717a) — warmer than pure gray
- Accent: indigo-500 (#6366f1) at 15-25% opacity as soft washes
- Max canvas: 200x200px logical (scalable SVG)
- Objects should be recognizable everyday things, not geometric abstractions
- No faces, but objects can have "posture" and "gesture"

---

## Asset 4A — Clipboard Empty (Host hasn't shared yet)

### Context

Shown in the Clipboard panel when no snippets exist. The host hasn't pushed any content yet. Participants see this while waiting.

### Concept

A microphone on a small stand, slightly tilted as if someone just set it down and stepped away for a moment — "be right back." A single paperclip sits on the surface nearby (the clip brand reference). The mic is waiting, not abandoned. Maybe a tiny indigo glow around the mic head suggesting it's on and ready.

### Master Prompt

```
A warm hand-drawn illustration of a small desk microphone on a short stand, tilted casually to one side as if someone just stepped away. Next to it on the surface, a single paperclip drawn with one loose stroke. The microphone has a tiny soft indigo (#6366f1) glow at 20% opacity around its head — it's on, it's ready. Drawn with confident felt-tip marker strokes, slightly varying line weight (1.5-3px). Strokes in warm gray (#71717a). The composition has lots of breathing room — the objects sit in the lower-center third, upper two-thirds is empty space. No background, no text, no people. The mood is "the speaker just went to grab their coffee, they'll be right back."

Style: hand-drawn illustration with personality. Confident loose linework like a designer's sketch. Recognizable everyday objects, not geometric abstractions. Indigo (#6366f1) accent as soft wash. Inspired by Roman Muradov's Notion illustrations — suggestive, warm, minimal.

Negative: geometric, abstract, clipart, cartoon, photorealistic, complex textures, faces, hands, busy, ornate, 3D, neon, corporate illustration, flat vector, perfect lines
```

### Placement

- `packages/frontend/public/images/empty-clipboard.svg`
- Used in: `packages/frontend/src/components/session/clipboard-panel.tsx` (empty state)

---

## Asset 4B — QA Empty (No questions yet)

### Context

Shown in the Q&A panel when no questions have been submitted. The session is active but the audience hasn't engaged yet.

### Concept

A single raised hand — just the arm and hand, drawn with one confident continuous stroke. The hand is open, fingers slightly spread, like someone about to ask a question but still gathering courage. A small indigo circle floats near the fingertips like a thought forming. The gesture says "almost ready to speak up."

### Master Prompt

```
A warm hand-drawn illustration of a single raised arm and open hand, drawn with one confident continuous marker stroke. The hand is reaching upward with fingers slightly spread — the universal gesture of "I have a question." The arm enters from the bottom-center of the frame. Near the fingertips, a small soft indigo (#6366f1) circle at 20% opacity floats like a thought bubble forming. The drawing style is loose and expressive — like Jean Jullien's single-stroke figures. Line weight varies naturally (2-3px). Warm gray strokes (#71717a). Generous empty space around the hand. No face, no body beyond the forearm. No background, no text. The mood is "someone's about to speak up."

Style: expressive single-stroke illustration. Confident, loose, human. One continuous line quality. Warm gray with indigo accent. Inspired by Jean Jullien and Christoph Niemann's editorial illustrations.

Negative: geometric, abstract shapes, clipart, cartoon hands, realistic anatomy, complex shading, multiple colors, busy, ornate, 3D, neon, corporate, stock illustration
```

### Placement

- `packages/frontend/public/images/empty-questions.svg`
- Used in: `packages/frontend/src/components/session/qa-panel.tsx` (empty state)

---

## Asset 4C — Not Found (Session doesn't exist)

### Context

Shown on the 404 page when a user navigates to a non-existent session. Should communicate "this link is broken" without being alarming.

### Concept

Two paperclips that are almost hooked together but just miss — a tiny gap between them. One is slightly reaching toward the other. The clips reference the brand while communicating "disconnected" in the gentlest possible way. A small "?" drawn loosely near the gap, like someone penciled it in.

### Master Prompt

```
A warm hand-drawn illustration of two wire paperclips that are almost connected but not quite. They're close — one reaches toward the other — but there's a small gap between them where they should interlock. The clips are equal in size, drawn with loose confident marker strokes in warm gray (#71717a). One clip has a subtle indigo (#6366f1) wash at 15% opacity. Near the gap, a small hand-drawn question mark in lighter gray, like someone penciled it in as an afterthought. The composition is centered with generous breathing room. No background, no text beyond the "?". The mood is gentle confusion — "these should be together, but something's off." Not alarming, not broken — just a small mix-up.

Style: hand-drawn illustration with personality. Confident marker strokes, natural line weight variation. Everyday objects with emotional gesture. Indigo accent as soft wash. Warm, approachable, slightly humorous.

Negative: geometric, abstract, clipart, cartoon, photorealistic, error symbols, warning signs, red color, broken/shattered imagery, complex, busy, 3D, neon, corporate
```

### Placement

- `packages/frontend/public/images/empty-not-found.svg`
- Used in: `packages/frontend/src/app/[locale]/not-found.tsx`

---

## Parameters (all three)

| Param          | Value                                                                 |
| -------------- | --------------------------------------------------------------------- |
| Tool           | Leonardo.ai (Alchemy v2) or Nano Banana                               |
| Aspect ratio   | 1:1 (200x200 logical)                                                 |
| Format         | SVG (trace from raster, preserve hand-drawn quality)                  |
| Guidance scale | 7 (Leonardo — allow creative latitude)                                |
| Style          | Hand-drawn illustration                                               |
| Iterations     | Generate 4-6 variants per asset, select the one with most personality |

## Post-Generation (all three)

1. Select the variant with the most personality and warmth (not the "cleanest")
2. Trace to SVG — preserve imperfections, don't over-smooth curves
3. Optimize with SVGO — target < 3KB per illustration
4. Test in both light and dark mode (may need stroke color swap)
5. Replace current Lucide icon empty states in components
6. Update `CATALOG.md`
