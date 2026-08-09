# Position Sequential Scroll Reveal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `Position` section's statement lines reveal one at a time as
the visitor scrolls, instead of arriving as a cluster, and extend the
statement with 3 new lines.

**Architecture:** No new animation mechanism. `WeaveReveal`'s existing
`whileInView` already triggers per line independently; widening the vertical
gap between lines is what serializes the reveals across scroll position. The
gap moves from a fixed Tailwind utility to a responsive CSS custom property so
`WeaveThreadNode`'s connector line can read the same value instead of a
hand-matched constant.

**Tech Stack:** Next.js, React, Tailwind CSS v4 (arbitrary properties:
`[--var:value]`), Framer Motion (`whileInView`, unchanged), Vitest +
Testing Library.

## Global Constraints

- Never use `text-white` in this section — existing test enforces this and
  the reason is: `text-sky`/`text-paper` are the only navy-background text
  colors verified against the 4.5:1 AA contrast floor here.
- No new visible heading — the section keeps its accessible name from
  `aria-label="Position"` only, per the original brief (§5).
- New copy is not client-approved — carries the same in-code flag as the
  original 3 lines (see `D8` comment in `Position.tsx`).
- No changes to `WeaveReveal` or `WeaveThreadNode` components themselves —
  both already expose the props this needs.
- Run `npm test` (= `vitest run`) before every commit in this plan.

---

### Task 1: Extend the statement to 6 lines

**Files:**
- Modify: `src/components/sections/Position.tsx` (currently 51 lines; `LINES`
  at lines 9-13, `STYLES` at lines 22-26, the `map` body at lines 36-46)
- Modify: `src/components/sections/Position.test.tsx` (full file, 46 lines)

**Interfaces:**
- Consumes: `WeaveReveal` (`from`, `delay`, `children` props — unchanged),
  `WeaveThreadNode` (`delay`, `hasNext`, `gap` props — unchanged signatures).
- Produces: `Position` component still default-exported the same way from the
  same path; no other file imports `LINES`/`STYLES` directly, so this task is
  self-contained.

- [ ] **Step 1: Replace the test file to expect 6 lines**

Overwrite `src/components/sections/Position.test.tsx` with:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Position } from './Position'

