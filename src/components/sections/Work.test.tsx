import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EnquiryPrefillProvider } from '@/context/EnquiryPrefill'
import { WORKS } from '@/data/works'
import { Work } from './Work'

function setup() {
  return render(
    <EnquiryPrefillProvider>
      <Work />
    </EnquiryPrefillProvider>,
  )
}

describe('Work', () => {
  // Hero's "See our work" CTA already points at #work — this id did not exist
  // anywhere in the codebase before this component.
  it('carries id="work", the id Hero\'s CTA already points at', () => {
    setup()
    expect(document.getElementById('work')).not.toBeNull()
  })

  // F2: the gallery — the client's stated number-one priority — was not reachable by
  // heading navigation at all. "Our work" is a structural label, flagged for
  // sign-off (brief §8).
  it('carries a heading naming the section, above the filter row', () => {
    setup()
    const heading = screen.getByRole('heading', { name: 'Our work' })
    const filterRow = screen.getByRole('group', { name: 'Filter work by category' })
    expect(
      heading.compareDocumentPosition(filterRow) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('gives the section its accessible name from that heading', () => {
    setup()
    expect(screen.getByRole('region', { name: 'Our work' })).toBeInTheDocument()
  })

  it('renders the gallery grid with all 24 works', () => {
    setup()
    expect(screen.getAllByRole('img')).toHaveLength(24)
  })

  it('does not mount the lightbox until a card is opened', () => {
    setup()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('mounts the lightbox at the clicked index when a card is opened', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getAllByRole('button', { name: /Built-in wardrobe/ })[0])
    expect(screen.getByRole('dialog', { name: WORKS[0].title })).toBeInTheDocument()
  })

  it('unmounts the lightbox and returns focus to the trigger when it closes', async () => {
    const user = userEvent.setup()
    setup()
    const trigger = screen.getAllByRole('button', { name: /Built-in wardrobe/ })[0]
    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(trigger)
  })

  it('moves the lightbox to a new index without unmounting it, via onIndexChange', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getAllByRole('button', { name: /Built-in wardrobe/ })[0])
    expect(screen.getByRole('dialog', { name: WORKS[0].title })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByRole('dialog', { name: WORKS[1].title })).toBeInTheDocument()
  })
})
