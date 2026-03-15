# Phase 5: Code Quality Gates - Research

**Researched:** 2026-03-15
**Domain:** Pre-commit hooks, ESLint/Prettier integration, TypeScript strict mode, monorepo tooling
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| QUAL-01 | Pre-commit hooks block commits that fail lint or typecheck (Husky + lint-staged) | Husky v9.1.7 + lint-staged v16.4.0 setup pattern documented; existing lint errors must be fixed first |
| QUAL-02 | Prettier enforces consistent formatting on staged files with import sorting | Prettier 3.8.1 + @ianvs/prettier-plugin-sort-imports; `--write` on pre-commit via lint-staged |
| QUAL-03 | TypeScript strict mode standardized across all packages (root, core, frontend, functions) | Root tsconfig.json already has `"strict": true`; all packages extend it; frontend tsconfig also has `strict: true` — verification pass is the main task |
</phase_requirements>

---

## Summary

This phase establishes automated code quality enforcement so no new lint, format, or type errors can enter the repo via a git commit. The three tools involved are: **Husky v9** (runs Git hooks), **lint-staged v16** (runs commands only on staged files), and **Prettier v3** (formats code). ESLint is already installed in the frontend package; the gate just needs wiring.

The most important discovery: **the repo currently has 10 ESLint errors** in staged/modified files (primarily `react-hooks/set-state-in-effect` and `@typescript-eslint/no-explicit-any` violations). These errors exist in files already modified in the working tree. Before the pre-commit hook can block new errors, the existing errors must be fixed — otherwise the first `git commit` will immediately fail on already-modified files. This clean-up is part of Wave 1.

TypeScript strict mode is already consistently enabled: `"strict": true` is set in the root `tsconfig.json` and all three package tsconfigs extend from root. The frontend `tsconfig.json` also has its own `"strict": true`. QUAL-03 is primarily a verification task to confirm this is correct and that `tsc --noEmit` passes cleanly across all four compile surfaces (root, core, frontend, functions).

**Primary recommendation:** Install Husky + lint-staged + Prettier at the root. Fix the 10 existing lint errors. Wire up pre-commit hook to run `lint-staged` which invokes `eslint --fix` then `prettier --write` on staged files. Add `prettier --check` as a pre-push hook for CI alignment. Confirm TypeScript passes across all packages.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| husky | 9.1.7 | Manages Git hook scripts | De facto standard; zero-config `npx husky init`; adds `prepare` script automatically |
| lint-staged | 16.4.0 | Runs commands only on staged files | Prevents slow full-repo lints; pairs with Husky for pre-commit |
| prettier | 3.8.1 | Opinionated code formatter | Removes all formatting debates; native TypeScript/JSX/JSON support |
| eslint-config-prettier | 10.1.8 | Disables ESLint rules that conflict with Prettier | Required when both ESLint and Prettier touch formatting |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @ianvs/prettier-plugin-sort-imports | ^4.x | Sorts import declarations by configurable regex groups | QUAL-02 requires import sorting; this is the maintained fork of @trivago/prettier-plugin-sort-imports |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @ianvs/prettier-plugin-sort-imports | @trivago/prettier-plugin-sort-imports | @trivago has known Prettier v3 compatibility issues; @ianvs is the maintained fork |
| lint-staged per-package `.lintstagedrc` | root `lint-staged.config.js` with glob routing | Per-package is cleaner for large monorepos; root config is simpler for 3-package repos |
| prettier --write in pre-commit | prettier --check only | `--write` auto-formats and re-stages, reducing friction; `--check` blocks but requires manual fix |

**Installation (root-level):**
```bash
npm install --save-dev --save-exact husky lint-staged prettier eslint-config-prettier @ianvs/prettier-plugin-sort-imports
```

---

## Architecture Patterns