// D8: the plan gave no copy for this section at all. These six lines (the three
// originally approved-pending, plus three added later as a second beat) are the
// implementer's, not the client's, and are flagged for sign-off in the Task 14 brief
// and docs/superpowers/specs/2026-08-09-position-scroll-reveal-design.md — they are
// asserted verbatim here so a future rewrite cannot silently drift them further, the
// same failure that hit Tasks 12 and 13.
describe('Position', () => {
  const LINES = [
    'We make built-in furniture for homes, apartments, hotels and offices.',
    'Every piece is measured on site before anything is cut.',
    'A standard-size unit leaves gaps. A fitted one does not.',
    'Every material is chosen to last, not just to look good on day one.',
    'The same team measures, builds and installs — start to finish.',
    'Fit it once. It will not need fitting again.',
  ]

  it('carries all six lines verbatim, in order', () => {
    const { container } = render(<Position />)
    for (const line of LINES) {
      expect(screen.getByText(line)).toBeInTheDocument()
    }
    const text = container.textContent ?? ''
    const positions = LINES.map((line) => text.indexOf(line))
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1])
    }
  })

  it('says nothing else — no invented copy beyond the six approved lines', () => {
    const { container } = render(<Position />)
    const paragraphs = container.querySelectorAll('p')
    expect(paragraphs).toHaveLength(6)
  })

  it('never uses text-white', () => {
    const { container } = render(<Position />)
    expect(container.innerHTML).not.toMatch(/text-white/)
  })

  // F2: a bare <section> with no accessible name is not exposed as a landmark
  // region. This section is display lines with no heading of its own (a heading
  // over them would be noise, per the brief), so it earns its accessible name from
  // aria-label instead of a visible <h2> (brief §5).
  it('exposes an accessible name on the section, with no visible heading', () => {
    render(<Position />)
    expect(screen.getByRole('region', { name: 'Position' })).toBeInTheDocument()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test -- src/components/sections/Position.test.tsx`

Expected: FAIL — `carries all six lines verbatim, in order` and `says nothing
else` both fail, because `Position.tsx` still only renders 3 lines.

- [ ] **Step 3: Update `Position.tsx` with the 6-line content**

Replace the whole file with:

```tsx
import { Fragment } from 'react'
import { WeaveReveal } from '@/components/weave/WeaveReveal'
import { WeaveThreadNode } from '@/components/weave/WeaveThread'
import { WeaveTexture } from '@/components/weave/WeaveTexture'

// D8: the plan described this section only as "three short lines... what we make, who
// we make it for, and the fit argument" with no copy supplied. Lines 1-3 are NOT
// client-approved and are flagged for sign-off — see the Task 14 brief. Lines 4-6 were
// added afterward as a second beat (durability, team continuity), same not-yet-approved
// status — see docs/superpowers/specs/2026-08-09-position-scroll-reveal-design.md.
const LINES = [
  'We make built-in furniture for homes, apartments, hotels and offices.',
  'Every piece is measured on site before anything is cut.',
  'A standard-size unit leaves gaps. A fitted one does not.',
  'Every material is chosen to last, not just to look good on day one.',
  'The same team measures, builds and installs — start to finish.',
  'Fit it once. It will not need fitting again.',
]

// Big → small → big, twice over: two "beats" of opening claim / supporting detail /
// closing contrast, each cycling through the same three styles via `i % 3` so the
// second beat (lines 4-6) reads with the same rhythm as the first (lines 1-3) instead
// of needing new styles. The opening claim and closing contrast earn display type; the
// supporting fact between them steps down to body copy instead of shouting at the same
// volume as its neighbours. That step down also carries text-sky rather than
// text-paper — on solid navy (no photo overlay to dim it, unlike Hero) sky measures
// 7.8:1, well past the 4.5:1 AA floor, so the supporting lines read quieter without
// reading as low-contrast. Never text-white on any line.
const STYLES = [
  'font-display text-2xl font-medium leading-snug tracking-tight text-paper sm:text-3xl lg:text-4xl',
  'max-w-md font-body text-base leading-relaxed text-sky sm:text-lg',
  'font-display text-2xl font-semibold leading-snug tracking-tight text-paper sm:text-3xl lg:text-4xl',
]

const STAGGER = 0.3
const THREAD_GAP = '3rem'

export function Position() {
  return (
    <section aria-label="Position" className="relative overflow-hidden bg-navy py-28">
      <WeaveTexture />
      <div className="relative z-10 mx-auto grid max-w-4xl grid-cols-[1.25rem_1fr] gap-x-4 gap-y-12 px-6 sm:grid-cols-[2rem_1fr] sm:gap-x-8">
        {LINES.map((line, i) => {
          const delay = i * STAGGER
          return (
            <Fragment key={line}>
              <WeaveThreadNode delay={delay} hasNext={i < LINES.length - 1} gap={THREAD_GAP} />
              <WeaveReveal from={i % 2 === 0 ? 'left' : 'right'} delay={delay}>
                <p className={STYLES[i % 3]}>{line}</p>
              </WeaveReveal>
            </Fragment>
          )
        })}
      </div>
    </section>
  )
}
```

Note: this step deliberately keeps `gap-y-12`/`THREAD_GAP` as-is — the
spacing refactor is Task 2. This step only proves the content change on its
own.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm test -- src/components/sections/Position.test.tsx`

Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/Position.tsx src/components/sections/Position.test.tsx
git commit -m "feat: extend Position section with 3 additional statement lines"
```

---

### Task 2: Widen the reveal spacing so lines arrive one scroll at a time

**Files:**
- Modify: `src/components/sections/Position.tsx:20-21` (the `THREAD_GAP`
  constant) and the grid `<div>` (`className`) plus the `WeaveThreadNode`
  `gap` prop, all inside the `Position` function from Task 1's result.

**Interfaces:**
- Consumes: `WeaveThreadNode`'s `gap: string` prop (from
  `src/components/weave/WeaveThread.tsx:14-22`) — it is interpolated
  verbatim into `calc(100% + ${gap})`, so any valid CSS length string works,
  including `var(--pos-gap)`.
- Produces: no new exports; this is the final state of `Position.tsx`.

- [ ] **Step 1: Replace the fixed gap with a responsive CSS variable**

In `src/components/sections/Position.tsx`, delete the line:

```tsx
const THREAD_GAP = '3rem'
```

Change the grid `<div>`'s `className` from:

```tsx
className="relative z-10 mx-auto grid max-w-4xl grid-cols-[1.25rem_1fr] gap-x-4 gap-y-12 px-6 sm:grid-cols-[2rem_1fr] sm:gap-x-8"
```

to:

```tsx
className="relative z-10 mx-auto grid max-w-4xl grid-cols-[1.25rem_1fr] gap-x-4 gap-y-[var(--pos-gap)] px-6 [--pos-gap:4rem] sm:grid-cols-[2rem_1fr] sm:gap-x-8 sm:[--pos-gap:5.5rem] lg:[--pos-gap:7rem]"
```

Change the `WeaveThreadNode` call from:

```tsx
<WeaveThreadNode delay={delay} hasNext={i < LINES.length - 1} gap={THREAD_GAP} />
```

to:

```tsx
<WeaveThreadNode delay={delay} hasNext={i < LINES.length - 1} gap="var(--pos-gap)" />
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`

Expected: PASS — all suites green, including
`src/components/sections/Position.test.tsx` (content assertions are
unaffected by the spacing change) and `src/app/page.test.tsx` (section
ordering only, unaffected).

- [ ] **Step 3: Manually verify the scroll behavior in a browser**

Run: `npm run dev`

Open the site, scroll to the Position section, and confirm:
- On first arriving at the section, only the first line ("We make built-in
  furniture...") is visible/animated in; the rest of the section is still
  below the fold.
- Scrolling down reveals each subsequent line individually, with the yellow
  thread node/connector animating alongside it, rather than several lines
  appearing at once.
- Resize to a mobile width (or use device toolbar) and confirm the same
  one-at-a-time behavior holds without excessive dead scroll space between
  lines.
- With OS "reduce motion" enabled (or `prefers-reduced-motion: reduce` in
  devtools), confirm all 6 lines render immediately, fully visible, with no
  animation — this path is driven by `useMotionLevel`, untouched by this
  plan, but worth confirming nothing regressed.

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/Position.tsx
git commit -m "feat: widen Position's reveal spacing so lines arrive one scroll at a time"
```
