# How we work: horizontal pinned journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the `HowWeWork` section so each step gets a custom icon and a real description (replacing the always-em-dash lead-time field), and — at full motion — the row of 5 steps becomes a horizontally pinned scroll journey where the active step is full-size and centered while its neighbors peek dimmed at the edges.

**Architecture:** Reuses the pinned-scroll pattern already validated on `Position` (`src/components/sections/Position.tsx`): a `position: sticky` track held for a scroll distance proportional to step count, active index computed from a plain `scroll` listener via the existing pure function `activeScrollStep` (`src/lib/scrollProgress.ts`, unmodified). Diverges from `Position` by translating a horizontal row (`x` transform on the whole `<ol>`) instead of crossfading one block of text in place, so the current design's "row of cards" identity survives. `useMotionLevel() !== 'full'` (reduced motion or mobile) falls back to a normal, non-pinned grid — same split `Position` uses between `PinnedPosition`/`CompactPosition`.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS v4 (`@theme` tokens in `src/app/globals.css`), Framer Motion, Vitest + Testing Library.

## Global Constraints

- No new dependency: icons are custom inline SVG components, matching the existing pattern in `src/components/chrome/WhatsAppFloat.tsx` — this project has no icon library.
- Description copy is the implementer's draft, not client-approved. Flag it in a code comment, same convention as `Position.tsx`'s `D8` comment on its unapproved statement lines.
- The `<ol>`/`<li>` list must keep `<li>` as the ONLY direct children of `<ol>` in both variants — an intervening non-`li` element (e.g. a bare wrapping `<div>`) breaks the list's accessible semantics (a screen reader stops announcing "list, 5 items"). Put any Framer Motion animation directly on `motion.ol`/`motion.li`, not on a wrapper between them.
- `leadTime`/`TBC`/`isTBC` is removed from this section entirely; `src/lib/tbc.ts` itself is untouched (other sections still use it).
- Reuse `activeScrollStep` from `src/lib/scrollProgress.ts` as-is — do not modify it or add a parallel horizontal-position helper; the index math is identical, only the animated CSS property (`x` instead of `opacity`/`y`) differs.
- Reduced motion and mobile (`useMotionLevel() !== 'full'`) get the plain, non-pinned, non-scroll-jacked layout — no transforms tied to scroll in that mode.
- Never use `text-white` anywhere in this section (existing project-wide rule, already asserted by tests).
- Test commands in this plan use `npx vitest run <path>`; the project's `npm test` script is `vitest run`.

---

## Task 1: Step icons

**Files:**
- Create: `src/components/sections/HowWeWorkIcons.tsx`
- Test: `src/components/sections/HowWeWorkIcons.test.tsx`

**Interfaces:**
- Produces: `export const HOW_WE_WORK_ICONS: { enquiry, measurement, drawings, manufacture, installation }` — an object mapping each key to a `({ className }: { className?: string }) => JSX.Element` component. Task 2 imports this map and indexes it by each step's `icon` field.

- [ ] **Step 1: Write the failing test**

Create `src/components/sections/HowWeWorkIcons.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { HOW_WE_WORK_ICONS } from './HowWeWorkIcons'

const KEYS = ['enquiry', 'measurement', 'drawings', 'manufacture', 'installation'] as const

describe('HowWeWorkIcons', () => {
  it('exposes exactly the five step icons, each rendering a decorative svg', () => {
    expect(Object.keys(HOW_WE_WORK_ICONS).sort()).toEqual([...KEYS].sort())
    for (const key of KEYS) {
      const Icon = HOW_WE_WORK_ICONS[key]
      const { container } = render(<Icon />)
      const svg = container.querySelector('svg')
      expect(svg).not.toBeNull()
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    }
  })

  it('applies a passed className to the svg element, for size/color control per usage site', () => {
    const { container } = render(<HOW_WE_WORK_ICONS.measurement className="h-8 w-8 text-navy" />)
    expect(container.querySelector('svg')).toHaveClass('h-8', 'w-8', 'text-navy')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/sections/HowWeWorkIcons.test.tsx`
