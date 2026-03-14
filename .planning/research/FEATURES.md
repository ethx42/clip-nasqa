# Feature Landscape

**Domain:** Real-time presentation session tools (live clipboard + audience Q&A)
**Researched:** 2026-03-13
**Confidence note:** Web search and WebFetch tools were unavailable during this session. All findings are based on training knowledge of Slido, Mentimeter, Pigeonhole Live, and the broader live-audience-interaction category (knowledge cutoff August 2025). Confidence is MEDIUM — these tools' feature sets are stable and well-documented, but specific edge-case behaviors should be verified before claiming competitive parity.

---

## Table Stakes

Features users expect in any live session/Q&A tool. Missing = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Session creation with shareable link/code | Entry point for everything; no link = no audience | Low | Nasqa: slug + QR code covers this |
| QR code join flow | Conference WiFi typing is painful; QR is default expectation at tech talks | Low | Nasqa: already specified |
| Anonymous participation (no signup) | Friction kills adoption; audience won't create accounts mid-talk | Low | Nasqa: core design principle |
| Real-time question submission | The whole point — latency above 2-3s feels broken to submitters | Medium | Nasqa: sub-200ms target |
| Upvoting questions | Surfaces the best questions; without it the list is noise | Low | Nasqa: atomic DynamoDB increments |
| Questions sorted by votes | Default sort expected; chronological is secondary | Low | Part of the upvote UX contract |
| Host moderation: hide/delete content | Without this, one bad actor ruins the session | Low | Nasqa: host superuser delete + ban |
| Mobile-responsive participant view | Most audience members join on phones | Medium | Nasqa: web-first responsive |
| Session join via short URL or code | QR is primary, but short URL/code is fallback for those who can't scan | Low | Nasqa: slug-based URL covers this |
| Visual indicator that session is live | Participants need to know they're connected and the session is active | Low | Implied by real-time design; needs explicit "live" badge |
| Content visible without interaction | Lurkers (majority of audience) must be able to read without submitting | Low | Pure read path must work |
| Rate limiting on submissions | Without it, bots/trolls flood the feed | Low | Nasqa: 3 req/min for public |

## Differentiators

Features that set a product apart. Not universally expected, but create strong preference or loyalty.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Live code clipboard with syntax highlighting | No other Q&A tool is optimized for code sharing; this is the core Nasqa differentiator | High | Shiki dual-theme, language attribute, host-push model |
| Host-pushed clipboard model (pull-not-push) | Audience doesn't navigate to code; it appears. Eliminates "what slide are they on?" problem | Medium | The UX inversion is the differentiator |
| Hero prominence for latest clipboard item | Mirrors a presenter's slide focus; audience always sees what's current | Low | Reverse-chrono feed + Hero top card |
| Speaker reply with visual distinction | Signals authority; audience can distinguish speaker answer from peer comments | Low | Nasqa: emerald border + "Speaker" badge |
| Focus mode (pin a question) | Lets host signal "we're answering this now" — high value in fast Q&A | Low | Nasqa: isFocused pulsing glow |
| Community-driven downvote moderation | Distributes moderation burden without exposing host to doing it manually in real-time | Medium | 50% threshold auto-hide; novel in this category |
| Auto-ban for repeated bad actors | Persistent enforcement without host attention; 3-strike rule | Medium | Device fingerprint + strike counter |
| One-level reply threading | Gives context to answers without chat-room complexity | Low | Nasqa: one level, speaker replies prominent |
| Dual theme (light/dark) with no layout shift | High-quality UX signal; Shiki dual-theme eliminates the flash most tools have | Medium | Shiki dual compilation approach |
| Zero-account anonymous identity with optional name | Optional self-identification without mandatory signup; trust without friction | Low | localStorage fingerprint + optional name field |
| Sub-100ms optimistic UI | Feels instant even on slow conference WiFi; better than competitors | High | Requires careful conflict resolution |
| i18n for non-English tech communities | Spanish and Portuguese speaker communities underserved by English-only tools | Medium | next-intl, en/es/pt |
| 24-hour auto-expiry as a feature (not limitation) | Privacy-first, no data retention anxiety; speakers won't worry about Q&A living forever | Low | TTL is a design principle, not a constraint |
| IaC zero-ops deployment | Speaker can self-host for a conference without DevOps knowledge | High | SST Ion `sst deploy` |

## Anti-Features

