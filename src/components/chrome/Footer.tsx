import { Logo } from './Logo'
import { SITE } from '@/data/site'
import { isTBC } from '@/lib/tbc'
import { whatsappUrl } from '@/lib/whatsapp'
import { getActiveSocials } from '@/lib/socials'
import { DistrictsIcon, MapPinIcon, PhoneIcon, SOCIAL_ICONS } from './FooterIcons'

// Every block below is [TBC]-gated exactly like Enquiry.tsx: a heading only renders
// once it has content beneath it. With today's all-[TBC] site.ts the footer
// legitimately renders almost nothing — that is correct behaviour, not something to
// paper over with placeholder copy.
export function Footer() {
  const hasContact = !isTBC(SITE.phone) || !isTBC(SITE.email)
  const hasVisit = !isTBC(SITE.addressLines) || !isTBC(SITE.city) || !isTBC(SITE.openingHours)
  const hasDistricts = !isTBC(SITE.districts)
  const socials = getActiveSocials(SITE.social)
  // Same "Chat on WhatsApp" pattern as WhatsAppFloat.tsx: null while SITE.whatsappNumber
  // is [TBC], so the button simply doesn't render rather than linking nowhere.
  const whatsapp = whatsappUrl(SITE.whatsappNumber, 'Hello Roomy Creations, I have a question.')

  return (
    <footer className="bg-navy py-16 text-sky">
      <div className="mx-auto max-w-6xl px-6">
        {/* brief §4: the navy logo variant on this navy footer would be invisible —
            the yellow mark is the one that reads against it. */}
        <Logo variant="yellow" />

        <div className="mt-10 flex flex-col gap-6 border-t border-sky/10 pt-10 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-xl tracking-tight text-paper">
            Ready to get started?
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="#enquiry"
              className="border border-yellow px-6 py-3 font-display text-yellow transition duration-200 hover:bg-yellow hover:text-navy active:scale-95"
            >
              Request a quotation
            </a>
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-yellow px-6 py-3 font-display text-yellow transition duration-200 hover:bg-yellow hover:text-navy active:scale-95"
              >
                Chat on WhatsApp
              </a>
            )}
          </div>
        </div>

        {(hasContact || hasVisit || hasDistricts || socials.length > 0) && (
          <div className="mt-10 grid gap-10 border-t border-sky/10 pt-10 sm:grid-cols-2 lg:grid-cols-4">
            {hasContact && (
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 u-mono text-sky">
                  <PhoneIcon className="h-4 w-4 text-teal" />
                  Contact
                </h3>
                <div className="space-y-2">
                  {!isTBC(SITE.phone) && (
                    <a
                      href={`tel:${SITE.phone}`}
                      className="block text-sky transition-opacity duration-150 hover:text-yellow active:opacity-60"
                    >
                      {SITE.phone}
                    </a>
                  )}
                  {!isTBC(SITE.email) && (
                    <a
                      href={`mailto:${SITE.email}`}
                      className="block text-sky transition-opacity duration-150 hover:text-yellow active:opacity-60"
                    >
                      {SITE.email}
                    </a>
                  )}
                </div>
              </div>
            )}

            {hasVisit && (
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 u-mono text-sky">
                  <MapPinIcon className="h-4 w-4 text-teal" />
                  Visit
                </h3>
                <div className="space-y-2">
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
              </div>
            )}

            {hasDistricts && (
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 u-mono text-sky">
                  <DistrictsIcon className="h-4 w-4 text-teal" />
                  Districts we cover
                </h3>
                <p className="text-sky">{(SITE.districts as string[]).join(', ')}</p>
              </div>
            )}

            {socials.length > 0 && (
              <div className="space-y-3">
                <h3 className="u-mono text-sky">Follow</h3>
                <div className="flex gap-3">
                  {socials.map((s) => {
                    const Icon = SOCIAL_ICONS[s.label]
                    return (
                      <a
                        key={s.label}
                        href={s.href}
                        aria-label={s.label}
                        className="group inline-flex h-10 w-10 items-center justify-center rounded-full border border-teal/40 text-sky transition duration-200 hover:border-teal hover:text-teal active:scale-95"
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Nothing else on this line: no "all rights reserved", no tagline, no
            invented registration number. */}
        <p className="u-mono mt-12 border-t border-sky/10 pt-8 text-sky">
          © {new Date().getFullYear()} Roomy Creations
        </p>
      </div>
    </footer>
  )
}