### Recommended File Structure
```
nasqa-live/                          # git root = npm workspace root
├── .husky/
│   └── pre-commit                   # runs lint-staged
├── .prettierrc.json                 # Prettier config (root)
├── .prettierignore                  # Exclude build artifacts
├── lint-staged.config.js            # OR "lint-staged" key in root package.json
├── package.json                     # "prepare": "husky"
├── tsconfig.json                    # strict: true (already present)
└── packages/
    ├── core/
    │   └── tsconfig.json            # extends ../../tsconfig.json (already present)
    ├── frontend/
    │   ├── eslint.config.mjs        # flat config (already present)
    │   └── tsconfig.json            # strict: true (already present)
    └── functions/
        └── tsconfig.json            # extends ../../tsconfig.json (already present)
```

### Pattern 1: Husky + lint-staged Wiring (monorepo root)

**What:** Husky installs at the root (where `.git` lives). lint-staged configuration can live in root `package.json` or a `lint-staged.config.js`.

**When to use:** Always — hooks must be at the git root.

**Setup commands:**
```bash
# Run once from project root
npx husky init
# This creates .husky/pre-commit and adds "prepare": "husky" to root package.json
```

**`.husky/pre-commit`:**
```sh
npx lint-staged
```

### Pattern 2: lint-staged Configuration with ESLint Flat Config

**Critical note from STATE.md:** ESLint 9 flat config resolves relative to CWD, not package root. When lint-staged runs from the git root, ESLint will not find `packages/frontend/eslint.config.mjs` unless you pass `--config` explicitly.

**Root `lint-staged.config.js`:**
```js
// Source: lint-staged docs + ESLint flat config CWD resolution behavior
export default {
  // Frontend TS/TSX — must pass --config so ESLint finds the flat config
  "packages/frontend/**/*.{ts,tsx}": [
    "eslint --fix --config packages/frontend/eslint.config.mjs",
    "prettier --write",
  ],
  // All other TS files (core, functions) — no ESLint config for these packages yet
  "packages/{core,functions}/**/*.{ts}": ["prettier --write"],
  // JSON, Markdown, CSS
  "**/*.{json,md,css}": ["prettier --write"],
};
```

### Pattern 3: eslint-config-prettier Integration

**What:** Add `eslint-config-prettier/flat` as the LAST item in the ESLint flat config array. This disables any ESLint formatting rules that duplicate Prettier's output.

**`packages/frontend/eslint.config.mjs` update:**
```js
// Source: https://github.com/prettier/eslint-config-prettier
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  eslintConfigPrettier,  // MUST be last — disables conflicting rules
]);

export default eslintConfig;
```

### Pattern 4: Prettier Configuration

**`.prettierrc.json` (root):**
```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "plugins": ["@ianvs/prettier-plugin-sort-imports"],
  "importOrder": [
    "<BUILTIN_MODULES>",
    "",
    "<THIRD_PARTY_MODULES>",
    "",
    "^@nasqa/(.*)$",
    "",
    "^@/(.*)$",
    "",
    "^[./]"
  ],
  "importOrderParserPlugins": ["typescript", "jsx", "decorators-legacy"]
}
```

**`.prettierignore`:**
```
.next/
dist/
node_modules/
*.lock
sst-env.d.ts
```

**Note:** `prettier-plugin-tailwindcss` is not included because it must be loaded last and conflicts with import-sort plugins. The project uses Tailwind v4 with `tw-animate-css`; class sorting can be added as a separate concern if desired. Keep it out of Phase 5.

### Pattern 5: TypeScript Strict Verification

**What:** Run `tsc --noEmit` across all compile surfaces to confirm strict mode is consistent.

**Current state (verified by reading tsconfig files):**
- Root `tsconfig.json`: `"strict": true` ✅
- `packages/core/tsconfig.json`: extends root, inherits strict ✅
- `packages/functions/tsconfig.json`: extends root, inherits strict ✅
- `packages/frontend/tsconfig.json`: `"strict": true` explicitly set ✅

