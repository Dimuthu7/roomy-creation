# How we work: horizontal pinned journey

**Date:** 2026-08-11
**Status:** implemented, then superseded 2026-08-11 — see [Addendum](#addendum-2026-08-11-scroll-jacking-replaced-with-a-click-drag-book) below. Kept as the historical record of the original design; the current behavior is the addendum.

## Problem

`HowWeWork` (`src/components/sections/HowWeWork.tsx`) renders 5 steps as a flat
`md:grid-cols-5` row of bordered boxes. Each box only carries a number, a title,
and a `leadTime` field that always renders as an em dash (`TBC`, never
confirmed). Reveal animation is a `WeaveReveal` `whileInView` fade/slide that
fires for all 5 items in quick, near-simultaneous succession the moment the
section scrolls into view — the row reads as static and thin on content. The
user wants the section to feel more attractive, animated, and give each step
real content, without losing the "row of steps" identity the current design
has.

## Approach

Reuse the pinned-scroll architecture already validated on `Position`
(`src/components/sections/Position.tsx`, see
`docs/superpowers/specs/2026-08-09-position-scroll-reveal-design.md`): a
`position: sticky` track held for a scroll distance proportional to step
count, with the active step computed from a plain `scroll` listener via the
existing pure function `activeScrollStep` (`src/lib/scrollProgress.ts`) — no
Framer Motion `useScroll`, which needs `ResizeObserver`/layout measurement
jsdom cannot provide.

Where this diverges from `Position`: `Position` crossfades one block of text
in place (vertical, opacity-only). `HowWeWork` instead translates a horizontal
row of cards (`x` transform), so the active card sits centered at full size
while its neighbors stay visible but shrunk and dimmed at the edges. This was
chosen over a `Position`-style centered crossfade specifically to preserve the
current design's "row of 5 cards" identity and read as a left-to-right
process, and to avoid the section feeling like a visual duplicate of
`Position` elsewhere on the page. Same discrete per-step index math either
way — only the transform target differs (`x` instead of `opacity`/`y`).

Two alternatives were considered and rejected:

- **Centered crossfade, `Position`-style.** Simpler and already proven, but
  visually near-identical to `Position`, and loses the "5 cards in a row"
  identity the current design already has.
- **Continuous (non-stepped) horizontal scroll**, where card position tracks
  scroll offset 1:1 rather than snapping between 5 discrete indices. Rejected:
  the project's established constraint (see the `Position` spec and prior
  feedback on it) is that reveals must read as discrete, one-at-a-time beats
  tied to distinct scroll actions, not continuous motion — the same
  `activeScrollStep` discretization `Position` uses applies here too.

## Content model

Replace `Step { number, title, leadTime }` with:

```ts
interface Step {
  number: string
  title: string
  description: string
  icon: 'enquiry' | 'measurement' | 'drawings' | 'manufacture' | 'installation'
}
```

`leadTime`/`TBC`/`isTBC` is removed from this section entirely — description
text replaces the dash, and there is no remaining use for the "to be
confirmed" lead-time placeholder here. (`src/lib/tbc.ts` itself is untouched;
other sections may still use it.)

Description copy is new, one short sentence per step, and **not
client-approved** — flagged in a code comment the same way `Position`'s
copy is, so a future pass knows it needs sign-off:

1. Enquiry — short line on getting in touch / starting the conversation.
2. Site measurement — visiting site, taking precise measurements before
   anything is drawn.
3. Drawings, materials and quotation — turning measurements into drawings,
   material choices, and a quote.
4. Manufacture — building the piece to spec.
5. Installation and handover — fitting on site and handover.

Icons: 5 custom single-color inline SVG line icons (stroke-based, no new
dependency — this project has no icon library), one concept per step
(enquiry/contact, ruler/tape measure, pencil/ruler, factory/saw,
home/checkmark), styled navy by default and navy-on-yellow when their card is
the active "Site measurement" card.

## Full-motion behavior (`useMotionLevel() === 'full'`)

New `PinnedHowWeWork`, structured like `Position`'s `PinnedPosition`:

- Outer `<section>`: `height: ${STEP_VH * 5}vh`, `STEP_VH = 45` (shorter than
  `Position`'s `55` — each step is lighter content: icon + title + one
  sentence vs. fuller prose).
- Inner wrapper: `sticky top-0 h-screen`, holding the horizontal card track.
- `active` index (0-4): `activeScrollStep(rect.top, rect.height,
  window.innerHeight, 5)`, same scroll-listener effect pattern as
  `PinnedPosition` (attach on mount, compute once immediately, clean up on
  unmount).
- Track: `motion.div` with `animate={{ x: -active * CARD_SPACING }}`,
  `transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}` — same easing
  curve as `Position`.
