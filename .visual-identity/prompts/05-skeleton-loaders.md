# 05 — Skeleton Loader Components

## Brief

Shimmer-based skeleton screens for content loading states. These are **code components, not GenAI assets** — but the visual spec is defined here to maintain consistency with the broader visual identity.

The design system mandates "skeleton-based, never spinner-based" loading. Currently nothing exists.

## Design Spec (not a GenAI prompt — implemented in code)

### Visual Treatment

```
Background: bg-muted/50 (zinc-100 light / zinc-800 dark at 50% opacity)
Shimmer: a linear-gradient animation sweeping left to right
  - From: transparent
  - Via: bg-muted/80 (lighter pulse)
  - To: transparent
Animation: 1.5s ease-in-out infinite
Border radius: match the element being skeletonized (rounded-2xl for cards, rounded-xl for inputs)
```

### Skeleton Variants Needed

**5A — Snippet Card Skeleton**

- Matches clipboard-panel snippet card dimensions
- Elements: code block rectangle (h-24, full width), bottom row with language badge pill + timestamp

**5B — Question Card Skeleton**

- Matches qa-panel question card dimensions
- Elements: avatar circle (h-8 w-8), two text lines (h-4, varying width), vote button rectangle

**5C — QA Panel Skeleton**

- Full panel loading state: 3 stacked Question Card Skeletons with gap-3 spacing

**5D — Clipboard Panel Skeleton**

- Full panel loading state: 2 stacked Snippet Card Skeletons

### Reference Prompt (for visual mockup only)

```
A UI skeleton loading state for a chat/Q&A application. Dark background (#09090b). Three card-shaped placeholder blocks stacked vertically with 12px gaps. Each card has: a small circle (avatar placeholder) in the top-left, two horizontal rounded rectangles of different widths (text line placeholders), and a small square in the bottom-right (button placeholder). All placeholder shapes are zinc-800 (#27272a) with a subtle shimmer animation (lighter band sweeping left to right). Rounded corners (16px) on cards. No text, no icons — pure placeholder shapes.

Style: clean minimalist UI skeleton wireframe. Dark mode. SaaS application.

Negative: text, icons, color, photographic, detailed, people
```

## Parameters

| Param     | Value                              |
| --------- | ---------------------------------- |
| Tool      | Code (Tailwind CSS + `@keyframes`) |
| Format    | React components                   |
| Animation | CSS shimmer, 1.5s infinite         |

## Placement

- `packages/frontend/src/components/ui/skeleton.tsx` (base component — may already exist from shadcn)
- `packages/frontend/src/components/session/skeleton-snippet-card.tsx`
- `packages/frontend/src/components/session/skeleton-question-card.tsx`
- Used as fallback in clipboard-panel and qa-panel while data loads

## Implementation Notes

- Check if shadcn/ui `Skeleton` primitive exists in the project — if so, extend it
- The shimmer effect uses a CSS `@keyframes` animation, not JavaScript
- Skeleton dimensions should closely match real content to prevent layout shift
- Use `aria-hidden="true"` and `role="status"` with screen reader text "Loading..."
