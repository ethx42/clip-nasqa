# 02 — OG Image: Landing Page

## Brief

The default Open Graph image for nasqa-clip. Appears when the landing page URL is shared on Slack, Twitter/X, LinkedIn, iMessage, WhatsApp. This is the product's first impression for most people who encounter a shared link.

Current state: White "clip" text on black (#09090b). Functional, forgettable.

## Concept Direction

The two-clips-heart logo mark as the centerpiece, with the "clip" wordmark and tagline. Should feel warm and human — not like another SaaS card, but like a hand-crafted invitation. The hand-drawn quality of the logo should be the thing that makes people pause mid-scroll.

## Master Prompts

### Prompt A — Logo Mark + Wordmark (recommended)

```
A 1200x630 Open Graph card for a product called "clip". Dark near-black background (#09090b) with subtle paper-grain texture (3% opacity). Center composition: the two-clips-heart logo mark (two intertwined paperclips forming a heart in negative space, hand-drawn line quality, indigo #6366f1) at medium scale. Below it, the word "clip" in bold sans-serif (Poppins-like, 800 weight) in white (#fafafa), with relaxed tracking. Below that, a single line in zinc-400 (#a1a1aa): "Real-time clipboard & Q&A for live sessions". The background has a soft, warm indigo radial glow (10% opacity) behind the mark — not a tech glow, more like the warm circle of a desk lamp. Generous breathing room on all sides.

Style: warm minimalist with hand-drawn brand mark. The logo has felt-tip marker quality while the typography is clean. The contrast between the organic mark and clean type is intentional — human creativity meets functional clarity. Paper-grain texture adds tactile warmth.

Negative: neon glow, lens flare, corporate, stock photo, clipart, busy background, geometric precision, multiple focal points, SaaS dashboard aesthetic, gradient mesh
```

### Prompt B — Sketch-on-Dark

```
A 1200x630 Open Graph card. Dark near-black background (#09090b) that looks like a quality dark paper or notebook page — subtle fiber/grain texture visible. Center: the two-clips-heart mark drawn in indigo (#6366f1) with visible marker stroke character, slightly larger than typical. The word "clip" below in white, small and understated. No tagline — let the mark speak. The composition feels like someone's favorite sketch pinned to a wall. Intimate, not broadcast.

Style: hand-drawn mark on dark surface. Warm, personal, anti-corporate. The imperfection IS the aesthetic.

Negative: neon, corporate, geometric, clinical, stock, busy, perfect symmetry
```

## Parameters

| Param          | Value                                     |
| -------------- | ----------------------------------------- |
| Tool           | Leonardo.ai or Nano Banana                |
| Aspect ratio   | 1200x630 (1.91:1)                         |
| Format         | PNG (for `opengraph-image.tsx` reference) |
| Guidance scale | 7 (Leonardo — allow creative latitude)    |
| Style          | Warm dark mode, organic mark              |

## Placement

- Reference design for `packages/frontend/src/app/opengraph-image.tsx` (will be rebuilt in code using `next/og` ImageResponse, not a static file)
- The GenAI output is a **design reference** — the actual OG is generated server-side via JSX

## Post-Generation

1. Use the output as a visual target for the coded `opengraph-image.tsx`
2. The coded version will use Poppins font loaded via `fetch` in the route
3. The two-clips-heart mark will be inlined as SVG path data in the ImageResponse
4. Test on: Twitter Card Validator, Facebook Sharing Debugger, LinkedIn Post Inspector
