# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-15)

**Core value:** Real-time clipboard and Q&A with sub-200ms latency across all connected devices — if the audience can't see what the speaker shares instantly, the product fails
**Current focus:** Milestone v1.1 - Enterprise Hardening (Phase 6: Testing and CI)

## Current Position

Phase: 6 of 8 (Testing and CI)
Plan: 3 of 3 complete
Status: Phase complete
Last activity: 2026-03-16 — 06-03 complete: GitHub Actions CI pipeline with 4 parallel jobs (lint, typecheck, test, bundle-size) and npm/.next caching

Progress: [████████████░░░░░░░░] 60% (v1.0 complete, v1.1 Phase 6 complete, Phases 7-8 remaining)

## Performance Metrics

**Velocity:**

- Total plans completed: 16 (v1.0)
- Average duration: 5 min
- Total execution time: ~1.3 hours

**By Phase:**

| Phase                             | Plans | Total  | Avg/Plan |
| --------------------------------- | ----- | ------ | -------- |
| 01-infrastructure                 | 3     | 10 min | 5 min    |
| 02-session-and-view-shell         | 3     | 10 min | 3 min    |
| 03-real-time-core                 | 6     | 30 min | 5 min    |
| 04-moderation-identity-and-polish | 4     | 20 min | 5 min    |
| 05-code-quality-gates             | 2     | 18 min | 9 min    |

**Recent Trend:**

- Last 5 plans: 04-01 (3 min), 04-02 (5 min), 04-03 (12 min), 04-04 (paused at task 2/2)
- Trend: stable

_Updated after each plan completion_

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v1.1 Roadmap]: Compress 7 research phases to 4 (quick depth) — QUAL merged into Phase 5; TEST+CICD merged into Phase 6; ERR+OBS merged into Phase 7; SEO+A11Y merged into Phase 8
- [v1.1 Research]: Pre-commit hooks must use `--config packages/frontend/eslint.config.mjs` explicitly — ESLint 9 flat config resolves relative to cwd, not package root
- [v1.1 Research]: Vitest cannot test async Server Components — test strategy document needed before authoring begins (Playwright handles async RSCs)
- [v1.1 Research]: Sentry `hostSecret` URL scrubbing is non-optional security requirement — must be in all three Sentry configs before any production traffic
- [v1.1 Research]: `aria-live` regions must be unconditionally mounted before content appears — architectural constraint, not cosmetic addition
- [05-01]: eslint-disable-next-line for react-hooks/set-state-in-effect must be on the line before the first setState call inside the effect, not before the useEffect() declaration
- [05-01]: lint-staged.config.mjs (ESM extension) avoids needing "type: module" in root package.json
- [05-01]: Defensive "prepare": "husky || true" prevents CI failures when devDependencies are skipped
- [05-02]: Root tsconfig.json must exclude packages/frontend — root has no include restriction so tsc at root picks up all TSX files without JSX support producing hundreds of false errors
- [05-02]: useRef -> useState when ref values are read during render — react-hooks/refs rule prohibits .current access in render; tracked state is safe to read in render
- [06-01]: aws-sdk-client-mock-vitest v7 requires `import "aws-sdk-client-mock-vitest/extend"` in setupFiles — bare import no longer registers matchers (breaking change from v6)
- [06-01]: vitest functions project needs setupFiles to register aws-sdk-client-mock-vitest matchers globally across all resolver test files
- [06-01]: test.projects API used (not deprecated vitest.workspace.ts) — vitest run not vitest for CI-safe non-watch execution
- [06-02]: Real next-intl messages used in component tests (no useTranslations mocks) — wrapping in NextIntlClientProvider with en.json catches translation key mismatches
- [06-02]: Bundle size script uses rootManifestFiles + polyfillFiles from build-manifest.json — paths are relative to .next/ not /\_next/
- [06-02]: 156.7kB initial JS baseline documented — aws-amplify ~68kB alone exceeds 80kB budget; CI must use continue-on-error until aws-amplify replaced
- [06-03]: bundle-size job uses continue-on-error: true — aws-amplify adds ~68kB gzipped (known Phase 3 constraint); remove when replaced
- [06-03]: Job names (lint, typecheck, test, bundle-size) must match exactly when configuring branch protection required status checks
- [06-03]: Branch protection must be configured manually after first CI run on main — GitHub only shows check names that have run within 7 days
- [06-03]: Frontend typecheck runs as separate step (npx tsc --noEmit -p packages/frontend/tsconfig.json) — root tsconfig excludes frontend (Phase 5 decision)

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 6]: SST Ion + GitHub Actions OIDC IAM permissions — exact IAM policy for `sst deploy --stage production` not documented in official SST Ion docs; needs empirical derivation during planning
- [Phase 7]: AppSync `beforeSend` filter signatures — exact error strings from Amplify WebSocket reconnect cannot be pre-specified; plan for one tuning iteration after first live session
- [Phase 8]: `aria-live` debounce for rapid upvote updates — 500ms quiet-period pattern correct in principle but needs VoiceOver/NVDA empirical validation during implementation

## Session Continuity

Last session: 2026-03-16
Stopped at: Milestone v1.3 definition started — requirements and roadmap pending
Resume file: None
