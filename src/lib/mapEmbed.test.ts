import { describe, it, expect } from 'vitest'
import { TBC } from './tbc'
import { mapLinks } from './mapEmbed'

const EMBED = 'https://www.google.com/maps/embed?pb=!1m18!1m12&hl=en'
const SHARE = 'https://maps.app.goo.gl/SZjLYxW7YAM95CX56?g_st=ic'

describe('mapLinks', () => {
  it('gives nothing while the field is [TBC]', () => {
    expect(mapLinks(TBC)).toEqual({ embedSrc: null, openHref: null })
  })

  it('embeds a bare Google Maps embed URL, and links to it too', () => {
    expect(mapLinks(`  ${EMBED}  `)).toEqual({ embedSrc: EMBED, openHref: EMBED })
  })

  it("pulls the src out of Google's pasted <iframe> snippet and decodes &amp;", () => {
    const snippet = `<iframe src="${EMBED.replace('&', '&amp;')}" width="600" height="450" loading="lazy"></iframe>`
    expect(mapLinks(snippet).embedSrc).toBe(EMBED)
  })

  it('links to, but never frames, an ordinary share link — Google refuses to be framed from one', () => {
    expect(mapLinks(SHARE)).toEqual({ embedSrc: null, openHref: SHARE })
  })

  it('refuses anything that is not Google Maps', () => {
    for (const value of [
      'https://example.com/maps/embed',
      'javascript:alert(1)',
      '<iframe src="https://evil.example/"></iframe>',
    ]) {
      expect(mapLinks(value)).toEqual({ embedSrc: null, openHref: null })
    }
  })
})
