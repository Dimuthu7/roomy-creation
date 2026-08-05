import { QuoteForm } from './QuoteForm'
import { SITE } from '@/data/site'
import { isTBC } from '@/lib/tbc'
import { whatsappUrl } from '@/lib/whatsapp'

export function Enquiry() {
  // useEnquiryPrefill's `prefill` scrolls to `document.getElementById('enquiry')` —
  // this id is not decorative, it is the exact string that path depends on.
  const waUrl = whatsappUrl(
    SITE.whatsappNumber,
    'Hello Roomy Creations, I would like a quotation for ',
  )

  // Every SITE field is [TBC] until the client confirms it, so both of these blocks can
  // legitimately have nothing to put under their heading. A heading with nothing beneath
  // it reads as a broken page, and this is the one section the whole site funnels into —
  // so each block earns its heading from the content that follows it, or does not render.
  const socials = [
    { label: 'Facebook', href: SITE.social.facebook },
    { label: 'Instagram', href: SITE.social.instagram },
    { label: 'TikTok', href: SITE.social.tiktok },
  ].filter((s) => !isTBC(s.href))

  const hasVisitBlock = !isTBC(SITE.addressLines) || !isTBC(SITE.city) || !isTBC(SITE.openingHours)
  const hasWhatsAppBlock = waUrl !== null || socials.length > 0

  return (
    <section id="enquiry" className="on-paper bg-paper py-24 text-navy">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Get a quotation
        </h2>

        <div className="mt-10 grid gap-10 md:grid-cols-3">
          <QuoteForm />

          {hasVisitBlock && (
            <div className="space-y-2">
              <h3 className="u-mono">Measurement visit</h3>
              {!isTBC(SITE.addressLines) &&
                SITE.addressLines.map((line) => (
                  <p key={line} className="text-navy">
                    {line}
                  </p>
                ))}
              {!isTBC(SITE.city) && <p className="text-navy">{SITE.city}</p>}
              {!isTBC(SITE.openingHours) &&
                SITE.openingHours.map((hours) => (
                  <p key={hours} className="text-navy">
                    {hours}
                  </p>
                ))}
            </div>
          )}

          {hasWhatsAppBlock && (
            <div className="space-y-4">
              <h3 className="u-mono">WhatsApp</h3>
              {waUrl && (
                <a
                  href={waUrl}
                  className="inline-block rounded-full bg-yellow px-6 py-2 font-display text-navy"
                >
                  Message us on WhatsApp
                </a>
              )}
              {socials.length > 0 && (
                <div className="flex gap-4">
                  {socials.map((s) => (
                    <a key={s.label} href={s.href as string} className="u-mono text-navy underline">
                      {s.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
