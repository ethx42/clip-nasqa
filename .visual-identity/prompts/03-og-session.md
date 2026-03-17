# 03 — OG Image: Session (Dynamic)

## Brief

Per-session Open Graph card generated dynamically via `opengraph-image.tsx` route. When someone shares a session link (`clip.nasqa.io/session/my-talk`), the card should display the session title, activity indicators, and the brand mark. Each session shares differently.

## Concept Direction

A templated layout where dynamic content (session title, status) fills predefined slots. The brand mark (two-clips-heart) sits small in the corner like a stamp. The session title is the hero. The overall feel should be warmer than typical SaaS OG cards — like a event name tag or a hand-written agenda card.

## Master Prompts

### Prompt A — Title-Forward Card (recommended)

```
A 1200x630 Open Graph card template for individual sessions. Dark near-black background (#09090b) with subtle paper-grain texture. Layout: upper-left corner shows the two-clips-heart logo mark (small, indigo #6366f1, hand-drawn quality) with "clip" in zinc-400 (#a1a1aa) next to it. Center of the card: large bold sans-serif text placeholder "[Session Title]" in white (#fafafa), max 2 lines, left-aligned with generous left margin. Below the title: a small green dot (live indicator) next to "LIVE" in small caps zinc-400, and the session slug in zinc-500 monospace. Bottom of the card: a thin indigo line (2px) that looks slightly hand-drawn (not perfectly straight — very subtle waviness). The warm indigo glow (8% opacity) sits behind the title area.

Style: warm minimalist with organic touches. The hand-drawn logo and slightly imperfect accent line add human character to an otherwise clean layout. Paper-grain texture for warmth.

Negative: neon glow, corporate, stock photo, clipart, busy, ornate, 3D, perfect geometric precision
```

### Prompt B — Centered with QR

```
A 1200x630 Open Graph card. Dark near-black background (#09090b), paper-grain texture. Left two-thirds: session title large in white, status below in zinc-400. Right third: QR code for the session URL. Upper-left: small two-clips-heart mark in indigo. The composition feels like a conference badge — functional but designed with care.

Style: warm minimalist. Conference/event aesthetic, not SaaS dashboard.

Negative: neon, corporate, busy, ornate, 3D
```

## Parameters

| Param        | Value                                                   |
| ------------ | ------------------------------------------------------- |
| Tool         | Leonardo.ai or Nano Banana                              |
| Aspect ratio | 1200x630 (1.91:1)                                       |
| Format       | Design reference (PNG) — actual asset is code-generated |
| Style        | Warm dark mode, templated                               |

## Placement

- Design reference for `packages/frontend/src/app/[locale]/session/[slug]/opengraph-image.tsx`
- Server-rendered via `next/og` ImageResponse with dynamic session data

## Dynamic Fields

| Field         | Source             | Fallback           |
| ------------- | ------------------ | ------------------ |
| Session title | `session.title`    | "Untitled Session" |
| Live status   | `session.isActive` | hide indicator     |
| Session slug  | `session.slug`     | always present     |

## Post-Generation

1. Build the layout in `opengraph-image.tsx` matching the reference
2. Load Poppins 800 and JetBrains Mono 400 via `fetch` for the ImageResponse
3. Inline the two-clips-heart mark as SVG path data
4. Test with real session data at various title lengths
5. Verify on social platform validators
