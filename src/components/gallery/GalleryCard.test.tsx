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

  it('calls onOpen with the given index when clicked', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    render(<GalleryCard work={work} index={1} eager onOpen={onOpen} />)
    await user.click(screen.getByRole('button'))
    expect(onOpen).toHaveBeenCalledWith(1)
  })

  // F3: public/work/ does not exist, so every one of the 24 gallery images renders
  // as a broken <img> in a real browser. The established pattern (Hero, Film) is
  // onError -> a solid navy block naming the exact slot, never an AI image.
  it('falls back to a named navy stand-in when the image fails to load', () => {
    render(<GalleryCard work={work} index={1} eager onOpen={vi.fn()} />)
    fireEvent.error(screen.getByRole('img', { name: workAlt(work) }))
    expect(screen.queryByRole('img', { name: workAlt(work) })).not.toBeInTheDocument()
    const fallback = screen.getByTestId('card-fallback')
    expect(fallback).toHaveTextContent(`Image slot: ${work.image}`)
  })

  it('still opens the lightbox at the given index after the image has failed', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    render(<GalleryCard work={work} index={1} eager onOpen={onOpen} />)
    fireEvent.error(screen.getByRole('img', { name: workAlt(work) }))
    await user.click(screen.getByRole('button'))
    expect(onOpen).toHaveBeenCalledWith(1)
  })
})
