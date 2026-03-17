# 01 — Favicon & App Icon Set

## Brief

The brand mark for nasqa-clip. Appears in browser tabs, bookmarks, mobile home screen, PWA icon. Must be recognizable at 16x16px and beautiful at 512x512px. This is the most repeated visual surface in the product.

## Concept Direction

**Two paperclips of equal size, casually intertwined to form a heart shape in the negative space between them.** The heart is not forced or literal — it emerges from how the clips are disposed against each other, like two friends leaning into a hug. One clip comes from the left at a slight angle, the other from the right at a different angle. They overlap loosely in the middle where the heart forms.

Key principles:

- **Same size** — neither clip dominates. Speaker and audience are equals.
- **Asymmetric disposition** — the clips are not mirror images. Each has its own angle, its own lean. The asymmetry is what makes the heart feel organic, not manufactured.
- **Casual, not precise** — the interlock is loose, like two clips you absentmindedly hooked together while thinking. Not snapped into place, not engineered.
- **The heart is an easter egg** — people who see it will smile. People who don't see it still see two connected clips, which is still the right message.

## Master Prompts

### Prompt A — Two Clips Heart (primary direction)

```
A logo mark for a product called "clip". Two standard wire paperclips of equal size, casually intertwined so that the negative space between them suggests a heart shape. The clips are not mirror images — each has a slightly different angle and rotation, creating an asymmetric, organic arrangement. The interlock is loose and relaxed, like someone absent-mindedly hooked two clips together on a desk. One clip leans from the upper-left, the other from the upper-right, meeting and overlapping in the center-bottom where the heart point forms. Drawn with a confident, slightly loose line — like a designer's felt-tip marker sketch, not a CAD drawing. Single color: indigo (#6366f1). Lines have natural slight weight variation (not perfectly uniform). Transparent background. No text, no wordmark. The mark should read as "two connected clips" at 16x16 pixels, with the heart becoming visible at larger sizes.

Style: warm minimalist illustration with hand-drawn character. Confident loose linework, natural line weight variation. Not geometric, not perfect — human and intentional. Generous negative space.

Negative: perfect symmetry, geometric precision, CAD-like, clipart, cartoon, 3D, neon glow, photographic, ornate, busy, text, wordmark, corporate logo feel, interlocking gears aesthetic
```

### Prompt B — Two Clips Heart (tighter/simpler variant)

```
A simple logo mark: two wire paperclips forming a heart. Both clips are the same size. They are arranged at different angles — one tilted left, one tilted right — and overlap in the center so the space between their curves creates a heart silhouette. The style is like a quick, confident ink sketch — single continuous strokes with natural imperfections. Indigo color (#6366f1) on transparent background. Minimal detail, maximum personality. No text. Must work at 16px as a favicon (simplified to just the essential shape at that scale).

Style: hand-drawn logo mark, confident single strokes, felt-tip marker quality. Warm, human, not corporate.

Negative: perfect symmetry, mirror image, geometric, mechanical, clipart, 3D, neon, photographic, text, busy
```

### Prompt C — On Dark Background (after selecting mark)

```
The two-clips-heart mark from clip, centered on a dark background (#09090b). The mark is indigo (#6366f1) with the hand-drawn line quality preserved. Square format, 512x512 pixels. No padding beyond 10% margin. The mark fills 70-80% of the canvas. Subtle paper-grain texture on the dark background (2% opacity). No text.

Style: warm minimalist. The hand-drawn quality of the mark contrasts with the clean dark background — like a sketch pinned to a dark wall.

Negative: neon glow, rounded corners on canvas, photographic, clipart, busy background, geometric precision
```

### Prompt D — Favicon: The Wire Heart (16px legibility)

The favicon is NOT a miniature version of the full logo. It's the **result** of the logo — the heart shape that the two clips create together. The full logo shows the process (two clips meeting); the favicon shows the product (the heart they form).

The heart has angular, wire-like edges — not a smooth Valentine heart. The corners retain the geometry of bent wire, making it distinctly "clip" rather than generic. Solid fill, not outline.

```
A solid heart shape icon for a favicon. The heart is filled in indigo (#6366f1) on a transparent background. The heart's silhouette is NOT a smooth, perfectly curved Valentine heart — its edges have subtle angular bends, as if the heart shape was formed by bending wire or metal clips together. The top curves are slightly asymmetric (one lobe a touch higher than the other). The bottom point is sharp and slightly off-center. The overall impression: a heart that was made from something physical, not drawn in Illustrator. Solid fill, no outline, no stroke. The shape must be instantly readable as "heart" at 16x16 pixels. Simple, bold, single shape.

Style: bold icon design. Solid filled shape with character in its silhouette. The imperfection in the outline IS the brand — it tells you this heart was made from clips, not from math. Warm, human, immediately recognizable.

Negative: smooth curves, perfect symmetry, Valentine heart, outline/stroke style, thin lines, multiple shapes, 3D, neon, glow, photographic, complex, ornate, generic heart emoji, cartoon
```

## Parameters

| Param          | Value                                                |
| -------------- | ---------------------------------------------------- |
| Tool           | Leonardo.ai (Alchemy v2) or Nano Banana              |
| Aspect ratio   | 1:1                                                  |
| Output sizes   | 512x512 (master), then export: 180x180, 32x32, 16x16 |
| Format         | SVG (master), PNG (exports), ICO (favicon)           |
| Guidance scale | 7-8 (Leonardo — allow some creative latitude)        |
| Style          | Hand-drawn, warm, not geometric                      |

## Placement

- `packages/frontend/src/app/favicon.ico` (replace existing)
- `packages/frontend/src/app/icon.svg` (Next.js dynamic icon)
- `packages/frontend/src/app/apple-icon.png` (180x180)
- `packages/frontend/public/icon-512.png` (PWA manifest)

## Post-Generation

The brand system has two marks that work as a pair:

- **Full logo** (Prompts A/B): Two clips intertwined → used in headers, OG images, about pages, anywhere ≥64px
- **Favicon** (Prompt D): The wire heart they create → used in browser tabs, app icons, anywhere ≤32px

Steps:

1. Generate the full two-clips logo first (Prompts A/B). Select the best.
2. Trace the heart shape from the negative space of the selected logo
3. Refine that heart silhouette into the favicon mark (Prompt D guides the feel)
4. The favicon heart's angular edges should visually echo the wire bends of the full logo
5. Test the pair together — they should feel like parent and child
6. Generate dark-bg variant (Prompt C) for the full logo
7. Export favicon at 16x16, 32x32, 180x180, 512x512
8. Update `CATALOG.md` with both marks
