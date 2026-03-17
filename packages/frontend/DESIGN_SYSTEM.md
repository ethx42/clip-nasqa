# nasqa Design System

Guidelines for all views. Every new page or component refactor must follow these principles.

## Core Philosophy

**"Calm confidence"** — The UI should feel spacious, focused, and effortless. Every element earns its place. When in doubt, remove.

## Typography

- **Headlines**: Poppins 800 (extrabold), tight tracking (`tracking-tight`), large sizes (3xl–6xl)
- **Subheadlines**: Poppins 500 (medium), relaxed leading, muted color (`text-muted-foreground`)
- **Body**: Poppins 400, base size, `leading-relaxed`
- **Labels/Badges**: Poppins 600–700, uppercase `tracking-widest`, xs–sm size
- **Code**: JetBrains Mono 400–500
- **Hierarchy rule**: Max 3 font sizes per section. If you need a 4th, simplify.

## Spacing

- **Section padding**: `py-20 lg:py-28` for major sections
- **Card padding**: `p-6 lg:p-8`
- **Vertical rhythm**: Use `space-y-6` or `gap-6` as baseline. `space-y-4` for tight groups.
- **Max content width**: `max-w-2xl` for text-heavy, `max-w-4xl` for mixed, `max-w-6xl` for full layouts
- **Breathing room**: Always add generous whitespace around CTAs and key moments

## Color

- **Primary**: Indigo-500 (`oklch(0.585 0.233 277.117)`)
- **Primary subtle**: `indigo-500/10` for backgrounds, `indigo-500/20` for borders
- **Text**: `text-foreground` for primary, `text-muted-foreground` for secondary
- **Destructive**: Rose/Red tones — only for irreversible actions
- **Gradients**: Use sparingly. Prefer `from-indigo-400 to-indigo-600` for hero accents
- **Rule**: No more than 3 colors in any single view (indigo + neutral + one accent)

## Components

### Cards

- `rounded-2xl border border-border bg-card shadow-sm`
- Hover state: `hover:shadow-md hover:border-indigo-500/30 transition-all duration-200`
- No nested cards. If content needs grouping inside a card, use `bg-muted/30 rounded-xl`

### Buttons

- **Primary CTA**: `bg-indigo-500 text-white rounded-xl px-6 py-3 font-bold` with `hover:bg-indigo-600`
- **Secondary**: `border border-border bg-background hover:bg-accent rounded-xl`
- **Ghost**: `hover:bg-accent rounded-lg`
- Min touch target: 44px height on mobile
- Always include focus ring: `focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`

### Inputs

- `rounded-xl border border-input bg-background px-4 py-3`
- Focus: `focus:ring-2 focus:ring-indigo-500 focus:border-transparent`
- Large, comfortable sizing. Never smaller than `py-3`

### Badges/Pills

- `rounded-full px-3 py-1 text-xs font-semibold`
- Use `bg-indigo-500/10 text-indigo-600 dark:text-indigo-400` for status
- Subtle, never shouty

## Layout Patterns

### Hero Sections

- Centered, single-column
- Large headline + short subtitle + single CTA
- Generous vertical padding (`py-24 lg:py-32`)
- Optional: subtle radial gradient behind hero content

### Content Pages (success, settings)

- Centered, `max-w-2xl`, `py-12 lg:py-16`
- Clear visual hierarchy: one primary action, secondary info below

### Session Pages

- Full-height (`h-[calc(100dvh-53px)]`)
- Two-column on desktop, tabbed on mobile
- Sticky headers, scrollable content areas

## Motion

- **Entrances**: `duration-200` ease-out, translate-y or opacity
- **Hover**: `transition-all duration-200`
- **Scale**: `hover:scale-[1.02] active:scale-[0.98]` only on primary CTAs
- **Rule**: Motion should be felt, not seen. If you notice the animation, it's too much.

## Imagery

- Use illustrations/images for empty states and hero sections
- Place in `/public/images/`
- Prefer SVG for icons and illustrations, WebP/AVIF for photos
- Always provide descriptive alt text

## Dark Mode

- Every color must work in both modes
- Use semantic tokens (`bg-card`, `text-foreground`, `border-border`) instead of hardcoded colors
- Test both modes before shipping

## Accessibility

- All interactive elements must have visible focus states
- Color contrast: WCAG AA minimum (4.5:1 for text, 3:1 for large text)
- Touch targets: 44x44px minimum on mobile
- Semantic HTML: use `<main>`, `<section>`, `<nav>`, `<article>` appropriately
- All images need alt text; decorative images use `aria-hidden`

## Anti-Patterns (do NOT do)

- Emoji as icons (use Lucide React instead)
- More than one primary CTA per viewport
- Borders AND shadows on the same element (pick one)
- Text smaller than `text-sm` (13px) for any readable content
- Neon/glowing effects
- Excessive rounding (no `rounded-full` on cards)
