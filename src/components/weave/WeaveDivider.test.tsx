import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { WeaveDivider } from './WeaveDivider'

describe('WeaveDivider', () => {
  it('renders a woven pattern element', () => {
    const { container } = render(<WeaveDivider />)
    expect(container.querySelector('pattern')).not.toBeNull()
  })

  it('is decorative, not announced to assistive tech', () => {
    const { container } = render(<WeaveDivider />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  })

  // D3: the plan hardcodes id="weave" on the <pattern>. The probe confirms that when
  // two SVGs share a pattern id, every url(#weave) resolves to the first instance, so
  // unmounting the first silently blanks every later divider on the page.
  it('gives two rendered dividers distinct pattern ids, so unmounting one cannot blank the other', () => {
    const { container } = render(
      <>
        <WeaveDivider />
        <WeaveDivider />
      </>,
    )
    const patterns = container.querySelectorAll('pattern')
    expect(patterns).toHaveLength(2)
    const [first, second] = Array.from(patterns).map((p) => p.id)
    expect(first).not.toBe('')
    expect(second).not.toBe('')
    expect(first).not.toBe(second)
  })

  it("references its own pattern id in the fill, not a hardcoded 'weave'", () => {
    const { container } = render(<WeaveDivider />)
    const pattern = container.querySelector('pattern')!
    const rect = container.querySelector('rect')!
    expect(pattern.id).not.toBe('weave')
    expect(rect.getAttribute('fill')).toBe(`url(#${pattern.id})`)
  })
})
