import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSiteData } from '@/context/SiteData'
import { SITE_FIXTURE, WORKS_FIXTURE, TESTIMONIALS_FIXTURE } from '@/test/fixtures'
import type { Testimonial } from '@/data/testimonials'
import { Testimonials } from './Testimonials'

vi.mock('@/context/SiteData', () => ({ useSiteData: vi.fn() }))

function renderWithTestimonials(testimonials: Testimonial[]) {
  vi.mocked(useSiteData).mockReturnValue({
    site: SITE_FIXTURE,
    works: WORKS_FIXTURE,
    testimonials,
  })
  return render(<Testimonials />)
}

beforeEach(() => {
  vi.mocked(useSiteData).mockReturnValue({
    site: SITE_FIXTURE,
    works: WORKS_FIXTURE,
    testimonials: TESTIMONIALS_FIXTURE,
  })
})

describe('Testimonials', () => {
  it('renders nothing when there are no testimonials to show', () => {
    const { container } = renderWithTestimonials([])
    expect(container).toBeEmptyDOMElement()
  })

  it('exposes an accessible region name when there are testimonials', () => {
    render(<Testimonials />)
    expect(screen.getByRole('region', { name: 'Testimonials' })).toBeInTheDocument()
  })

  it('shows every testimonial author, somewhere on the page', () => {
    render(<Testimonials />)
    for (const t of TESTIMONIALS_FIXTURE) {
      expect(screen.getAllByText(t.authorName).length).toBeGreaterThan(0)
    }
  })

  it('shows every testimonial quote, somewhere on the page', () => {
    render(<Testimonials />)
    for (const t of TESTIMONIALS_FIXTURE) {
      expect(screen.getAllByText(t.reviewText).length).toBeGreaterThan(0)
    }
  })

  it('shows a Recommends-on-Facebook cue for a Facebook-recommended testimonial', () => {
    render(<Testimonials />)
    expect(screen.getAllByText(/recommends on facebook/i).length).toBeGreaterThan(0)
  })

  it('shows a star rating for a manual testimonial with a rating set', () => {
    render(<Testimonials />)
    expect(screen.getAllByLabelText('5 out of 5 stars').length).toBeGreaterThan(0)
  })

  it('never uses text-white', () => {
    const { container } = render(<Testimonials />)
    expect(container.innerHTML).not.toMatch(/text-white/)
  })

  describe('avatars', () => {
    it("renders the reviewer's photo when avatarUrl is set", () => {
      const { container } = render(<Testimonials />)
      const withPhoto = TESTIMONIALS_FIXTURE.find((t) => t.avatarUrl)!
      const images = [...container.querySelectorAll('img')] as HTMLImageElement[]
      expect(images.some((img) => img.src === withPhoto.avatarUrl)).toBe(true)
    })

    it('falls back to a generic icon (no <img>) when avatarUrl is null', () => {
      const withoutPhoto = TESTIMONIALS_FIXTURE.find((t) => !t.avatarUrl)!
      render(<Testimonials />)
      const card = screen.getAllByTestId('testimonial-card').find((c) => c.textContent?.includes(withoutPhoto.authorName))!
      expect(card.querySelector('img')).toBeNull()
      expect(card.querySelector('svg')).not.toBeNull()
    })
  })

  describe('the marquee track', () => {
    it('duplicates the card set once, so the belt can loop seamlessly', () => {
      const { container } = render(<Testimonials />)
      const realCards = screen.getAllByTestId('testimonial-card')
      expect(realCards).toHaveLength(TESTIMONIALS_FIXTURE.length)
      const allCards = container.querySelectorAll('[data-testid^="testimonial-card"]')
      expect(allCards).toHaveLength(TESTIMONIALS_FIXTURE.length * 2)
    })

    it('hides the duplicate set from assistive tech and the tab order, keeping the real set focusable', () => {
      const { container } = render(<Testimonials />)
      const duplicates = container.querySelectorAll('[data-testid="testimonial-card-duplicate"]')
      expect(duplicates).toHaveLength(TESTIMONIALS_FIXTURE.length)
      for (const dup of duplicates) {
        expect(dup).toHaveAttribute('aria-hidden', 'true')
        expect(dup).toHaveAttribute('tabindex', '-1')
      }
      for (const real of screen.getAllByTestId('testimonial-card')) {
        expect(real).toHaveAttribute('tabindex', '0')
        expect(real).not.toHaveAttribute('aria-hidden')
      }
    })

    it('carries the auto-scrolling animation class, with a duration that scales with the review count', () => {
      // Six items comfortably clears the minimum-duration floor, so this exercises
      // the "scales with count" branch rather than the "floored" one below.
      const many = [0, 1, 2, 3, 4, 5].map((i) => ({
        ...TESTIMONIALS_FIXTURE[i % TESTIMONIALS_FIXTURE.length],
        id: `many-${i}`,
      }))
      const { container } = renderWithTestimonials(many)
      const track = container.querySelector('.animate-testimonial-marquee') as HTMLElement
      expect(track).not.toBeNull()
      expect(track.style.animationDuration).toBe(`${many.length * 6}s`)
    })

    it('fades cards to transparent at the left/right edges rather than hard-clipping them', () => {
      const { container } = render(<Testimonials />)
      expect(container.querySelector('.testimonial-fade-mask')).not.toBeNull()
    })

    it('never lets the duration fall below a sane minimum for very few reviews', () => {
      const { container } = renderWithTestimonials([TESTIMONIALS_FIXTURE[0]])
      const track = container.querySelector('.animate-testimonial-marquee') as HTMLElement
      expect(track.style.animationDuration).toBe('20s')
    })
  })
})

describe('Testimonials controls', () => {
  it('offers a pause control that stops the belt and can start it again', async () => {
    const user = userEvent.setup()
    const { container } = render(<Testimonials />)
    const track = container.querySelector('.animate-testimonial-marquee') as HTMLElement
    const pause = screen.getByRole('button', { name: 'Pause reviews' })
    expect(pause).toHaveAttribute('aria-pressed', 'false')
    expect(track).toHaveAttribute('data-paused', 'false')

    await user.click(pause)
    expect(track).toHaveAttribute('data-paused', 'true')
    const play = screen.getByRole('button', { name: 'Play reviews' })
    expect(play).toHaveAttribute('aria-pressed', 'true')

    await user.click(play)
    expect(track).toHaveAttribute('data-paused', 'false')
  })

  it('lets a long review be read in full, and keeps the duplicate copy out of the tab order', async () => {
    const user = userEvent.setup()
    const long = { ...TESTIMONIALS_FIXTURE[0], id: 'long', reviewText: 'Fitted perfectly. '.repeat(20) }
    renderWithTestimonials([long])
    const [real, duplicate] = screen.getAllByRole('button', { name: 'Read more', hidden: true })
    expect(duplicate).toHaveAttribute('tabindex', '-1')
    expect(real).toHaveAttribute('aria-expanded', 'false')
    await user.click(real)
    expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('shows no Read more control on a short review', () => {
    renderWithTestimonials([{ ...TESTIMONIALS_FIXTURE[0], id: 'short', reviewText: 'Great work.' }])
    expect(screen.queryByRole('button', { name: 'Read more', hidden: true })).toBeNull()
  })
})
