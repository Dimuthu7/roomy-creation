# Position section: sequential scroll reveal

**Date:** 2026-08-09
**Status:** approved by user, pending implementation plan

## Problem

`Position` (`src/components/sections/Position.tsx`) renders three short statement
lines in a compact grid (`gap-y-12`, ~3rem). Each line already animates in via
`WeaveReveal`'s `whileInView`, but because all three sit close enough together to
fit inside a single viewport, they arrive as a fast cluster rather than one at a
time as the visitor scrolls. The user wants the section to feel more animated and
give each line its own scroll "beat": load the first line on entry, then reveal
each subsequent line only as the visitor scrolls further, and wants the
statement itself extended with 2-3 more points.

## Approach

Reuse the existing scroll-triggered reveal mechanism (`WeaveReveal`'s
`whileInView`, already per-element and already IntersectionObserver-stubbed in
tests via `src/test/browserStubs.ts`) rather than building a new scroll-linked
mechanism. The reveals already fire independently per line; what currently
defeats the "one at a time" feel is spacing, not the animation itself. Widening
the vertical gap between lines is enough to serialize the reveals across scroll
position.

Two alternatives were considered and rejected:

- **Scroll-linked pinned section** (Framer Motion `useScroll`/`useTransform`,
  section sticks to the viewport while lines cross-fade against scroll
  progress). Rejected: `HowWeWork.tsx` already documents why this project
  avoids `useScroll` — it depends on layout measurement
  (`ResizeObserver`/`getBoundingClientRect`) that jsdom cannot provide
  meaningfully, making the behavior effectively untestable here. Also a much
  larger structural change than this section warrants.
- **Bigger stagger, same spacing.** Rejected: with lines still packed into one
  viewport, most reveals would still fire at the same scroll position — a
  faster cascade, not a genuine one-line-per-scroll experience.

## New copy

Three new lines are added, continuing the existing big → small → big rhythm as
a second "beat" (the first beat already argues what/how/fit; the second argues
durability and continuity of the team):

4. "Every material is chosen to last, not just to look good on day one." (big)
5. "The same team measures, builds and installs — start to finish." (small)
6. "Fit it once. It will not need fitting again." (big)

Like the existing three, this copy is **not client-approved** — it carries the
same in-code flag as the original three lines (see the `D8` comment already in
`Position.tsx`) so a future pass knows it needs sign-off, and the locking test
(below) prevents silent drift the same way it already does for lines 1-3.

## Implementation

**`src/components/sections/Position.tsx`**

- `LINES`: extend to the 6 lines above, in order.
- `STYLES`: stays a 3-entry array (opener / support / closer, same three style
  strings as today). Indexed with `i % 3` instead of `i` directly, so the
  second beat (indices 3-5) reuses the same opener→support→closer visual
  rhythm as the first beat (indices 0-2) rather than needing new style
  strings.
- Left/right alternation (`i % 2`) and the existing per-line stagger delay
  (`i * STAGGER`) continue unchanged, now over 6 items instead of 3.
- Grid gap: replace the fixed `gap-y-12` utility with a responsive CSS custom
  property so the vertical rhythm widens on larger screens where there's more
  scroll room to spend:
  `[--pos-gap:4rem] sm:[--pos-gap:5.5rem] lg:[--pos-gap:7rem] gap-y-[var(--pos-gap)]`
  (horizontal gap classes are untouched).
- `THREAD_GAP` constant is deleted; `WeaveThreadNode` is passed
  `gap="var(--pos-gap)"` instead of a hardcoded `'3rem'`. This also fixes a
  latent fragility the current code comments flag explicitly: the thread
  connector's height (`calc(100% + gap)`) previously had to be hand-matched
  against the grid's own `gap-y-12` value; reading the same CSS variable both
  places means they cannot drift out of sync when the gap becomes responsive.

No changes to `WeaveReveal` or `WeaveThreadNode` — both already accept the
props this needs (`delay`, and `gap` as an arbitrary CSS length string).

**`src/components/sections/Position.test.tsx`**

- The "carries the three approved lines verbatim, in order" test and the
  "says nothing else" test (currently asserting exactly 3 `<p>` elements)
  both update to the 6-line list, generalizing the ordering assertion to a
  loop over consecutive pairs instead of three hardcoded comparisons.
- "never uses text-white" and the aria-label/no-heading landmark test are
  unchanged — the section still has no visible heading, consistent with the
  original brief.

## Out of scope

- No change to `WeaveReveal`, `WeaveThreadNode`, or any other section.
- No scroll-linked/pinned animation.
- No new visual "points" (bullets, numbers, icons) beyond the existing thread
  node markers — "points" in this task means additional statement lines, per
  user clarification during brainstorming.
