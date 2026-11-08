import { isTBC, type Maybe } from './tbc'

// Only Google Maps' own embed endpoints are ever framed. The value comes from the admin
// form as free text, and an <iframe> pointed at anything else is a page we never meant
// to put inside the site.
const EMBED_PREFIXES = ['https://www.google.com/maps/embed', 'https://maps.google.com/maps?']

// Ordinary Google Maps links: the phone app's "Share" link (maps.app.goo.gl) and the
// desktop address-bar URL. Google refuses to be framed from these, so they can't
// become a map on the page — but they are still a perfectly good "open in Maps" link.
const OPEN_PREFIXES = [
  'https://maps.app.goo.gl/',
  'https://goo.gl/maps/',
  'https://www.google.com/maps',
  'https://maps.google.com/',
]

export interface MapLinks {
  /** Safe to use as an <iframe> src, or null if the value is not an embed URL. */
  embedSrc: string | null
  /** Safe to link to as "Open in Google Maps", or null. */
  openHref: string | null
}

/**
 * Turns the admin's "Google Maps embed URL" field into what the site can safely do
 * with it.
 *
 * Google's Share → Embed a map dialog hands out a whole `<iframe ...>` snippet rather
 * than a bare URL, and that is what most people paste — so the src is pulled out of a
 * snippet as well as accepted on its own, with HTML-escaped ampersands decoded back to
 * plain `&`. A plain share link (what the field holds today) gets no embedded map, only
 * the "open in Maps" link.
 */
export function mapLinks(value: Maybe<string>): MapLinks {
  if (isTBC(value)) return { embedSrc: null, openHref: null }
  const trimmed = value.trim()
  const fromSnippet = trimmed.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1]
  const url = (fromSnippet ?? trimmed).replace(/&amp;/g, '&')

  if (EMBED_PREFIXES.some((prefix) => url.startsWith(prefix))) {
    // An embed URL opens fine in a tab too, so it doubles as the link.
    return { embedSrc: url, openHref: url }
  }
  if (OPEN_PREFIXES.some((prefix) => url.startsWith(prefix))) {
    return { embedSrc: null, openHref: url }
  }
  return { embedSrc: null, openHref: null }
}
