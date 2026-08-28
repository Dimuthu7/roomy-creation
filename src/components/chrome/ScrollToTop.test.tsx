import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { setPrefersReducedMotion } from '@/test/browserStubs'
import * as smoothScroll from './SmoothScroll'
import { ScrollToTop } from './ScrollToTop'

function scrollTo(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true })
  act(() => {
    window.dispatchEvent(new Event('scroll'))
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ScrollToTop', () => {
  it('renders nothing at the top of the page', () => {
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
    const { container } = render(<ScrollToTop />)
    expect(container).toBeEmptyDOMElement()
  })

  it('appears once the page is scrolled past one viewport height', () => {
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
    render(<ScrollToTop />)
    scrollTo(900)
    expect(screen.getByRole('button', { name: 'Scroll to top' })).toBeInTheDocument()
  })

  it('disappears again after scrolling back up to the top', () => {
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
    const { container } = render(<ScrollToTop />)
    scrollTo(900)
    scrollTo(0)
    expect(container).toBeEmptyDOMElement()
  })

  // A float over a modal is a defect: Lightbox's portal is z-50, so this has to sit
  // under it, same as WhatsAppFloat.
  it('sits below the lightbox z-index', () => {
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
    render(<ScrollToTop />)
    scrollTo(900)
    const button = screen.getByRole('button', { name: 'Scroll to top' })
    expect(button.className).toMatch(/z-40/)
    expect(button.className).not.toMatch(/z-50/)
  })

  it('scrolls the Lenis instance to the top when one is running', () => {
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
    const scrollToSpy = vi.fn()
    vi.spyOn(smoothScroll, 'getLenis').mockReturnValue({
      scrollTo: scrollToSpy,
    } as unknown as ReturnType<typeof smoothScroll.getLenis>)
    render(<ScrollToTop />)
    scrollTo(900)
    screen.getByRole('button', { name: 'Scroll to top' }).click()
    expect(scrollToSpy).toHaveBeenCalledWith(0, expect.objectContaining({ duration: expect.any(Number) }))
  })

  it('falls back to a native smooth scroll when Lenis is not running', () => {
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
    vi.spyOn(smoothScroll, 'getLenis').mockReturnValue(null)
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    render(<ScrollToTop />)
    scrollTo(900)
    screen.getByRole('button', { name: 'Scroll to top' }).click()
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })

  it('falls back to an instant jump under reduced motion', () => {
    setPrefersReducedMotion(true)
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
    vi.spyOn(smoothScroll, 'getLenis').mockReturnValue(null)
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    render(<ScrollToTop />)
    scrollTo(900)
    screen.getByRole('button', { name: 'Scroll to top' }).click()
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
  })

  it('applies no entrance transform under reduced motion', () => {
    setPrefersReducedMotion(true)
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
    render(<ScrollToTop />)
    scrollTo(900)
    const button = screen.getByRole('button', { name: 'Scroll to top' })
    expect(button.style.opacity).toBe('')
    expect(button.style.transform).toBe('')
  })
})
