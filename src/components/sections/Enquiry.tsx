import { QuoteForm } from './QuoteForm'

export function Enquiry() {
  return (
    <section
      id="enquiry"
      aria-labelledby="enquiry-heading"
      className="on-paper bg-paper py-24 text-navy"
    >
      <div className="mx-auto max-w-3xl px-6">
        <h2
          id="enquiry-heading"
          className="font-display text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          Get a quotation
        </h2>

        <div className="mt-10">
          <QuoteForm />
        </div>
      </div>
    </section>
  )
}
