import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FilterRow } from './FilterRow'
import { CATEGORIES } from '@/data/categories'

describe('FilterRow', () => {
  it('compresses a filter button on tap, since :hover alone does not fire on touch', () => {
    render(<FilterRow categories={CATEGORIES} active="all" onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Wardrobes' }).className).toMatch(/active:scale-95/)
  })
})
