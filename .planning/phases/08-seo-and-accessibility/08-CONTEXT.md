# Phase 8: SEO and Accessibility - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Search engines index the landing page correctly (with OG image and metadata), session pages are excluded from indexing, and all interactive components are usable by keyboard and screen reader users. The product name is **clip**, domain is **clip.nasqa.io**, deployed on Netlify.

</domain>

<decisions>
## Implementation Decisions

### OG Image & Metadata

- Landing page OG image: abstract branded graphic (brand colors and shapes, no screenshot, no text beyond the logo)
- Session page OG title format: "Session Title by Host Name"
- Session page OG description: dynamic session status (e.g., "Live now — 12 questions asked" or "Ended — 24 questions")
- Landing page OG description/tagline: Claude's discretion
- Twitter/X card type: summary_large_image for all pages
- Session OG images: static branded image (same as landing page), not dynamically generated
- Structured data: JSON-LD with WebApplication schema on the landing page
- Canonical domain: clip.nasqa.io (no www, no trailing slashes)

### Screen Reader Announcements

- New questions in Q&A feed: count-only announcements ("3 new questions"), not full content
- Vote actions: announce only the user's own action ("You upvoted this question. 5 votes total.")
- Host actions (dismiss, pin): Claude's discretion on what to announce
- Politeness level: aria-live="polite" for Q&A feed announcements (wait for current reading to finish)

### Keyboard Navigation

- Skip-to-content link: yes, targeting the Q&A feed, hidden visually until first Tab press
- Focus ring style: custom rings matching the design system (brand colors, visible offset), not browser defaults
- New-content banner focus behavior: Claude's discretion
- Q&A feed navigation pattern (roving tabindex vs tab-per-question): Claude's discretion

### Indexing & Crawling

- Indexed pages: landing page + all locale variants (e.g., /en, /es)
- Session pages: blocked by both robots.txt Disallow AND noindex meta tag (belt-and-suspenders)
- Sitemap: static sitemap.xml listing landing page and locale variants
- Hreflang: yes, each locale page links to alternatives via hreflang tags

### Claude's Discretion

- Landing page tagline/meta description copy
- Host action screen reader announcement strategy
- New-content banner focus management for keyboard users
- Q&A feed keyboard navigation pattern (roving tabindex vs tab stops)
- OG image visual design details (exact colors, composition)

</decisions>

<specifics>
## Specific Ideas

- Product name in all metadata is "clip" (not "nasqa" or "nasqa.live")
- Domain is clip.nasqa.io — all canonical URLs, structured data, and sitemap must use this
- Session status in OG description should be dynamic and reflect real state (live/ended + question count)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 08-seo-and-accessibility_
_Context gathered: 2026-03-16_
