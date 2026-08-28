import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GalleryCard } from './GalleryCard'
import { WORKS } from '@/data/works'
import { workAlt } from '@/lib/workAlt'

const work = WORKS[1]

describe('GalleryCard', () => {
  it('renders the work image with its computed alt text before any error', () => {
    render(<GalleryCard work={work} index={1} eager onOpen={vi.fn()} />)
    expect(screen.getByRole('img', { name: workAlt(work) })).toBeInTheDocument()
    expect(screen.queryByTestId('card-fallback')).not.toBeInTheDocument()
  })

  it('compresses slightly on tap', () => {
    render(<GalleryCard work={work} index={1} eager onOpen={vi.fn()} />)
    expect(screen.getByRole('button').className).toMatch(/active:scale-\[0\.97\]/)
  })

  it('calls onOpen with the given index when clicked', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    render(<GalleryCard work={work} index={1} eager onOpen={onOpen} />)
    await user.click(screen.getByRole('button'))
    expect(onOpen).toHaveBeenCalledWith(1)
  })

  // data/works.ts now only lists slots with a real photo in public/work/, so a
  // load failure here means a real photo went missing at runtime — there is no
  // slot number worth showing a visitor, so the card just disappears instead of
  // naming the file.
  it('disappears without naming the file when the image fails to load', () => {
    const { container } = render(<GalleryCard work={work} index={1} eager onOpen={vi.fn()} />)
    fireEvent.error(screen.getByRole('img', { name: workAlt(work) }))
    expect(screen.queryByRole('img', { name: workAlt(work) })).not.toBeInTheDocument()
    expect(screen.queryByText(/image slot/i)).not.toBeInTheDocument()
    expect(container).toBeEmptyDOMElement()
  })
})
