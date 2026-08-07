import { Logo } from './Logo'
import { SITE } from '@/data/site'
import { isTBC } from '@/lib/tbc'

// Every block below is [TBC]-gated exactly like Enquiry.tsx: a heading only renders
// once it has content beneath it. With today's all-[TBC] site.ts the footer
// legitimately renders almost nothing — that is correct behaviour, not something to
// paper over with placeholder copy.
export function Footer() {
  const hasContact = !isTBC(SITE.phone) || !isTBC(SITE.email)
  const hasVisit = !isTBC(SITE.addressLines) || !isTBC(SITE.city) || !isTBC(SITE.openingHours)
  const hasDistricts = !isTBC(SITE.districts)
  const socials = [
    { label: 'Facebook', href: SITE.social.facebook },
    { label: 'Instagram', href: SITE.social.instagram },
    { label: 'TikTok', href: SITE.social.tiktok },
  ].filter((s): s is { label: string; href: string } => !isTBC(s.href))

  return (
    <footer className="bg-navy py-16 text-sky">
      <div className="mx-auto max-w-6xl px-6">
        {/* brief §4: the navy logo variant on this navy footer would be invisible —
            the yellow mark is the one that reads against it. */}
        <Logo variant="yellow" />

        {(hasContact || hasVisit || hasDistricts || socials.length > 0) && (
          <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {hasContact && (
              <div className="space-y-2">
                <h3 className="u-mono text-sky">Contact</h3>
                {!isTBC(SITE.phone) && (
                  <a href={`tel:${SITE.phone}`} className="block text-sky hover:text-yellow">
                    {SITE.phone}
                  </a>
                )}
                {!isTBC(SITE.email) && (
                  <a href={`mailto:${SITE.email}`} className="block text-sky hover:text-yellow">
                    {SITE.email}
                  </a>
                )}
              </div>
            )}

            {hasVisit && (
              <div className="space-y-2">
                <h3 className="u-mono text-sky">Visit</h3>
                {!isTBC(SITE.addressLines) &&
                  SITE.addressLines.map((line) => (
                    <p key={line} className="text-sky">
                      {line}
                    </p>
                  ))}
                {!isTBC(SITE.city) && <p className="text-sky">{SITE.city}</p>}
                {!isTBC(SITE.openingHours) &&
                  SITE.openingHours.map((hours) => (
                    <p key={hours} className="text-sky">
                      {hours}
                    </p>
                  ))}
              </div>
            )}

            {hasDistricts && (
              <div className="space-y-2">
                <h3 className="u-mono text-sky">Districts we cover</h3>
                <p className="text-sky">{(SITE.districts as string[]).join(', ')}</p>
              </div>
            )}

            {socials.length > 0 && (
              <div className="space-y-2">
                <h3 className="u-mono text-sky">Follow</h3>
                <div className="flex gap-4">
                  {socials.map((s) => (
                    <a key={s.label} href={s.href} className="text-sky underline hover:text-yellow">
                      {s.label}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Nothing else on this line: no "all rights reserved", no tagline, no
            invented registration number. */}
        <p className="u-mono mt-12 text-sky">© {new Date().getFullYear()} Roomy Creations</p>
      </div>
    </footer>
  )
}
