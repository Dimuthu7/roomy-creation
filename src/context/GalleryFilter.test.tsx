import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSiteData } from '@/context/SiteData'
import { SITE_FIXTURE, ALL_WORKS_FIXTURE, WORKS_FIXTURE, TESTIMONIALS_FIXTURE } from '@/test/fixtures'
import { getScrollIntoViewCalls } from '@/test/browserStubs'
import { GalleryGrid } from '@/components/gallery/GalleryGrid'
import { WhatWeMake } from '@/components/sections/WhatWeMake'
import { GalleryFilterProvider } from './GalleryFilter'
import type { Work } from '@/data/works'

vi.mock('@/context/SiteData', () => ({ useSiteData: vi.fn() }))

function useWorks(works: Work[]) {
  vi.mocked(useSiteData).mockReturnValue({
    site: SITE_FIXTURE,
    works,
    testimonials: TESTIMONIALS_FIXTURE,
  })
}

beforeEach(() => useWorks(ALL_WORKS_FIXTURE))

function renderPage() {
  return render(
    <GalleryFilterProvider>
      <WhatWeMake />
      <section id="work">
        <GalleryGrid onOpen={vi.fn()} />
      </section>
    </GalleryFilterProvider>,
  )
}

function shownCategories(): Set<string> {
  const ids = Array.from(
    screen.getByTestId('gallery-grid').querySelectorAll('[data-work-id]'),
    (el) => el.getAttribute('data-work-id'),
  )
  return new Set(ALL_WORKS_FIXTURE.filter((w) => ids.includes(w.id)).map((w) => w.category))
}

describe('"What we make" cards driving the gallery filter', () => {
  it('filters the gallery to the card’s category and scrolls to it', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /Wardrobes & storage/ }))
    expect(screen.getByRole('button', { name: 'Wardrobes' })).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(shownCategories()).toEqual(new Set(['wardrobe'])))
    expect(getScrollIntoViewCalls().at(-1)?.target).toBe(document.getElementById('work'))
  })

  it('falls back to all work when the card’s category has nothing delivered yet', async () => {
    const withoutOffice = WORKS_FIXTURE.filter((w) => w.category !== 'office')
    useWorks(withoutOffice)
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /Office & commercial/ }))
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
  })
})