**Verification commands:**
```bash
# Check core and functions (root typecheck script)
npm run typecheck

# Check frontend
npx tsc --noEmit -p packages/frontend/tsconfig.json

# Check root SST config
npx tsc --noEmit
```

**Caveat:** The frontend typecheck currently produces 2 errors from `.next/types/validator.ts` referencing deleted debug pages. These will resolve on next `next build` or can be suppressed by excluding `.next/**` from tsconfig includes (already excluded in the frontend config via `exclude: ["node_modules"]` — the `.next` types are auto-included by the Next.js plugin). Running `next build` or `next dev` once regenerates the `.next/types/` directory.

### Anti-Patterns to Avoid

- **Running ESLint without `--config` from git root:** ESLint 9 flat config resolves from CWD. If lint-staged invokes `eslint` from the project root, it won't find `packages/frontend/eslint.config.mjs`. Always pass `--config packages/frontend/eslint.config.mjs`.
- **Using `eslint --fix` without `eslint-config-prettier`:** Risks ESLint auto-fixing formatting that Prettier will immediately undo, causing an infinite loop or noisy diffs.
- **Installing Husky in a subpackage:** Husky must be at the git root (`nasqa-live/`), not inside any `packages/*` directory.
- **Installing Prettier as a dependency (not devDependency):** Prettier is a dev tool only; add with `--save-dev --save-exact` to pin the version and prevent formatting drift.
- **Omitting `|| true` in prepare script when CI skips devDeps:** In CI environments that install with `--omit=dev`, `husky` won't exist. Use `"prepare": "husky || true"` to avoid install failures.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Run linters only on changed files | Shell script diffing git status | lint-staged | Handles staged file resolution, path passing, error propagation correctly |
| Format on save / commit | Custom Git hook shell scripts | Husky + lint-staged | Shell scripts break on path spaces, binary files, CI environments |
| Import ordering | Manual import groups, ESLint import rules | @ianvs/prettier-plugin-sort-imports | Handles re-exports, type imports, side-effect imports; integrates with Prettier atomically |
| ESLint+Prettier conflict resolution | Commenting out rules manually | eslint-config-prettier | Maintained list of 50+ conflicting rules that changes with ESLint releases |

**Key insight:** The pre-commit toolchain is deceptively complex to build from scratch. Each tool solves a specific scope problem: Husky handles hook lifecycle, lint-staged handles file scoping, Prettier handles formatting idempotency, eslint-config-prettier handles rule conflicts.

---

## Common Pitfalls

### Pitfall 1: Existing Lint Errors Block Every Commit
**What goes wrong:** After wiring up the pre-commit hook, every commit fails immediately because the 10 existing ESLint errors are in currently-modified files.
**Why it happens:** The modified files are re-staged with each commit attempt, and lint-staged runs ESLint on them.
**How to avoid:** Fix all existing lint errors BEFORE activating the pre-commit hook. The current errors are: `react-hooks/set-state-in-effect` (8 errors in `clipboard-panel.tsx`, `session-live-page.tsx`) and `@typescript-eslint/no-explicit-any` (1 error in `session-live-page.tsx`), plus 1 unused vars warning in `host-toolbar.tsx`.
**Warning signs:** `npm run lint` exits with code 1 before hooks are installed.

### Pitfall 2: ESLint CWD Resolution with Flat Config
**What goes wrong:** lint-staged calls `eslint --fix` from the repo root; ESLint 9 looks for `eslint.config.mjs` in the cwd (repo root), finds nothing, and either uses default config or errors out.
**Why it happens:** ESLint 9's flat config resolution is CWD-relative, not file-relative.
**How to avoid:** Always pass `--config packages/frontend/eslint.config.mjs` explicitly in the lint-staged config for frontend files.
**Warning signs:** ESLint reports "No config file found" or uses wrong rules.

