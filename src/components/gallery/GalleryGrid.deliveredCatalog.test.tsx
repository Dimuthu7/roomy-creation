import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { WORKS, ALL_WORKS } from '@/data/works'
import { GalleryGrid } from './GalleryGrid'

// Unlike GalleryGrid.test.tsx (which mocks WORKS up to the full 24-slot plan to
// exercise generic grid behavior), this file uses the real, delivered-only
// WORKS export, since these tests are specifically about what the live site
// shows given the photos actually sitting in public/work/ right now.
describe('GalleryGrid against the real, delivered-only catalog', () => {
  it('renders only the photos actually delivered, not a placeholder for every planned slot', () => {
    render(<GalleryGrid onOpen={vi.fn()} />)
    expect(screen.getAllByRole('img')).toHaveLength(WORKS.length)
    expect(WORKS.length).toBeLessThan(ALL_WORKS.length)
  })

  it('hides the filter chip for a category with no delivered photos yet', () => {
    render(<GalleryGrid onOpen={vi.fn()} />)
    const filterRow = within(screen.getByRole('group', { name: 'Filter work by category' }))

    const deliveredCategories = new Set(WORKS.map((w) => w.category))
    const plannedCategories = new Set(ALL_WORKS.map((w) => w.category))
    const missingCategories = [...plannedCategories].filter((c) => !deliveredCategories.has(c))
    expect(missingCategories.length).toBeGreaterThan(0) // worthless if every category is delivered

    expect(filterRow.getByRole('button', { name: 'All' })).toBeInTheDocument()
    for (const category of deliveredCategories) {
      expect(filterRow.getByRole('button', { name: new RegExp(category, 'i') })).toBeInTheDocument()
    }
    for (const category of missingCategories) {
      expect(
        filterRow.queryByRole('button', { name: new RegExp(category, 'i') }),
      ).not.toBeInTheDocument()
    }
  })
})
