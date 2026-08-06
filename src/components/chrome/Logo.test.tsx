import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Logo } from './Logo'

describe('Logo', () => {
  it('carries the accessible name "Roomy Creations"', () => {
    render(<Logo variant="yellow" />)
    expect(screen.getByRole('img', { name: 'Roomy Creations' })).toBeInTheDocument()
  })

  it('renders the navy variant with the same accessible name', () => {
    render(<Logo variant="navy" />)
    expect(screen.getByRole('img', { name: 'Roomy Creations' })).toBeInTheDocument()
  })

  it('defaults to the yellow mark when no variant is given', () => {
    const { container } = render(<Logo />)
    const yellowOnly = render(<Logo variant="yellow" />).container
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      yellowOnly.querySelector('img')?.getAttribute('src'),
    )
  })
})