### Pitfall 3: Frontend .next Types Causing TypeScript Errors
**What goes wrong:** Running `tsc --noEmit -p packages/frontend/tsconfig.json` fails with "Cannot find module '../../src/app/[locale]/debug/page.js'" — referencing deleted debug pages.
**Why it happens:** The `.next/types/validator.ts` file is generated by `next build`/`next dev` and still references the now-deleted debug route.
**How to avoid:** Run `next build` or `next dev` once to regenerate `.next/types/`. Alternatively, delete `.next/` and rebuild. This is not a code error — it's a stale artifact.
**Warning signs:** TypeScript errors pointing to `.next/types/validator.ts`.

### Pitfall 4: eslint-config-prettier Not Last in Config Array
**What goes wrong:** Some ESLint formatting rules (e.g., `indent`, `quotes`) remain active and conflict with Prettier's output. Auto-fix may create an unstable state.
**Why it happens:** `eslint-config-prettier` only disables rules that appear AFTER it in the config array.
**How to avoid:** Always place `eslintConfigPrettier` as the last element in the `defineConfig([...])` array.
**Warning signs:** Running `eslint --fix` then `prettier --write` changes files back and forth.

### Pitfall 5: Husky prepare Script Failing in CI
**What goes wrong:** `npm ci` fails in GitHub Actions because `husky` isn't available when devDependencies are skipped.
**Why it happens:** `npm ci --omit=dev` skips devDependencies but still runs `prepare`.
**How to avoid:** Use `"prepare": "husky || true"` in root `package.json`. Phase 6 (CI/CD) will handle this properly — but set it up defensively now.
**Warning signs:** CI install step exits with error about `husky: command not found`.

---

## Code Examples

### Minimal Husky + lint-staged Wiring

```bash
# Source: https://typicode.github.io/husky/get-started.html
npx husky init
# Creates .husky/pre-commit with "npm test" and adds "prepare": "husky" to package.json
```

Then replace `.husky/pre-commit` content:
```sh
#!/usr/bin/env sh
npx lint-staged
```

### lint-staged Config with ESLint Flat Config (JS module format)

```js
// lint-staged.config.js — root of project
// Source: https://github.com/lint-staged/lint-staged
export default {
  "packages/frontend/**/*.{ts,tsx}": [
    "eslint --fix --config packages/frontend/eslint.config.mjs --no-warn-ignored",
    "prettier --write",
  ],
  "packages/{core,functions}/**/*.ts": ["prettier --write"],
  "**/*.{json,md,css,yml}": ["prettier --write"],
};
```

Note: `--no-warn-ignored` suppresses warnings when ESLint is passed files it doesn't match (ESLint 9 flat config only).

### eslint-config-prettier/flat Integration

```js
// packages/frontend/eslint.config.mjs
// Source: https://github.com/prettier/eslint-config-prettier
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  eslintConfigPrettier,  // Last — disables conflicting formatting rules
]);

export default eslintConfig;
```

### Verify No ESLint/Prettier Conflict

```bash
# Run this after setup to confirm no remaining conflicts
npx eslint-config-prettier packages/frontend/eslint.config.mjs
```

### TypeScript Verification Across All Packages