Expected: FAIL — `Failed to resolve import "./HowWeWorkIcons"` (file does not exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/components/sections/HowWeWorkIcons.tsx`:

```tsx
type IconProps = { className?: string }

export function EnquiryIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 5h16v11H9l-4 4v-4H4V5Z" />
      <circle cx="9" cy="10.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="10.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function MeasurementIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="9" width="18" height="6" rx="1" />
      <path d="M6 9v2M9 9v3M12 9v2M15 9v3M18 9v2" />
    </svg>
  )
}

export function DrawingsIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 20l1-4L16 5l3 3L8 19l-4 1Z" />
      <path d="M14 7l3 3" />
    </svg>
  )
}

export function ManufactureIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 20V11l4 2.5V11l4 2.5V11l4 2.5V9h3v11H3Z" />
      <path d="M6 20v-4M10 20v-4M14 20v-4" />
    </svg>
  )
}

export function InstallationIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 11l8-6 8 6" />
      <path d="M6 10v9h12v-9" />
      <path d="M9.5 14.5l1.8 1.8L15 12.5" />
    </svg>
  )
}

export const HOW_WE_WORK_ICONS = {
  enquiry: EnquiryIcon,
  measurement: MeasurementIcon,
  drawings: DrawingsIcon,
  manufacture: ManufactureIcon,
  installation: InstallationIcon,
} as const
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/sections/HowWeWorkIcons.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/HowWeWorkIcons.tsx src/components/sections/HowWeWorkIcons.test.tsx
git commit -m "feat: add custom icon set for How we work steps"
```

---

## Task 2: Step content model — descriptions and icons replace lead time

**Files:**
- Modify: `src/components/sections/HowWeWork.tsx`
- Modify: `src/components/sections/HowWeWork.test.tsx`

**Interfaces:**
- Consumes: `HOW_WE_WORK_ICONS` from `./HowWeWorkIcons` (Task 1).
- Produces: `HowWeWork` component (unchanged export name/signature — still `export function HowWeWork(): JSX.Element`, no props). Internal `Step` interface (`{ number: string; title: string; description: string; icon: keyof typeof HOW_WE_WORK_ICONS }`) and `STEPS: Step[]` constant, both referenced again in Task 3.

This task removes the lead-time field and gives every step a real description and icon, without yet adding the pinned scroll behavior — the section still renders as a static (but now content-rich) grid, exactly as `WeaveReveal` already reveals it today.

- [ ] **Step 1: Update the test file first**

Replace the full contents of `src/components/sections/HowWeWork.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { setPrefersReducedMotion } from '@/test/browserStubs'
import { HowWeWork } from './HowWeWork'

const TITLES = [
  'Enquiry',
  'Site measurement',
  'Drawings, materials and quotation',
  'Manufacture',
  'Installation and handover',
]

const DESCRIPTIONS = [
  'Tell us what you need and we start the conversation.',
  'We visit your site and take precise measurements before anything is drawn.',
  'Measurements become drawings, material choices and a firm quote.',
  'Your piece is built to spec in our workshop.',
  'We fit it on site and hand it over, ready to use.',
]

