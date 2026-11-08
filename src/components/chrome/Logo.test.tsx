import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Logo } from './Logo'

describe('Logo', () => {
  it('renders the wordmark as real text', () => {
    render(<Logo variant="yellow" />)
    expect(screen.getByText('Roomy Creations')).toBeInTheDocument()
  })

  it('keeps the icon decorative so the text carries the accessible name', () => {
    render(<Logo variant="yellow" />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('colours the wordmark per variant', () => {
    render(<Logo variant="navy" />)
    expect(screen.getByText('Roomy Creations')).toHaveClass('text-navy')
  })

  it('defaults to the yellow wordmark when no variant is given', () => {
    render(<Logo />)
    expect(screen.getByText('Roomy Creations')).toHaveClass('text-yellow')
  })

  it('draws the mark a step smaller in the nav than in the footer', () => {
    const { container: nav } = render(<Logo size="nav" />)
    const { container: footer } = render(<Logo />)
    expect(nav.querySelector('img')).toHaveClass('h-6', 'sm:h-7')
    expect(footer.querySelector('img')).toHaveClass('h-8')
  })
})
