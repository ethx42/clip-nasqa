# Visual Asset Catalog

Track all generated visual assets for nasqa-clip. Each entry links to its master prompt and placement.

## Asset Pipeline

| ID  | Name                        | Type               | Status           | Prompt File                                                      | Priority             |
| --- | --------------------------- | ------------------ | ---------------- | ---------------------------------------------------------------- | -------------------- |
| 01  | Favicon & App Icon Set      | Brand mark         | Prompt ready     | [01-favicon-app-icon.md](prompts/01-favicon-app-icon.md)         | P0 — before Phase 8  |
| 02  | OG Image: Landing           | Social card        | Prompt ready     | [02-og-landing.md](prompts/02-og-landing.md)                     | P0 — before Phase 8  |
| 03  | OG Image: Session (Dynamic) | Social card        | Prompt ready     | [03-og-session.md](prompts/03-og-session.md)                     | P0 — before Phase 8  |
| 04A | Empty State: Clipboard      | Illustration       | Prompt ready     | [04-empty-states.md](prompts/04-empty-states.md)                 | P1 — with Phase 8    |
| 04B | Empty State: Q&A            | Illustration       | Prompt ready     | [04-empty-states.md](prompts/04-empty-states.md)                 | P1 — with Phase 8    |
| 04C | Empty State: Not Found      | Illustration       | Prompt ready     | [04-empty-states.md](prompts/04-empty-states.md)                 | P1 — with Phase 8    |
| 05  | Skeleton Loaders            | Code component     | Spec ready       | [05-skeleton-loaders.md](prompts/05-skeleton-loaders.md)         | P1 — with Phase 8    |
| 06  | Hero Visual Accent          | Background pattern | Prompt ready     | [06-hero-visual-accent.md](prompts/06-hero-visual-accent.md)     | P1 — with Phase 8    |
| 07  | Reaction Emoji Style        | Style decision     | Decided (native) | [07-reaction-emoji-style.md](prompts/07-reaction-emoji-style.md) | P2 — before Phase 10 |
| 08  | Reaction Animations         | Motion spec        | Spec ready       | [08-reaction-animations.md](prompts/08-reaction-animations.md)   | P2 — before Phase 10 |

## Generated Assets

| ID  | Asset Path              | Generated With | Date | Notes |
| --- | ----------------------- | -------------- | ---- | ----- |
| —   | No assets generated yet | —              | —    | —     |

## Naming Convention

Assets in `packages/frontend/public/images/`:

```
{category}-{descriptor}-{variant}.{ext}

icon-favicon-dark.svg
og-landing-v1.png
og-session-template.png
empty-clipboard.svg
empty-questions.svg
empty-not-found.svg
hero-mesh-pattern.svg
```

## Style Consistency

All prompts reference the shared **Style Anchor**: [references/style-anchor.md](references/style-anchor.md)

Append the relevant style suffix from that file to every GenAI prompt for cross-tool consistency (Leonardo.ai, Nano Banana, Midjourney, DALL-E).

## Version History

- **2026-03-16** — Catalog initialized
- **2026-03-16** — 8 asset prompts created, style anchor established
