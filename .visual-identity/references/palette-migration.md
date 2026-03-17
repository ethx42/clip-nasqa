# Palette Migration: Emerald → Indigo

**Decision date:** 2026-03-16
**Status:** APPROVED — ready for implementation

## New Palette

### Primary: Indigo

| Token                  | Light Mode                                          | Dark Mode |
| ---------------------- | --------------------------------------------------- | --------- |
| `--primary`            | `oklch(0.585 0.233 277.117)` / Indigo-500 `#6366f1` | same      |
| `--primary-foreground` | `oklch(1 0 0)` / White                              | same      |
| `--ring`               | `oklch(0.585 0.233 277.117)` / Indigo-500           | same      |

### Destructive: Rose (unchanged)

| Token           | Light Mode                  | Dark Mode                   |
| --------------- | --------------------------- | --------------------------- |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` |

### Warning: Amber (NEW token)

| Token                  | Light Mode                              | Dark Mode                              |
| ---------------------- | --------------------------------------- | -------------------------------------- |
| `--warning`            | `oklch(0.769 0.188 70.08)` / Amber-500  | same                                   |
| `--warning-foreground` | `oklch(0.555 0.163 48.998)` / Amber-700 | `oklch(0.769 0.188 70.08)` / Amber-500 |

### Success: Green (NEW token — live dot only)

| Token       | Light Mode                                         | Dark Mode |
| ----------- | -------------------------------------------------- | --------- |
| `--success` | `oklch(0.723 0.219 142.495)` / Green-500 `#22c55e` | same      |

### Upvote Accent: Amber

Upvote uses `--warning` token (amber). Warm positive energy, distinct from cool indigo brand.

### Chart tokens

| Token       | Value                      |
| ----------- | -------------------------- |
| `--chart-1` | Indigo-500                 |
| `--chart-2` | Indigo-400                 |
| `--chart-3` | Indigo-600                 |
| `--chart-4` | Indigo-700                 |
| `--chart-5` | Violet-500 (complementary) |

### Sidebar tokens

All `--sidebar-primary` and `--sidebar-ring` → Indigo-500

## Migration Scope

### globals.css

- Replace all `--primary`, `--ring`, `--chart-*`, `--sidebar-primary`, `--sidebar-ring` values from emerald oklch to indigo oklch
- Add `--warning`, `--warning-foreground`, `--success` tokens for both modes

### Component files (50+ emerald references)

Every `emerald-*` class must be replaced with `indigo-*`:

- `emerald-500` → `indigo-500`
- `emerald-600` → `indigo-600`
- `emerald-400` → `indigo-400`
- `emerald-500/10` → `indigo-500/10`
- `emerald-500/20` → `indigo-500/20`
- `emerald-500/30` → `indigo-500/30`
- `emerald-500/8` → `indigo-500/8`

### Exceptions (NOT indigo)

- `live-indicator.tsx` connected dot: `bg-emerald-500` → `bg-green-500`
- `live-indicator.tsx` connected text: `text-emerald-600 dark:text-emerald-400` → `text-green-600 dark:text-green-400`
- `question-card.tsx` upvote active: `text-emerald-500` → `text-amber-500`
- `question-card.tsx` downvote: `text-rose-500` → `text-destructive` (fix existing bug)
- `live-indicator.tsx` connecting: `yellow-*` → `text-warning-foreground` / `bg-warning`
- `question-card.tsx` hidden badge: `amber-500` → `warning` token

### Hardcoded hex fix

- `question-card.tsx:180` shadow rgba: `rgba(16,185,129,0.15)` → `rgba(99,102,241,0.15)`
- `opengraph-image.tsx`: all `#10b981` → `#6366f1`
- `global-error.tsx`: `#10b981` → `#6366f1`

### DESIGN_SYSTEM.md updates

- Primary color: Emerald-500 → Indigo-500
- All emerald references in component examples → indigo
- Gradient: `from-emerald-400 to-emerald-600` → `from-indigo-400 to-indigo-600`
- Badge example: `bg-emerald-500/10 text-emerald-600` → `bg-indigo-500/10 text-indigo-600`

### style-anchor.md updates

- All emerald hex references → indigo
- Color table → new palette

### Prompt files

- All 8 prompt files reference emerald → update to indigo

## Files Affected (complete list)

- `packages/frontend/src/app/globals.css`
- `packages/frontend/DESIGN_SYSTEM.md`
- `packages/frontend/src/app/[locale]/page.tsx`
- `packages/frontend/src/app/[locale]/layout.tsx`
- `packages/frontend/src/app/[locale]/not-found.tsx`
- `packages/frontend/src/app/[locale]/session/[slug]/error.tsx`
- `packages/frontend/src/app/opengraph-image.tsx`
- `packages/frontend/src/app/global-error.tsx`
- `packages/frontend/src/components/session/clipboard-panel.tsx`
- `packages/frontend/src/components/session/qa-panel.tsx`
- `packages/frontend/src/components/session/question-card.tsx`
- `packages/frontend/src/components/session/reply-list.tsx`
- `packages/frontend/src/components/session/session-shell.tsx`
- `packages/frontend/src/components/session/live-indicator.tsx`
- `packages/frontend/src/components/session/new-content-banner.tsx`
- `packages/frontend/src/components/session/copy-button.tsx`
- `packages/frontend/src/components/session/host-input.tsx`
- `packages/frontend/src/components/session/qa-input.tsx`
- `packages/frontend/src/components/session/identity-editor.tsx`
- `packages/frontend/src/components/session/join-modal.tsx`
- `packages/frontend/src/components/session/snippet-hero.tsx`
- `packages/frontend/src/lib/linkify.tsx`
- `.visual-identity/references/style-anchor.md`
- `.visual-identity/prompts/*.md` (all 8 files)