describe('HowWeWork', () => {
  it('never fades the small mono text to an opacity that fails AA', () => {
    const { container } = render(<HowWeWork />)
    expect(container.querySelectorAll('[class*="text-navy/"]')).toHaveLength(0)
  })

  it('keeps the five steps as direct children of the list', () => {
    render(<HowWeWork />)
    const list = screen.getByRole('list')
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    expect([...list.children].every((child) => child.tagName === 'LI')).toBe(true)
  })

  it('carries id="how"', () => {
    render(<HowWeWork />)
    expect(document.getElementById('how')).not.toBeNull()
  })

  it('carries a heading naming the section, above the step list', () => {
    render(<HowWeWork />)
    const heading = screen.getByRole('heading', { name: 'How we work' })
    const list = screen.getByRole('list')
    expect(heading.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('gives the section its accessible name from that heading', () => {
    render(<HowWeWork />)
    expect(screen.getByRole('region', { name: 'How we work' })).toBeInTheDocument()
  })

  it('renders the five step titles in the approved order', () => {
    const { container } = render(<HowWeWork />)
    const text = container.textContent ?? ''
    const positions = TITLES.map((title) => {
      expect(screen.getByText(title)).toBeInTheDocument()
      return text.indexOf(title)
    })
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1])
    }
  })

  it('gives each step a short description, in the approved order', () => {
    const { container } = render(<HowWeWork />)
    const text = container.textContent ?? ''
    const positions = DESCRIPTIONS.map((line) => {
      expect(screen.getByText(line)).toBeInTheDocument()
      return text.indexOf(line)
    })
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1])
    }
  })

  it('never shows the [TBC] sentinel or a lead-time dash', () => {
    const { container } = render(<HowWeWork />)
    expect(container.textContent).not.toContain('[TBC]')
    expect(screen.queryByText('—')).not.toBeInTheDocument()
  })

  it('gives each step card a decorative icon', () => {
    const { container } = render(<HowWeWork />)
    for (let i = 0; i < 5; i++) {
      const card = container.querySelector(`[data-testid="how-step-${i}"]`) as HTMLElement
      expect(card.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
    }
  })

  it('gives Site measurement, step two, the heaviest visual treatment', () => {
    const { container } = render(<HowWeWork />)
    const step2 = container.querySelector('[data-testid="how-step-1"]') as HTMLElement
    expect(step2).toHaveTextContent('Site measurement')
    expect(step2.className).toMatch(/bg-yellow/)
    const step1 = container.querySelector('[data-testid="how-step-0"]') as HTMLElement
    expect(step1.className).not.toMatch(/bg-yellow/)
  })

  it('never uses text-white', () => {
    const { container } = render(<HowWeWork />)
    expect(container.innerHTML).not.toMatch(/text-white/)
  })

  it('applies no transform to the drifting module under reduced motion, even on scroll', () => {
    setPrefersReducedMotion(true)
    const { container } = render(<HowWeWork />)
    const driftEl = container.querySelector('[data-testid="how-cutout-inner"]') as HTMLElement
    expect(driftEl.style.transform).toBe('')
    fireEvent.scroll(window, { target: { scrollY: 400 } })
    expect(driftEl.style.transform).toBe('')
  })

  it('drifts the module on scroll at full motion', async () => {
    setPrefersReducedMotion(false)
    window.innerWidth = 1440
    const { container } = render(<HowWeWork />)
    const driftEl = container.querySelector('[data-testid="how-cutout-inner"]') as HTMLElement
    const before = driftEl.style.transform
    Object.defineProperty(window, 'scrollY', { value: 400, configurable: true })
    fireEvent.scroll(window)
    await waitFor(() => expect(driftEl.style.transform).not.toBe(before))
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/sections/HowWeWork.test.tsx`
Expected: FAIL — the description/icon tests fail (component doesn't render them yet), and `screen.queryByText('—')` still finds 5 em dashes so that assertion fails too.

- [ ] **Step 3: Rewrite the component**

Replace the full contents of `src/components/sections/HowWeWork.tsx`:

```tsx
'use client'
import { motion, useMotionValue } from 'framer-motion'
import { useEffect } from 'react'
import { driftX } from '@/lib/drift'
import { useMotionLevel } from '@/hooks/useMotionLevel'
import { WeaveReveal } from '@/components/weave/WeaveReveal'
import { HOW_WE_WORK_ICONS } from './HowWeWorkIcons'

interface Step {
  number: string
  title: string
  description: string
  icon: keyof typeof HOW_WE_WORK_ICONS
}

// Step index 1, Site measurement, is deliberately the heaviest of the five: larger
// display type and a filled yellow block, because it is what separates fitted
// furniture from furniture bought off a shelf.
//
// Description copy below is the implementer's draft, not client-approved — flagged
// for sign-off the same way Position's statement lines are (see
// docs/superpowers/specs/2026-08-11-how-we-work-journey-design.md).
const STEPS: Step[] = [
  {
    number: '01',
    title: 'Enquiry',
    description: 'Tell us what you need and we start the conversation.',
    icon: 'enquiry',
  },
  {
    number: '02',
    title: 'Site measurement',
    description: 'We visit your site and take precise measurements before anything is drawn.',
    icon: 'measurement',
  },
  {
    number: '03',
    title: 'Drawings, materials and quotation',
    description: 'Measurements become drawings, material choices and a firm quote.',
    icon: 'drawings',
  },
  {
    number: '04',
    title: 'Manufacture',
    description: 'Your piece is built to spec in our workshop.',
    icon: 'manufacture',
  },
  {
    number: '05',
    title: 'Installation and handover',
    description: 'We fit it on site and hand it over, ready to use.',
    icon: 'installation',
  },
]

export function HowWeWork() {
  return (
    <section
      id="how"
      aria-labelledby="how-heading"
      className="on-paper relative overflow-hidden bg-paper py-24 text-navy"
    >
      <DriftingModule />
      <div className="relative mx-auto max-w-6xl px-6">
        <h2 id="how-heading" className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          How we work
        </h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-5">
          {STEPS.map((step, i) => {
            const heaviest = i === 1
            const Icon = HOW_WE_WORK_ICONS[step.icon]
            return (
              // The reveal sits INSIDE the <li>, not around it: WeaveReveal renders a
              // motion.div, and a <div> between <ol> and <li> is invalid and costs the
              // list its semantics — a screen reader stops announcing "list, 5 items".
              <li
                key={step.number}
                data-testid={`how-step-${i}`}
                className={heaviest ? 'bg-yellow' : 'border border-navy/20'}
              >
                <WeaveReveal from={i % 2 === 0 ? 'left' : 'right'} delay={i * 0.05} className="p-6">
                  <Icon className={heaviest ? 'h-7 w-7 text-navy' : 'h-6 w-6 text-navy'} />
                  <span className="u-mono mt-3 block text-navy">{step.number}</span>
                  <p
                    className={
                      heaviest
                        ? 'mt-2 font-display text-3xl tracking-tight text-navy'
                        : 'mt-2 font-display text-xl tracking-tight text-navy'
                    }
                  >
                    {step.title}
                  </p>
                  <p className="mt-3 font-body text-sm leading-relaxed text-navy">{step.description}</p>
                </WeaveReveal>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

/**
 * A decorative wardrobe-module silhouette that drifts sideways as the visitor
 * scrolls. Driven from a plain `scroll` listener rather than framer-motion's
 * `useScroll`, which measures target elements via ResizeObserver — an API this
 * project's jsdom test environment does not stub. The client's rule is absolute:
 * prefers-reduced-motion disables all transforms, so nothing here is even wired up
 * below 'full'.
 */
function DriftingModule() {
  const level = useMotionLevel()
  const x = useMotionValue(0)

  useEffect(() => {
    if (level !== 'full') return
    function onScroll() {
      x.set(driftX(window.scrollY))
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [level, x])

  return (
    <div
      data-testid="how-cutout"
      aria-hidden="true"
      className="pointer-events-none absolute top-1/4 right-0 h-40 w-24 overflow-hidden"
    >
      <motion.div
        data-testid="how-cutout-inner"
        style={level === 'full' ? { x } : undefined}
        className="h-full w-full bg-navy/10"
      />
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/sections/HowWeWork.test.tsx`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/HowWeWork.tsx src/components/sections/HowWeWork.test.tsx
git commit -m "feat: replace How we work lead-time field with icon and description"
```

---

## Task 3: Horizontal pinned scroll journey at full motion

**Files:**
- Modify: `src/components/sections/HowWeWork.tsx`
- Modify: `src/components/sections/HowWeWork.test.tsx`

**Interfaces:**
- Consumes: `Step`/`STEPS`/`HOW_WE_WORK_ICONS` from Task 2; `useMotionLevel` (`'full' | 'reduced' | 'mobile'`) from `@/hooks/useMotionLevel`; `activeScrollStep(trackTop, trackHeight, viewportHeight, stepCount): number` from `@/lib/scrollProgress`.
- Produces: `HowWeWork` now branches on `useMotionLevel()`. At `'full'`, renders `PinnedSteps` — a `<div data-testid="how-track" data-active-index={active}>` holding a `<motion.ol>` of 5 `<motion.li data-testid="how-step-{i}">`. At `'reduced'`/`'mobile'`, renders `CompactSteps` — the same static grid Task 2 built (extracted into its own function, behavior unchanged).

- [ ] **Step 1: Update the test file**

Replace the full contents of `src/components/sections/HowWeWork.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { setPrefersReducedMotion } from '@/test/browserStubs'
import { HowWeWork } from './HowWeWork'

const TITLES = [
  'Enquiry',
  'Site measurement',
  'Drawings, materials and quotation',
  'Manufacture',
  'Installation and handover',
]

const DESCRIPTIONS = [
  'Tell us what you need and we start the conversation.',
  'We visit your site and take precise measurements before anything is drawn.',
  'Measurements become drawings, material choices and a firm quote.',
  'Your piece is built to spec in our workshop.',
  'We fit it on site and hand it over, ready to use.',
]

describe('HowWeWork', () => {
  it('never fades the small mono text to an opacity that fails AA', () => {
    const { container } = render(<HowWeWork />)
    expect(container.querySelectorAll('[class*="text-navy/"]')).toHaveLength(0)
  })

  it('keeps the five steps as direct children of the list', () => {
    render(<HowWeWork />)
    const list = screen.getByRole('list')
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    expect([...list.children].every((child) => child.tagName === 'LI')).toBe(true)
  })

  it('carries id="how"', () => {
    render(<HowWeWork />)
    expect(document.getElementById('how')).not.toBeNull()
  })

  it('carries a heading naming the section, above the step list', () => {
    render(<HowWeWork />)
    const heading = screen.getByRole('heading', { name: 'How we work' })
    const list = screen.getByRole('list')
    expect(heading.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('gives the section its accessible name from that heading', () => {
    render(<HowWeWork />)
    expect(screen.getByRole('region', { name: 'How we work' })).toBeInTheDocument()
  })

  it('renders the five step titles in the approved order', () => {
    const { container } = render(<HowWeWork />)
    const text = container.textContent ?? ''
    const positions = TITLES.map((title) => {
      expect(screen.getByText(title)).toBeInTheDocument()
      return text.indexOf(title)
    })
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1])
    }
  })

  it('gives each step a short description, in the approved order', () => {
    const { container } = render(<HowWeWork />)
    const text = container.textContent ?? ''
    const positions = DESCRIPTIONS.map((line) => {
      expect(screen.getByText(line)).toBeInTheDocument()
      return text.indexOf(line)
    })
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1])
    }
  })

  it('never shows the [TBC] sentinel or a lead-time dash', () => {
    const { container } = render(<HowWeWork />)
    expect(container.textContent).not.toContain('[TBC]')
    expect(screen.queryByText('—')).not.toBeInTheDocument()
  })

  it('gives each step card a decorative icon', () => {
    const { container } = render(<HowWeWork />)
    for (let i = 0; i < 5; i++) {
      const card = container.querySelector(`[data-testid="how-step-${i}"]`) as HTMLElement
      expect(card.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
    }
  })

  it('never uses text-white', () => {
    const { container } = render(<HowWeWork />)
    expect(container.innerHTML).not.toMatch(/text-white/)
  })

  describe('at full motion (pinned horizontal journey)', () => {
    it('pins the track for a scroll distance proportional to the step count', () => {
      const { container } = render(<HowWeWork />)
      const track = container.querySelector('[data-testid="how-track"]') as HTMLElement
      // STEP_VH (45) * 5 steps
      expect(track.style.height).toBe('225vh')
      expect(track.querySelector('.sticky')).not.toBeNull()
    })

    it('marks only the first step active on initial render', () => {
      const { container } = render(<HowWeWork />)
      const track = container.querySelector('[data-testid="how-track"]') as HTMLElement
      expect(track.dataset.activeIndex).toBe('0')
    })

    it('advances which step is active as the section scrolls past', async () => {
      const { container } = render(<HowWeWork />)
      const track = container.querySelector('[data-testid="how-track"]') as HTMLElement
      track.getBoundingClientRect = () =>
        ({
          top: -300,
          height: 2000,
          bottom: 1700,
          left: 0,
          right: 0,
          x: 0,
          y: -300,
          width: 0,
          toJSON() {},
        }) as DOMRect
      Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
      fireEvent.scroll(window)
      await waitFor(() => expect(track.dataset.activeIndex).toBe('1'))
    })

    it('gives Site measurement the heavy yellow treatment once it becomes the active step, not before', async () => {
      const { container } = render(<HowWeWork />)
      const track = container.querySelector('[data-testid="how-track"]') as HTMLElement
      const step1 = container.querySelector('[data-testid="how-step-1"]') as HTMLElement
      expect(step1.className).not.toMatch(/bg-yellow/)
      track.getBoundingClientRect = () =>
        ({
          top: -300,
          height: 2000,
          bottom: 1700,
          left: 0,
          right: 0,
          x: 0,
          y: -300,
          width: 0,
          toJSON() {},
        }) as DOMRect
      Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
      fireEvent.scroll(window)
      await waitFor(() => expect(track.dataset.activeIndex).toBe('1'))
      expect(step1.className).toMatch(/bg-yellow/)
    })
  })

  describe('under reduced motion or on mobile (compact fallback)', () => {
    it('gives Site measurement, step two, the heaviest visual treatment permanently', () => {
      setPrefersReducedMotion(true)
      const { container } = render(<HowWeWork />)
      const step2 = container.querySelector('[data-testid="how-step-1"]') as HTMLElement
      expect(step2).toHaveTextContent('Site measurement')
      expect(step2.className).toMatch(/bg-yellow/)
      const step1 = container.querySelector('[data-testid="how-step-0"]') as HTMLElement
      expect(step1.className).not.toMatch(/bg-yellow/)
    })

    it('renders no pinned track under reduced motion', () => {
      setPrefersReducedMotion(true)
      const { container } = render(<HowWeWork />)
      expect(container.querySelector('[data-testid="how-track"]')).toBeNull()
      expect(screen.getAllByRole('listitem')).toHaveLength(5)
    })

    it('renders the compact fallback on mobile widths', () => {
      window.innerWidth = 600
      const { container } = render(<HowWeWork />)
      expect(container.querySelector('[data-testid="how-track"]')).toBeNull()
      expect(screen.getAllByRole('listitem')).toHaveLength(5)
    })
  })

  it('applies no transform to the drifting module under reduced motion, even on scroll', () => {
    setPrefersReducedMotion(true)
    const { container } = render(<HowWeWork />)
    const driftEl = container.querySelector('[data-testid="how-cutout-inner"]') as HTMLElement
    expect(driftEl.style.transform).toBe('')
    fireEvent.scroll(window, { target: { scrollY: 400 } })
    expect(driftEl.style.transform).toBe('')
  })

  it('drifts the module on scroll at full motion', async () => {
    setPrefersReducedMotion(false)
    window.innerWidth = 1440
    const { container } = render(<HowWeWork />)
    const driftEl = container.querySelector('[data-testid="how-cutout-inner"]') as HTMLElement
    const before = driftEl.style.transform
    Object.defineProperty(window, 'scrollY', { value: 400, configurable: true })
    fireEvent.scroll(window)
    await waitFor(() => expect(driftEl.style.transform).not.toBe(before))
  })
})
```

Note: `window.innerWidth = 600` is set in the last test of the compact-fallback block; it is not reset afterward, but every test that follows it (the two drift-module tests) already sets `window.innerWidth = 1440` explicitly itself, so no later test is affected by the leftover value. Do not reorder tests such that a test relying on the default (>767) width runs after the mobile-width test without setting its own width.

- [ ] **Step 2: Run tests to verify the new/changed ones fail**

Run: `npx vitest run src/components/sections/HowWeWork.test.tsx`
Expected: FAIL — all tests inside `describe('at full motion ...')` and `describe('under reduced motion or on mobile ...')` fail (`how-track` doesn't exist yet; the section still always renders the plain grid from Task 2).

- [ ] **Step 3: Rewrite the component to add the pinned/compact split**

Replace the full contents of `src/components/sections/HowWeWork.tsx`:

```tsx
'use client'
import { motion, useMotionValue } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { driftX } from '@/lib/drift'
import { activeScrollStep } from '@/lib/scrollProgress'
import { useMotionLevel } from '@/hooks/useMotionLevel'
import { WeaveReveal } from '@/components/weave/WeaveReveal'
import { HOW_WE_WORK_ICONS } from './HowWeWorkIcons'

interface Step {
  number: string
  title: string
  description: string
  icon: keyof typeof HOW_WE_WORK_ICONS
}

// Step index 1, Site measurement, is deliberately the heaviest of the five: larger
// display type and a filled yellow block, because it is what separates fitted
// furniture from furniture bought off a shelf. In the pinned full-motion variant
// that treatment only applies once the step is active; the compact fallback below
// applies it permanently, since nothing else there conveys emphasis.
//
// Description copy below is the implementer's draft, not client-approved — flagged
// for sign-off the same way Position's statement lines are (see
// docs/superpowers/specs/2026-08-11-how-we-work-journey-design.md).
const STEPS: Step[] = [
  {
    number: '01',
    title: 'Enquiry',
    description: 'Tell us what you need and we start the conversation.',
    icon: 'enquiry',
  },
  {
    number: '02',
    title: 'Site measurement',
    description: 'We visit your site and take precise measurements before anything is drawn.',
    icon: 'measurement',
  },
  {
    number: '03',
    title: 'Drawings, materials and quotation',
    description: 'Measurements become drawings, material choices and a firm quote.',
    icon: 'drawings',
  },
  {
    number: '04',
    title: 'Manufacture',
    description: 'Your piece is built to spec in our workshop.',
    icon: 'manufacture',
  },
  {
    number: '05',
    title: 'Installation and handover',
    description: 'We fit it on site and hand it over, ready to use.',
    icon: 'installation',
  },
]

export function HowWeWork() {
  const level = useMotionLevel()
  return (
    <section
      id="how"
      aria-labelledby="how-heading"
      className="on-paper relative overflow-hidden bg-paper py-24 text-navy"
    >
      <DriftingModule />
      <div className="relative mx-auto max-w-6xl px-6">
        <h2 id="how-heading" className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          How we work
        </h2>
        {level === 'full' ? <PinnedSteps /> : <CompactSteps />}
      </div>
    </section>
  )
}

function CompactSteps() {
  return (
    <ol className="mt-10 grid gap-6 md:grid-cols-5">
      {STEPS.map((step, i) => {
        const heaviest = i === 1
        const Icon = HOW_WE_WORK_ICONS[step.icon]
        return (
          // The reveal sits INSIDE the <li>, not around it: WeaveReveal renders a
          // motion.div, and a <div> between <ol> and <li> is invalid and costs the
          // list its semantics — a screen reader stops announcing "list, 5 items".
          <li
            key={step.number}
            data-testid={`how-step-${i}`}
            className={heaviest ? 'bg-yellow' : 'border border-navy/20'}
          >
            <WeaveReveal from={i % 2 === 0 ? 'left' : 'right'} delay={i * 0.05} className="p-6">
              <Icon className={heaviest ? 'h-7 w-7 text-navy' : 'h-6 w-6 text-navy'} />
              <span className="u-mono mt-3 block text-navy">{step.number}</span>
              <p
                className={
                  heaviest
                    ? 'mt-2 font-display text-3xl tracking-tight text-navy'
                    : 'mt-2 font-display text-xl tracking-tight text-navy'
                }
              >
                {step.title}
              </p>
              <p className="mt-3 font-body text-sm leading-relaxed text-navy">{step.description}</p>
            </WeaveReveal>
          </li>
        )
      })}
    </ol>
  )
}

// The scroll distance (in viewport heights) spent pinned on each step before the
// next one takes over. Shorter than Position's 55vh per point — each step here is
// lighter content (icon + title + one sentence) than Position's fuller prose.
const STEP_VH = 45
// Card width and the gap between cards, in px. Kept as plain numbers (not Tailwind
// arbitrary values alone) because the horizontal scroll offset below must be
// computed from the same figures: CARD_SPACING is what one active-index step moves
// the track by.
const CARD_WIDTH = 320
const CARD_GAP = 24
const CARD_SPACING = CARD_WIDTH + CARD_GAP

// Pinned scroll-reveal only runs at full motion — position: sticky plus a scroll
// listener is exactly the kind of transform-heavy effect the client's reduced-motion
// rule disables outright, and pinned/scroll-jacked sections are also the pattern most
// prone to going janky on small touch viewports. Reduced motion and mobile both get
// CompactSteps instead: every step laid out normally, still scroll-revealed via
// WeaveReveal, just not scroll-jacked.
function PinnedSteps() {
  const trackRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    function onScroll() {
      const track = trackRef.current
      if (!track) return
      const rect = track.getBoundingClientRect()
      setActive(activeScrollStep(rect.top, rect.height, window.innerHeight, STEPS.length))
    }
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      ref={trackRef}
      data-testid="how-track"
      data-active-index={active}
      className="relative mt-10"
      style={{ height: `${STEP_VH * STEPS.length}vh` }}
    >
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden">
        <motion.ol
          className="flex"
          style={{ gap: `${CARD_GAP}px` }}
          animate={{ x: -active * CARD_SPACING }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {STEPS.map((step, i) => {
            const isActive = active === i
            const heaviest = i === 1 && isActive
            const Icon = HOW_WE_WORK_ICONS[step.icon]
            return (
              <motion.li
                key={step.number}
                data-testid={`how-step-${i}`}
                className={heaviest ? 'bg-yellow p-6' : 'border border-navy/20 p-6'}
                style={{ width: `${CARD_WIDTH}px` }}
                animate={{ opacity: isActive ? 1 : 0.4, scale: isActive ? 1 : 0.92 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <Icon className={heaviest ? 'h-7 w-7 text-navy' : 'h-6 w-6 text-navy'} />
                <span className="u-mono mt-3 block text-navy">{step.number}</span>
                <p
                  className={
                    heaviest
                      ? 'mt-2 font-display text-3xl tracking-tight text-navy'
                      : 'mt-2 font-display text-xl tracking-tight text-navy'
                  }
                >
                  {step.title}
                </p>
                <p className="mt-3 font-body text-sm leading-relaxed text-navy">{step.description}</p>
              </motion.li>
            )
          })}
        </motion.ol>
        <div className="mt-6 flex gap-2" aria-hidden="true">
          {STEPS.map((step, i) => (
            <span
              key={step.number}
              data-testid={`how-dot-${i}`}
              className={
                active === i ? 'h-1.5 w-6 rounded-full bg-yellow' : 'h-1.5 w-6 rounded-full bg-navy/20'
              }
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * A decorative wardrobe-module silhouette that drifts sideways as the visitor
 * scrolls. Driven from a plain `scroll` listener rather than framer-motion's
 * `useScroll`, which measures target elements via ResizeObserver — an API this
 * project's jsdom test environment does not stub. The client's rule is absolute:
 * prefers-reduced-motion disables all transforms, so nothing here is even wired up
 * below 'full'.
 */
function DriftingModule() {
  const level = useMotionLevel()
  const x = useMotionValue(0)

  useEffect(() => {
    if (level !== 'full') return
    function onScroll() {
      x.set(driftX(window.scrollY))
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [level, x])

  return (
    <div
      data-testid="how-cutout"
      aria-hidden="true"
      className="pointer-events-none absolute top-1/4 right-0 h-40 w-24 overflow-hidden"
    >
      <motion.div
        data-testid="how-cutout-inner"
        style={level === 'full' ? { x } : undefined}
        className="h-full w-full bg-navy/10"
      />
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/sections/HowWeWork.test.tsx`
Expected: PASS (all tests)

- [ ] **Step 5: Run the full test suite to check for regressions**

Run: `npx vitest run`
Expected: PASS (no other file imports `HowWeWork`'s removed `Step.leadTime` shape or the deleted `isTBC`/`TBC` import from this file)

- [ ] **Step 6: Commit**

```bash
git add src/components/sections/HowWeWork.tsx src/components/sections/HowWeWork.test.tsx
git commit -m "feat: pin How we work into a horizontal scroll journey at full motion"
```

---

## Self-review notes

- **Spec coverage:** content model (Task 1 + 2), full-motion pinned/horizontal behavior (Task 3), reduced-motion/mobile fallback (Task 2 introduces `CompactSteps`' markup, Task 3 wires the `useMotionLevel` branch to it), "Site measurement" active-only vs. permanent yellow (Task 3), list semantics preserved (`motion.ol`/`motion.li` used directly, no wrapper — all tasks), out-of-scope items untouched (`Position.tsx`, `scrollProgress.ts`, `WeaveReveal.tsx`, `tbc.ts`, no new dependency).
- **Placeholder scan:** no TBD/TODO markers; all code blocks are complete and copy-pasteable.
- **Type consistency:** `Step.icon` (Task 2) is typed as `keyof typeof HOW_WE_WORK_ICONS` (Task 1's export), and Task 3 reuses the identical `Step` interface and `STEPS` constant verbatim — no signature drift across tasks.
