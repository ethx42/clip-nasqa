# 06 — Landing Hero Visual Accent

## Brief

A subtle background element behind the landing page hero section. Currently there's a `blur-3xl` indigo circle — functional but flat and generic. The hero needs visual depth that reinforces the warm, human brand identity.

## Concept Direction

Move away from the tech-mesh/dot-grid patterns (too SaaS) and toward something that feels more organic and inviting. The accent should feel like a warm light source behind the content — not data visualization, not network topology.

Two directions:

- **Organic:** A soft, imperfect ink wash or watercolor bloom behind the CTA area. Like someone spilled a drop of indigo ink on beautiful paper and it bloomed into a natural circle.
- **Scattered clips:** A constellation of tiny, loosely sketched paperclips at very low opacity, scattered like confetti that landed softly. They're part of the texture, not focal elements.

## Master Prompts

### Prompt A — Ink Bloom (recommended)

```
An abstract background accent for a landing page hero section. Off-white or near-white background (#fafafa). A single organic ink bloom or watercolor wash in indigo (#6366f1) at 6-10% opacity, centered in the upper-third of the canvas. The shape is not a perfect circle — it has natural watercolor edges, feathering, and slight irregularity. Like a drop of diluted indigo ink on textured paper, viewed from above. It should feel warm and accidental, like a beautiful stain. No hard edges. The bloom is large (fills 40-50% of canvas width) but extremely subtle. Surrounding area: subtle paper-grain texture (2% opacity). No text, no icons, no other elements.

Style: organic, warm, imperfect. Watercolor or ink wash aesthetic. Not geometric, not digital. The accident IS the beauty. Anti-corporate.

Negative: geometric, circles, dots, grids, mesh, network, nodes, lines, neon, glow, 3D, digital, tech, perfect shapes, hard edges, busy
```

### Prompt B — Scattered Clips Texture

```
An abstract background texture for a landing page. Off-white background (#fafafa). Scattered across the canvas: 15-20 tiny paperclip sketches at very low opacity (4-8%), drawn with loose single strokes in indigo (#6366f1) and zinc-400 (#a1a1aa). Each clip is drawn slightly differently — different rotations, slightly different shapes, as if someone doodled them absent-mindedly during a meeting. They're concentrated loosely in the center area and thin out toward the edges. The overall effect is a subtle wallpaper texture — noticed on second look, not first. Paper-grain texture underneath (2% opacity). No text, no other elements.

Style: hand-drawn doodle texture. Casual, warm, human. Like the margin notes of someone who clips things together for a living. Each clip is a single confident stroke, not detailed.

Negative: geometric, uniform, grid-aligned, clipart, detailed, photographic, 3D, neon, busy, corporate, organized patterns
```

### Prompt C — Warm Radial (safe fallback)

```
A subtle background element for a landing page. Off-white background (#fafafa). A soft radial gradient centered slightly above-center — indigo (#6366f1) at its core at 5% opacity, fading to transparent by 60% radius. The gradient is not perfectly circular — it has a slight vertical stretch, like warm light from above. Overlaid with paper-grain texture (2-3% opacity) that gives the digital surface a tactile quality. Extremely subtle. A viewer should feel the warmth without being able to point to the source.

Style: warm, atmospheric, organic. Ambient light quality. Not tech, not digital — more like a softly lit room.

Negative: geometric, circles with edges, dots, grids, mesh, neon, glow, 3D, tech, hard edges, busy, multiple elements
```

## Parameters

| Param          | Value                                                                   |
| -------------- | ----------------------------------------------------------------------- |
| Tool           | Leonardo.ai or Nano Banana (for reference), then CSS/SVG implementation |
| Aspect ratio   | 16:9 (1440x900 reference)                                               |
| Format         | SVG or CSS (final), PNG (reference from GenAI)                          |
| Guidance scale | 6-7 (Leonardo — allow maximum creative latitude)                        |
| Style          | Organic, atmospheric                                                    |

## Placement

- Implemented as CSS/SVG in `packages/frontend/src/app/[locale]/page.tsx`
- Replaces the current `blur-3xl` indigo circle
- Must be `aria-hidden="true"` and behind content

## Post-Generation

1. Use GenAI output as a **visual reference only**
2. Implement as lightweight CSS (radial gradients, SVG filter for ink bloom effect) or inline SVG
3. No raster images in production — this must be CSS/SVG for performance
4. The accent should be barely noticeable at first glance — felt more than seen
5. Verify it doesn't interfere with text readability
6. Test both light mode (primary) and dark mode (invert to indigo glow on dark)
