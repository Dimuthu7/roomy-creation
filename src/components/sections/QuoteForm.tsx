'use client'
import { useEffect, useRef, useState } from 'react'
import { enquirySchema, NEED_OPTIONS, PROPERTY_TYPES } from '@/lib/enquirySchema'
import { useEnquiryPrefill } from '@/context/EnquiryPrefill'
import { SITE } from '@/data/site'

type Errors = Record<string, string>

const PROPERTY_TYPE_LABELS: Record<(typeof PROPERTY_TYPES)[number], string> = {
  house: 'House',
  apartment: 'Apartment',
  hotel: 'Hotel',
  office: 'Office',
  other: 'Other',
}

// The order fields appear in the form. Used after a failed validation pass to move
// focus to whichever invalid field the visitor sees first, rather than whichever key
// Object.entries happened to enumerate last.
const FIELD_ORDER = ['name', 'phone', 'email', 'propertyType', 'needs', 'dimensions', 'budget', 'source']

export function QuoteForm() {
  const { needs: prefilled } = useEnquiryPrefill()
  const [needs, setNeeds] = useState<string[]>([])
  const [errors, setErrors] = useState<Errors>({})
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({})
  const successRef = useRef<HTMLDivElement>(null)
  // Ids already merged from the prefill context. A checkbox the visitor deliberately
  // unticks must stay unticked even if the same id shows up again in `prefilled` (its
  // identity changes whenever any card prefills anything) — only ids that are new
  // since the last merge get added back.
  const mergedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const freshIds = prefilled.filter((id) => !mergedRef.current.has(id))
    if (freshIds.length === 0) return
    for (const id of freshIds) mergedRef.current.add(id)
    setNeeds((current) => [...new Set([...current, ...freshIds])])
  }, [prefilled])

  useEffect(() => {
    if (state === 'sent') successRef.current?.focus()
  }, [state])

  function registerRef(key: string) {
    return (el: HTMLElement | null) => {
      fieldRefs.current[key] = el
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = Object.fromEntries(new FormData(e.currentTarget))
    const parsed = enquirySchema.safeParse({ ...data, needs })

    if (!parsed.success) {
      const next: Errors = {}
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0])
        if (!(key in next)) next[key] = issue.message
      }
      setErrors(next)
      const firstInvalid = FIELD_ORDER.find((key) => next[key])
      if (firstInvalid) fieldRefs.current[firstInvalid]?.focus()
      return
    }

    setErrors({})
    setState('sending')
    try {
      const res = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })
      setState(res.ok ? 'sent' : 'failed')
    } catch {
      // fetch rejects on a dropped connection (offline, DNS failure, timeout) rather
      // than resolving with ok: false — the likelier failure mode on a mobile
      // connection, and the one case that must not leave the form stuck in 'sending'.
      setState('failed')
    }
  }

  if (state === 'sent') {
    return (
      <div
        ref={successRef}
        role="status"
        tabIndex={-1}
        className="on-paper border-2 border-navy p-8 text-navy"
      >
        <h3 className="font-display text-2xl text-navy">We have your enquiry</h3>
        <p className="mt-3 text-navy">
          We reply within one working day. If it is urgent, message us on WhatsApp.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="on-paper space-y-5 text-navy">
      <Field id="name" label="Name" error={errors.name} registerRef={registerRef('name')} />
      <Field
        id="phone"
        label="Phone"
        type="tel"
        error={errors.phone}
        registerRef={registerRef('phone')}
      />
      <Field
        id="email"
        label="Email"
        type="email"
        error={errors.email}
        registerRef={registerRef('email')}
      />

      <div>
        <label htmlFor="propertyType" className="u-mono block">
          Property type
        </label>
        <select
          id="propertyType"
          name="propertyType"
          defaultValue=""
          ref={registerRef('propertyType')}
          aria-invalid={errors.propertyType ? true : undefined}
          aria-describedby={errors.propertyType ? 'propertyType-error' : undefined}
          className="mt-2 w-full border border-navy bg-transparent p-3 text-navy"
        >
          <option value="" disabled>
            Choose one
          </option>
          {PROPERTY_TYPES.map((p) => (
            <option key={p} value={p}>
              {PROPERTY_TYPE_LABELS[p]}
            </option>
          ))}
        </select>
        {errors.propertyType && (
          <p id="propertyType-error" className="u-mono mt-1 text-navy">
            {errors.propertyType}
          </p>
        )}
      </div>

      <fieldset>
        <legend className="u-mono">What you need</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {NEED_OPTIONS.map((n, i) => (
            <label key={n.id} className="flex items-center gap-2 text-navy">
              <input
                type="checkbox"
                name="needs"
                value={n.id}
                checked={needs.includes(n.id)}
                ref={i === 0 ? registerRef('needs') : undefined}
                aria-describedby={errors.needs ? 'needs-error' : undefined}
                onChange={(e) =>
                  setNeeds((current) =>
                    e.target.checked ? [...current, n.id] : current.filter((x) => x !== n.id),
                  )
                }
              />
              {n.label}
            </label>
          ))}
        </div>
        {errors.needs && (
          <p id="needs-error" className="u-mono mt-1 text-navy">
            {errors.needs}
          </p>
        )}
      </fieldset>

      <Field
        id="dimensions"
        label="Rough room dimensions"
        error={errors.dimensions}
        registerRef={registerRef('dimensions')}
      />
      <Field
        id="budget"
        label="Budget range (optional)"
        error={errors.budget}
        registerRef={registerRef('budget')}
      />
      <Field
        id="source"
        label="How you found us"
        error={errors.source}
        registerRef={registerRef('source')}
      />

      {state === 'failed' && (
        <p role="alert" className="u-mono border border-navy p-3 text-navy">
          That did not send. Check your connection and try again, or message us on WhatsApp.
        </p>
      )}

      <button
        type="submit"
        disabled={state === 'sending'}
        className="w-full bg-yellow px-6 py-4 font-display text-navy disabled:opacity-60"
      >
        {state === 'sending' ? 'Sending' : 'Send enquiry'}
      </button>

      <p className="u-mono">We reply within one working day.</p>
      {SITE.freeMeasurementVisit === true && (
        <p className="u-mono">Measurement visits are free and carry no obligation.</p>
      )}
    </form>
  )
}

function Field({
  id,
  label,
  type = 'text',
  error,
  registerRef,
}: {
  id: string
  label: string
  type?: string
  error?: string
  registerRef: (el: HTMLElement | null) => void
}) {
  return (
    <div>
      <label htmlFor={id} className="u-mono block">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        ref={registerRef}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="mt-2 w-full border border-navy bg-transparent p-3 text-navy"
      />
      {error && (
        <p id={`${id}-error`} className="u-mono mt-1 text-navy">
          {error}
        </p>
      )}
    </div>
  )
}
