---
phase: 19-segments-visual-overhaul-and-voting
plan: "02"
subsystem: frontend/session-ui
tags: [voting, tooltips, icon-button, threading, spine, input-anatomy, ux-polish]
dependency_graph:
  requires:
    - "19-01"
  provides:
    - IconButton component with @base-ui Tooltip integration
    - Reddit-style vertical VoteRow (up, count, down)
    - Tooltips on all icon-only buttons across the app
    - Mathematical thread spine alignment
    - Avatar-inside-input reply anatomy
    - Enterprise-grade information density and vertical rhythm
  affects:
    - packages/frontend/src/components/ui/icon-button.tsx
    - packages/frontend/src/components/session/question-card-shared.tsx
    - packages/frontend/src/components/session/question-card-participant.tsx
    - packages/frontend/src/components/session/question-card-host.tsx
    - packages/frontend/src/components/session/reply-list.tsx
    - packages/frontend/src/components/session/snippet-card.tsx
    - packages/frontend/src/components/session/copy-button.tsx
    - packages/frontend/src/components/session/clipboard-panel.tsx
    - packages/frontend/src/components/session/host-input.tsx
    - packages/frontend/src/components/session/host-toolbar.tsx
    - packages/frontend/src/components/app-header.tsx
    - packages/frontend/src/components/hamburger-menu.tsx
    - packages/frontend/src/app/globals.css
tech_stack:
  added:
    - "@base-ui/react/tooltip (Tooltip.Provider, Tooltip.Root, Tooltip.Trigger, Tooltip.Positioner, Tooltip.Popup)"
  patterns:
    - IconButton wraps any icon-only button with built-in Tooltip (400ms delay)
    - VoteRow: h-16 w-8 vertical layout with net score display
    - ThreadSpine: absolute w-[1.5px] div at left-[6px], no border-left or gradient fade
    - Avatar-inside-input: 20px PixelAvatar embedded as left-prefix inside input border
    - Progressive disclosure: Edit+Delete primary, moderation behind Popover overflow menu
key_files:
  created:
    - packages/frontend/src/components/ui/icon-button.tsx
  modified:
    - packages/frontend/src/components/session/question-card-shared.tsx
    - packages/frontend/src/components/session/question-card-participant.tsx
    - packages/frontend/src/components/session/question-card-host.tsx
    - packages/frontend/src/components/session/reply-list.tsx
    - packages/frontend/src/components/session/snippet-card.tsx
    - packages/frontend/src/components/session/copy-button.tsx
    - packages/frontend/src/components/session/clipboard-panel.tsx
    - packages/frontend/src/components/session/host-input.tsx
    - packages/frontend/src/components/session/host-toolbar.tsx
    - packages/frontend/src/components/app-header.tsx
    - packages/frontend/src/components/hamburger-menu.tsx
    - packages/frontend/src/app/globals.css
decisions:
  - "IconButton uses @base-ui/react Tooltip with 400ms delay — all icon-only buttons get self-documenting tooltips"
  - "VoteRow vertical layout: h-16 w-8 with net score (upvotes - downvotes) — Reddit-style"
  - "Progressive disclosure for host tools: Edit+Delete visible, Focus/Ban/BanParticipant behind Popover overflow"
  - "Intent-based reply inputs: ghost input only in threaded view, Reply trigger activates standalone input"
  - "ThreadSpine: absolute div w-[1.5px] at left-[6px] — mathematical alignment, no gradient fade-out"
  - "Avatar-inside-input: 20px PixelAvatar as left-prefix inside input border container"
  - "Send button: primary indigo only when text present, muted when empty"
  - "ChevronDown when thread closed, ChevronUp when open (was MessageSquare)"
  - "--border light mode: oklch(0.90 0.005 240) for quieter but visible spine/dividers"
  - "Vote neutral state: text-muted-foreground/50 — not destructive on downvote"
  - "Dark mode --muted-foreground: oklch(0.70) for WCAG accessibility"
metrics:
  duration: "~45 min (multi-session iterative refinement)"
  completed: "2026-03-20"
  tasks_completed: 3
  files_modified: 13
---

# Phase 19 Plan 02: Enterprise UX Overhaul Summary

**One-liner:** IconButton with Tooltip on all icon-only buttons, Reddit-style voting, mathematical spine alignment, avatar-inside-input reply anatomy, and enterprise-grade information density across 10+ iterative refinement rounds.

## Tasks Completed

| Task | Name                                                       | Commits                                              | Key Files                                                                            |
| ---- | ---------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1    | IconButton with Tooltip, VoteRow, host action bar ordering | 96ef4cf                                              | icon-button.tsx, question-card-shared, host, participant                             |
| 2    | Tooltips on all remaining icon-only buttons across the app | e43bd48                                              | snippet-card, copy-button, clipboard-panel, host-toolbar, app-header, hamburger-menu |
| 3    | Visual verification + iterative refinement (10+ rounds)    | 021d1d7, ae097f1, 640f3b8, a8967fb, 5540da4, f0c8e8d | question-card-shared, host, participant, reply-list, globals.css                     |

## What Was Built

### Task 1: IconButton, VoteRow, Host Action Bar

- **IconButton** (`icon-button.tsx`): Reusable wrapper with @base-ui/react Tooltip (400ms delay), 44px min touch targets, semantic tooltip styling
- **VoteRow** (`question-card-shared.tsx`): Reddit-style vertical voting — ChevronUp, net score, ChevronDown — with semantic color states (primary when active, muted-foreground/50 neutral)
- **Host action bar**: Progressive disclosure — Edit+Delete as primary visible actions, Focus/Ban/BanParticipant behind Popover overflow menu
- **Participant action bar**: Edit/Delete within 5-min window using IconButton

### Task 2: App-Wide Tooltip Coverage

- All icon-only buttons across snippet-card, copy-button, clipboard-panel, host-toolbar, app-header, and hamburger-menu converted to IconButton with descriptive tooltips

### Task 3: Iterative Enterprise UX Refinement (10+ rounds)

- **Spine alignment**: ThreadSpine refactored from border-left to absolute div w-[1.5px] at left-[6px], removed gradient fade-out tail
- **Input anatomy**: Reply input avatar (20px) embedded inside input border as left-prefix, ghost/active state toggle on container
- **Vertical rhythm**: ThreadSpine pb-2, reply input pt-1, reply items pb-2, eliminated dead zones
- **Action bar logic**: ChevronDown when closed (was MessageSquare), Reply trigger hidden when thread expanded
- **Identity badges**: text-[10px] font-bold uppercase text-primary with bg-primary/10 border (Stripe/Linear style)
- **Send button**: Primary color only when text present, muted when empty
- **Shortcut hint**: ⌘⏎ contrast increased from muted-foreground/40 to muted-foreground
- **Global theming**: --border light oklch 0.92→0.90, dark --muted-foreground oklch(0.70) for WCAG

## Deviations from Plan

- VoteRow ended up vertical (h-16 w-8) instead of horizontal — better information density in segment layout
- Extensive iterative refinement rounds (10+) added spine alignment, input anatomy, vertical rhythm, and theming changes not in original plan scope — driven by user visual critique

## Self-Check: PASSED

Build: `tsc --noEmit` passes cleanly. All pre-commit hooks pass (lint, format, typecheck).
