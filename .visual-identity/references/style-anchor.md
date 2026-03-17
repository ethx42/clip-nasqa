# Style Anchor — nasqa-clip Visual Consistency Layer

Every GenAI prompt for nasqa-clip MUST include this style block (or a subset of it) to maintain cross-tool, cross-session consistency. Copy the relevant **Style Suffix** into every prompt sent to Leonardo.ai, Nano Banana, Midjourney, DALL-E, or any other tool.

---

## Core Style Suffix (append to ALL prompts)

```
Style: warm minimalist illustration with hand-drawn character. Loose confident linework — like a skilled designer sketching with a felt-tip marker on good paper. Lines are not perfectly straight or symmetric but have intentional, expressive rhythm. Generous negative space, breathing room. Color palette restricted to indigo (#6366f1), zinc-900 (#18181b), zinc-50 (#fafafa), and warm cream/peach as accent. Fills use soft washes — like diluted ink or watercolor at 10-25% opacity. No hard edges on fills. Subtle paper-like grain texture (2-4% opacity). Calm, human, approachable. Feels like something a creative person made by hand, not something a design system generated.
```

## Dark Mode Variant Suffix

```
Dark background (#09090b near-black), light foreground elements. Indigo (#6366f1) as accent — used for warmth against the dark, like a desk lamp glow. Strokes in zinc-300 (#d4d4d8) or zinc-400 (#a1a1aa). Subtle radial glow behind focal point (indigo at 8-15% opacity, large blur radius). Fine grain texture on dark surfaces. Cozy, not cold.
```

## Light Mode Variant Suffix

```
White/off-white background (#fafafa), dark foreground elements in zinc-900 (#18181b). Indigo (#6366f1) as accent — small pops of color that feel like someone highlighted their favorite parts. Warm ambient shadows. Clean and airy but not sterile. Like a well-lit studio, not a hospital.
```

## Illustration Style Suffix (for empty states, icons, decorative)

```
Hand-drawn illustration with personality. Loose felt-tip marker linework — confident single strokes, not traced or corrected. Slightly varying stroke weight (1.5-3px natural variation). Rounded line endings. Primary stroke color: zinc-500 (#71717a) for warmth. Accent fills: indigo-500 (#6366f1) at 10-25% opacity as soft washes, not flat fills. Objects are recognizable and relatable — everyday things, not geometric abstractions. Suggest emotion through posture and gesture of objects, not through literal facial expressions. Inspired by Roman Muradov's Notion illustrations and Jean Jullien's expressive simplicity. White space is breathing room, not emptiness.
```

## Typography Reference (for assets that include text)

```
Heading font: Poppins ExtraBold (800 weight), tight letter-spacing (-0.04em).
Body font: Poppins Regular (400 weight), relaxed line-height.
Code font: JetBrains Mono Regular (400 weight).
Never use serif fonts. Never use handwritten/script fonts in UI — but illustration accents may use loose hand-lettering sparingly.
```

## Negative Prompt (what to EXCLUDE — use in tools that support it)

```
Negative: neon glow, lens flare, chromatic aberration, bokeh, stock photo, corporate illustration, flat vector clipart, cartoon, anime, watermark, text overlay unless specified, busy background, multiple focal points, excessive detail, ornate borders, 3D perspective distortion, isometric unless specified, perfect symmetry, pixel-perfect geometry, generic SaaS aesthetic, gradient meshes, glassmorphism, people/faces unless specified, hands, fingers
```

---

## Tool-Specific Notes

### Leonardo.ai

- Use **Alchemy v2** or **Phoenix** model for clean renders
- Set **Guidance Scale** to 7-9 (higher = more literal to prompt)
- Enable **Prompt Magic v3** for detail refinement
- Use the Negative Prompt field with the block above
- For illustrations: select **None** as base style, rely on prompt
- Recommended presets: none (custom prompt control is better)

### Nano Banana

- Paste the full prompt + style suffix as a single block
- Use aspect ratio controls for exact dimensions
- For consistency across a batch: generate one "hero" image first, then use it as a style reference for subsequent generations
- Emphasize the color hex codes in the prompt — Nano Banana responds well to explicit color constraints

### Midjourney (if used)

- Append `--style raw` to avoid Midjourney's default stylization
- Use `--no` flag with the negative prompt terms
- `--ar 16:9` for OG images, `--ar 1:1` for icons
- `--s 50` (low stylize) to stay closer to prompt intent
- Reference previous outputs with `--sref` for batch consistency

### DALL-E (if used via ChatGPT/API)

- Include style suffix inline (no negative prompt field)
- Be very explicit about "no text" if text isn't needed — DALL-E loves adding random text
- Specify the hand-drawn quality explicitly — DALL-E defaults to polished/photorealistic

---

## Color Hex Quick Reference

| Token         | Hex                  | Usage                                  |
| ------------- | -------------------- | -------------------------------------- |
| Indigo-500    | #6366f1              | Primary accent                         |
| Indigo-400    | #818cf8              | Light accent variant                   |
| Indigo-600    | #4f46e5              | Dark accent variant                    |
| Indigo-500/10 | rgba(99,102,241,0.1) | Subtle background fills                |
| Zinc-50       | #fafafa              | Light mode background                  |
| Zinc-100      | #f4f4f5              | Light mode surface                     |
| Zinc-400      | #a1a1aa              | Muted elements                         |
| Zinc-500      | #71717a              | Illustration strokes (warmer than 400) |
| Zinc-800      | #27272a              | Dark mode borders                      |
| Zinc-900      | #18181b              | Dark mode surface, light mode text     |
| Zinc-950      | #09090b              | Dark mode background                   |
| Rose-500      | #f43f5e              | Destructive/error only                 |