Features to explicitly NOT build. Building these would dilute focus or contradict core design principles.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| User accounts / persistent login | Friction kills adoption; accounts contradict ephemeral-by-design philosophy | Device fingerprint + optional name for identity |
| Polls and word clouds | Turns the tool into Mentimeter; dilutes the code-clipboard differentiation | Stay focused on clipboard + Q&A vertical |
| Presentation slide upload/control | Becomes a full presentation platform (Prezi territory); out of scope | Let speakers use their existing slide tools |
| Chat / general messaging | Creates IRC-style noise; Q&A is structured, chat is not | Q&A with replies covers structured discourse |
| Reactions / emoji responses | Clutters the UI; adds complexity without clarity | Upvote is the single engagement primitive |
| Session recording / transcription | Requires storage, processing, and raises privacy concerns | 24h TTL is a privacy feature; recording contradicts it |
| Export / download Q&A history | Same privacy concern as recording; also encourages archival thinking | No persistence beyond 24h; by design |
| Multiple simultaneous sessions per host | Complicates the UX; the host-secret model is per-session | One slug = one session |
| Admin dashboard / analytics | Out of scope for v1; adds backend complexity without audience value | Session-level vote counts are sufficient signal |
| Audience clipboard posting | Turns the feed into a wiki; the curation value comes from host-only posting | Host-only clipboard is a feature |
| Native mobile app | Doubles the codebase; web-responsive is sufficient for 50-500 participant scale | Responsive web app on Next.js |
| Persistent participant profiles | Contradicts anonymous-by-default; creates data retention liability | localStorage token + optional session-scoped name |
| Email notifications / digests | Requires collecting email at scale; contradicts ephemeral design | Optional email stored but not used for notifications |
| AI question summarization | Adds latency, cost, and complexity for marginal value in a 50-500 person session | Human upvoting is sufficient signal at this scale |
| Nested reply threading | Past one level, threads become unreadable on mobile; Slack proved this | One-level replies only |

---

## Feature Dependencies

```
Session creation (slug, hostSecret, QR)
  → Clipboard feed (requires active session)
      → Snippet posting (requires host auth)
          → Syntax highlighting (requires snippet + language attr)
          → Snippet delete / clear (requires host auth)
      → Hero prominence (requires >=1 snippet)

  → Q&A feed (requires active session)
      → Question submission (requires session + rate limiter)
          → Upvoting (requires question + localStorage dedup)
          → Downvote moderation (requires question + connected count)
          → Reply threading (requires question)
              → Speaker reply badge (requires host auth)
          → Focus mode / pin (requires host auth)
          → Host delete / ban (requires host auth)

  → Device fingerprint (prerequisite for: upvote dedup, auto-ban, optional identity)
      → Optional participant name (requires fingerprint)
      → Auto-ban (requires fingerprint + strike counter per session)

Real-time broadcast (AppSync subscription)
  → All above features depend on this for live delivery
  → Optimistic UI depends on this for reconciliation

i18n routing
  → Landing page (marketing)
  → Session shell (labels only, not user content)
```

---

## MVP Recommendation

The MVP must prove the core value proposition: **a speaker pushes code and the audience sees it instantly, asks questions, and the best ones surface to the top.**

Prioritize for MVP:
1. Session creation + QR join (table stakes — without this, nothing else works)
2. Real-time AppSync subscription channel per session (the infrastructure that everything rides on)
3. Clipboard feed with host-push snippets + Shiki syntax highlighting (the core differentiator)
4. Q&A submission + upvoting (the core Q&A loop)
5. Host moderation: delete + hide (minimum viable trust model)
6. Device fingerprint for identity (prerequisite for upvote dedup and moderation)
7. 24h TTL cleanup (operational hygiene from day one)

Defer but build in Phase 2:
- Community downvote moderation (requires connected-count; more complex than host-only mod)
- Auto-ban (depends on downvote + strike tracking)
- Focus mode / pin
- Speaker reply badge
- Optional participant name/email
- i18n (en only for MVP; es + pt in Phase 2)
- Rate limiting hardening beyond basic DynamoDB conditions

Defer to Phase 3 or later:
- Optimistic UI sub-100ms (works correctly first, then optimize)
- IaC polish / `sst deploy` single-command (scaffolding exists; productionize later)
- Landing/marketing page (ship to early users first, then market)

---

## Competitive Context

**Slido** (Cisco): Full Q&A + polls + word clouds + quiz. Heavy, enterprise-oriented. Requires account. Strong integration story (Google Slides, PowerPoint). Table stakes for corporate events. NOT a model for Nasqa — too broad and too account-dependent.

**Mentimeter**: Primarily polls and word clouds with Q&A as secondary. Presenter-controlled slide deck of interactions. Strong visual design. Account required. No code-aware features whatsoever. Audience for corporate trainers, not devs.

**Pigeonhole Live**: Q&A + polls + agenda + networking. Conference-scale (1000s of attendees). Branded portals. Enterprise pricing. Far too complex for a 50-500 person tech talk.

**sli.do (same as Slido post-Cisco acquisition)**: Identical to Slido above.

**Kahoot**: Gamified quizzes. No Q&A. Completely different use case.

**The gap Nasqa fills**: None of these tools is optimized for **code**. They treat all content as equal text. A developer giving a workshop who wants to share a snippet, a command, or a config file has no good option. Nasqa's clipboard model with Shiki syntax highlighting is the gap. The Q&A is real, but the clipboard is the hook.

---

## Sources

- Domain knowledge of Slido, Mentimeter, Pigeonhole Live, Kahoot, sli.do feature sets (training data, cutoff August 2025) — MEDIUM confidence
- PROJECT.md requirements specification (authoritative for Nasqa scope) — HIGH confidence
- Web search and WebFetch tools were unavailable; official product feature pages were not consulted in this session. Competitive feature lists should be verified against current product pages before claiming parity or gap.
