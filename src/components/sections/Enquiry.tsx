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

  return (
    <section id="enquiry" className="on-paper bg-paper py-24 text-navy">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Get a quotation
        </h2>

        <div className="mt-10 grid gap-10 md:grid-cols-3">
          <QuoteForm />

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
            <div className="flex gap-4">
              {!isTBC(SITE.social.facebook) && (
                <a href={SITE.social.facebook} className="u-mono text-navy underline">
                  Facebook
                </a>
              )}
              {!isTBC(SITE.social.instagram) && (
                <a href={SITE.social.instagram} className="u-mono text-navy underline">
                  Instagram
                </a>
              )}
              {!isTBC(SITE.social.tiktok) && (
                <a href={SITE.social.tiktok} className="u-mono text-navy underline">
                  TikTok
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