- Per card: active card renders at full size — number, icon, title,
  description all visible/legible. Non-active cards scale down
  (`scale: 0.92`) and dim (`opacity: ~0.35-0.4`) but stay on screen (not
  `opacity: 0`) so the row identity reads as a journey, not a crossfade.
- "Site measurement" (index 1) keeps the yellow-block + larger display-type
  treatment from the current design, but only while active — toggled by
  `isActive` rather than the current permanent `i === 1` check.
- A slim `01-05` progress indicator (dots or a thin bar) sits below the track,
  since only roughly 1.5 cards are visible at a time and the step count/
  position needs to stay legible.

## Reduced-motion / mobile fallback

New `CompactHowWeWork`, selected whenever `useMotionLevel() !== 'full'` (same
split as `Position`'s `Position()` wrapper choosing between `PinnedPosition`
and `CompactPosition`):

- Same `<ol>`/`md:grid-cols-5` layout as today, each `<li>` showing icon +
  number + title + description via `WeaveReveal` (alternating
  left/right, existing per-item stagger).
- No pinning, no scroll-jacking.
- "Site measurement" keeps its permanent yellow block here (no active-state
  toggle needed, since nothing crossfades in this variant) — same as the
  section's current behavior today.

## Implementation notes

- `<ol>`/`<li>` list semantics are preserved in both variants — the
  horizontal track wrapper goes inside each `<li>`, not between `<ol>` and
  `<li>`, per the existing code comment in `HowWeWork.tsx` about screen
  readers losing "list, 5 items" if a stray element breaks the list.
- `DriftingModule` (the decorative sideways-drifting silhouette) is unchanged.
- If the horizontal track's per-card spacing needs its own calculation beyond
  reusing `activeScrollStep` directly, extract it as a pure function alongside
  `scrollProgress.ts`, following the same directly-unit-testable precedent
  (jsdom layout values are always zero, so anything geometry-dependent must be
  testable without real layout).
- `HowWeWork.test.tsx` is updated to cover: the new description/icon content
  per step, the removed lead-time field, and the "Site measurement" active-only
  yellow treatment in the pinned variant vs. permanent yellow in the compact
  variant.

## Out of scope

- No changes to `Position.tsx`, `scrollProgress.ts`, `WeaveReveal.tsx`,
  `DriftingModule`, or global styles/theme tokens — all reused as-is.
- No new icon library dependency.
- No change to the `src/lib/tbc.ts` helper itself (only this section's use of
  it is removed).

## Addendum (2026-08-11): scroll-jacking replaced with a click/drag book

Shipped as designed above, then changed same-day on direct user feedback
after reviewing it live: the pinned/scroll-jacked track left a large empty
gap between the heading and the cards (the sticky wrapper reserved a full
viewport height to center itself in), and the decorative `DriftingModule`
box read as a stray UI element rather than a flourish. The user also wanted
the cards to work like pages in a book — turned by the visitor, not by the
page scroll.

What changed in `src/components/sections/HowWeWork.tsx`:

- `PinnedSteps` (scroll listener + `activeScrollStep` + horizontal `x`
  track) is replaced by `BookSteps`: all 5 steps stay mounted, absolutely
  stacked in one fixed-size frame, with only the active one exposed to
  sighted/assistive-tech users (`aria-hidden` on the rest — the standard
  accessible-carousel pattern). The active page is `0deg`; the others sit
  rotated `±78deg` on the Y axis and invisible (`opacity: 0`), giving a
  page-turn effect when the active index changes.
- Navigation is entirely visitor-driven: next/prev buttons, clickable dots
  (each with a descriptive `aria-label`), left/right arrow keys on the
  focused book, or a drag/swipe on the open page (`drag="x"` with a 60px
  offset threshold). No `scroll` event listener, no `activeScrollStep` call,
  no pinned/`sticky` track.
- The heavy yellow/large-type treatment is no longer hardcoded to "Site
  measurement" (index 1) in the full-motion variant — it now follows
  whichever page is currently open, on further user feedback that the
  emphasis should track the active card generically. The compact fallback
  grid (`CompactSteps`, reduced motion / mobile) is unchanged: it still
  gives "Site measurement" the treatment permanently, since nothing there
  has a concept of an "active" card.
- `DriftingModule` and its `src/lib/drift.ts` helper are deleted, not just
  hidden — nothing else referenced `driftX`.

Everything under "Content model" above (the `Step` interface, the 5
descriptions, the icon set) is unchanged. `useMotionLevel() !== 'full'`
still renders `CompactSteps`, unchanged. The "Out of scope" list above still
holds, except that `DriftingModule` is now gone rather than untouched.