```bash
# core + functions (via root scripts)
npm run typecheck

# frontend (separate because Next.js plugin involvement)
npx tsc --noEmit -p packages/frontend/tsconfig.json

# sst.config.ts at root (uses root tsconfig.json)
npx tsc --noEmit
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `.eslintrc.json` per-package | `eslint.config.mjs` flat config | ESLint 9 (2024) | CWD-relative resolution; must pass `--config` explicitly in lint-staged |
| `husky install` in prepare | `husky` (no args) in prepare | Husky v9 (2024) | Simpler; `npx husky init` bootstraps everything |
| `prettier --write` on all files | `prettier --write` via lint-staged on staged files only | lint-staged v10+ | 10x faster pre-commit on large repos |
| `eslint-plugin-prettier` | `eslint-config-prettier` only | Community shift ~2022 | Plugin runs Prettier as an ESLint rule (slow, noisy); config just disables conflicts |
| `@trivago/prettier-plugin-sort-imports` | `@ianvs/prettier-plugin-sort-imports` | 2023 | @trivago has unresolved Prettier v3 compat issues; @ianvs is active fork |

**Deprecated/outdated:**
- `eslint-plugin-prettier`: Running Prettier inside ESLint is slow and produces confusing error messages. Use `eslint-config-prettier` instead (disables conflicting rules) and run Prettier separately.
- `husky add .husky/pre-commit "..."`: Deprecated in Husky v9; manually create/edit files in `.husky/` instead.
- `pretty-quick`: Outdated wrapper; lint-staged handles this natively now.

---

## Open Questions

1. **Should ESLint be added to core and functions packages?**
   - What we know: Currently only `packages/frontend` has ESLint. Core and functions have no `eslint.config.mjs`.
   - What's unclear: QUAL-01 says "block commits that fail lint" — does this mean lint for all packages or just frontend?
   - Recommendation: Install ESLint only for frontend in Phase 5 (it's the only package with an existing config). Document that core/functions linting can be added in a future phase. The lint-staged config should skip ESLint for core/functions and only run Prettier on them.

2. **Should the pre-commit hook run typecheck?**
   - What we know: QUAL-01 says "lint or typecheck." Typecheck for core+functions takes ~3 seconds currently. Frontend typecheck with Next.js plugin is slower (~10s).
   - What's unclear: The requirement says "Husky + lint-staged" but typecheck is not lint-staged (it can't run per-file). Full typecheck on every commit may slow workflow.
   - Recommendation: Add `npm run typecheck` to the pre-commit hook (run after lint-staged), NOT inside lint-staged. Skip frontend full typecheck in pre-commit to keep it under 15 seconds; run it in CI instead. Document this tradeoff.

3. **Prettier options — tabs vs spaces, quotes, trailing commas**
   - What we know: No existing Prettier config; the codebase uses 2-space indentation and double quotes (verified from existing source files).
   - What's unclear: No explicit project preference documented.
   - Recommendation: Default to Prettier defaults (`"semi": true, "singleQuote": false, "trailingComma": "all", "printWidth": 100`) since no existing config establishes a preference. First Prettier run will reformat many files — commit that as a dedicated "style: apply initial Prettier formatting" commit.

---

## Sources

### Primary (HIGH confidence)
- https://typicode.github.io/husky/get-started.html — Husky v9 init process, prepare script pattern
- https://typicode.github.io/husky/how-to.html — Monorepo/subproject hook setup
- https://github.com/prettier/eslint-config-prettier — `/flat` import for ESLint 9, placement requirement
- https://github.com/lint-staged/lint-staged — Per-package config discovery, command format
- Direct codebase inspection: `packages/frontend/eslint.config.mjs`, all `tsconfig.json` files, `npm run lint` output

### Secondary (MEDIUM confidence)
- https://prettier.io/docs/install — Install pattern, `.prettierrc` creation
- https://www.npmjs.com/package/prettier — Version 3.8.1 confirmed current
- https://github.com/IanVS/prettier-plugin-sort-imports — @ianvs import sorting plugin
- https://github.com/eslint/eslint/discussions/16960 — ESLint 9 flat config in monorepo discussion

### Tertiary (LOW confidence)
- https://dev.to/monfernape/enforce-husky-pre-commit-with-eslint-prettier-in-monorepo-55jc — Monorepo pre-commit pattern
- https://nitpum.com/post/lint-staged-eslint-monorepo/ — lint-staged + ESLint monorepo patterns

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All versions confirmed via `npm info`, official docs read directly
- Architecture: HIGH — Based on direct codebase inspection + official tool documentation
- Pitfalls: HIGH — Pitfall 1 (existing lint errors) and Pitfall 3 (stale .next types) verified empirically by running the commands; others verified via official docs
- TypeScript strict status: HIGH — All tsconfig.json files read directly

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable tooling; Prettier 4.0 alpha exists but 3.x is stable)
