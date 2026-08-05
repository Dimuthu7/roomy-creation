import { Resend } from 'resend'
import { enquirySchema } from '@/lib/enquirySchema'

// The client ruled out a CAPTCHA as a conversion killer, which leaves field validation
// as the only thing standing between this endpoint and an abuse script. The form can
// never produce a payload anywhere near this size, so a request this large is rejected
// outright, before it is even parsed — no user-facing copy needed for a request the
// form itself cannot generate.
const MAX_BODY_BYTES = 16 * 1024

export async function POST(request: Request) {
  // Checked before the body is touched. Rejecting after `await request.text()` bounds
  // nothing — by then the whole payload is already buffered in memory, which is the one
  // thing a size limit exists to prevent.
  const declared = Number(request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return Response.json({ ok: false }, { status: 413 })
  }

  // Content-Length can be absent (chunked encoding) or simply lie, so the real length
  // is still checked once the body is in hand.
  const raw = await request.text()
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return Response.json({ ok: false }, { status: 413 })
  }

  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return Response.json({ ok: false }, { status: 400 })
  }

  const parsed = enquirySchema.safeParse(body)
  if (!parsed.success) {
    // The client already validates before sending, so nothing consumes the raw Zod
    // issues — and they contain machine-generated strings that should never reach a
    // visitor's screen (e.g. `Invalid option: expected one of "seating"|"kitchen"|…`).
    return Response.json({ ok: false }, { status: 400 })
  }

  const apiKey = process.env.RESEND_API_KEY
  const toAddress = process.env.ENQUIRY_TO_EMAIL
  const fromAddress = process.env.ENQUIRY_FROM_EMAIL

  // Checked before attempting delivery, not after: sending `to: ['']` (or similar) and
  // trusting whatever Resend does with it risks the visitor seeing the success state
  // while the enquiry goes nowhere — a lost lead that looks like a delivered one, the
  // worst failure this file can produce. A 500 here is always correct: an enquiry that
  // was not sent must never be reported as 200.
  if (!apiKey) {
    console.error('Enquiry route misconfigured: RESEND_API_KEY is not set')
    return Response.json({ ok: false }, { status: 500 })
  }
  if (!toAddress) {
    console.error('Enquiry route misconfigured: ENQUIRY_TO_EMAIL is not set')
    return Response.json({ ok: false }, { status: 500 })
  }
  if (!fromAddress) {
    console.error('Enquiry route misconfigured: ENQUIRY_FROM_EMAIL is not set')
    return Response.json({ ok: false }, { status: 500 })
  }

  const e = parsed.data
  // A newline in `name` survives schema validation (it is a legitimate character in a
  // person's name) but has no business inside a one-line subject. Collapsed here rather
  // than in the schema, since the subject is the only place shape — not validity —
  // matters.
  const subjectName = e.name.replace(/\s+/g, ' ').trim()

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from: fromAddress,
    to: [toAddress],
    replyTo: e.email,
    subject: `Quotation request — ${subjectName}, ${e.propertyType}`,
    text: [
      `Name: ${e.name}`,
      `Phone: ${e.phone}`,
      `Email: ${e.email}`,
      `Property: ${e.propertyType}`,
      `Needs: ${e.needs.join(', ')}`,
      `Dimensions: ${e.dimensions || '—'}`,
      `Budget: ${e.budget || '—'}`,
      `Found us via: ${e.source || '—'}`,
    ].join('\n'),
  })

  if (error) return Response.json({ ok: false }, { status: 502 })
  return Response.json({ ok: true })
}
