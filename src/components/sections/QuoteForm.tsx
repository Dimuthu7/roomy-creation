'use client'
import { useEffect, useRef, useState } from 'react'
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react'
import { toast } from 'sonner'
import { enquirySchema, NEED_OPTIONS, PROPERTY_TYPES, SOURCE_OPTIONS } from '@/lib/enquirySchema'
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

const PROPERTY_TYPE_OPTIONS = PROPERTY_TYPES.map((p) => ({ id: p, label: PROPERTY_TYPE_LABELS[p] }))

// Reserves two lines' worth of label height on every field, so a field whose label
// wraps (e.g. "Rough room dimensions, or 'not sure yet'") does not push its input down
// further than its one-line neighbour in the same grid row — both inputs line up.
const LABEL_CLASS = 'u-mono block min-h-10'

// The order fields appear in the form. Used after a failed validation pass to move
// focus to whichever invalid field the visitor sees first, rather than whichever key
// Object.entries happened to enumerate last.
const FIELD_ORDER = [
  'name',
  'phone',
  'email',
  'propertyType',
  'needs',
  'needsOther',
  'dimensions',
  'budget',
  'source',
  'remarks',
]

/**
 * Focuses a control by its `name`, using the form's own elements collection rather than a
 * map of per-field ref callbacks. A callback ref built during render is re-created every
 * render, so React detaches and re-attaches it each time — and reading the map back is
 * `react-hooks/refs`. `elements.namedItem` needs neither. The six same-named `needs`
 * checkboxes come back as a RadioNodeList, so take the first: it is the one the visitor
 * reaches first, and it is where "choose at least one" should land them.
 *
 * `propertyType` and `source` are Headless UI Listboxes: the element registered under
 * that `name` is the hidden, unfocusable input Headless UI syncs for native form
 * submission, not the visible button a keyboard user actually operates. For those, the
 * visible control shares the same `id` as the field name, so it is looked up that way
 * instead.
 */
function focusControl(form: HTMLFormElement, name: string): void {
  const found = form.elements.namedItem(name)
  const el = found instanceof RadioNodeList ? found.item(0) : found
  if (el instanceof HTMLInputElement && el.type === 'hidden') {
    document.getElementById(name)?.focus()
    return
  }
  if (el instanceof HTMLElement) el.focus()
}

export function QuoteForm() {
  const { needs: prefilled } = useEnquiryPrefill()
  const [needs, setNeeds] = useState<string[]>([])
  const [errors, setErrors] = useState<Errors>({})
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form))
    const parsed = enquirySchema.safeParse({ ...data, needs })

    if (!parsed.success) {
      const next: Errors = {}
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0])
        if (!(key in next)) next[key] = issue.message
      }
      setErrors(next)
      const firstInvalid = FIELD_ORDER.find((key) => next[key])
      if (firstInvalid) focusControl(form, firstInvalid)
      toast.warning('Check the highlighted fields before sending.')
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
      if (res.ok) {
        setState('sent')
        toast.success('Enquiry sent — we reply within one working day.')
      } else {
        setState('failed')
        toast.error('That did not send. Check your connection and try again.')
      }
    } catch {
      // fetch rejects on a dropped connection (offline, DNS failure, timeout) rather
      // than resolving with ok: false — the likelier failure mode on a mobile
      // connection, and the one case that must not leave the form stuck in 'sending'.
      setState('failed')
      toast.error('That did not send. Check your connection and try again.')
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
    <form onSubmit={onSubmit} noValidate className="on-paper space-y-6 text-navy">
      <p className="u-mono text-navy">
        <span aria-hidden="true" className="font-bold">
          *
        </span>{' '}
        Required
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Name" error={errors.name} required />
        <Field id="phone" label="Phone" type="tel" error={errors.phone} required />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="email" label="Email" type="email" error={errors.email} />
        <Select
          id="propertyType"
          label="Property type"
          options={PROPERTY_TYPE_OPTIONS}
          error={errors.propertyType}
          required
        />
      </div>

      <fieldset>
        <legend className="u-mono">
          What you need
          <RequiredMark />
        </legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {NEED_OPTIONS.map((n) => (
            <label key={n.id} className="flex items-center gap-2 text-navy">
              <input
                type="checkbox"
                name="needs"
                value={n.id}
                checked={needs.includes(n.id)}
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
          <p id="needs-error" className="u-mono mt-1 text-red-700">
            {errors.needs}
          </p>
        )}
        {needs.includes('other') && (
          <div className="mt-3">
            <label htmlFor="needsOther" className="u-mono block">
              What else?
              <RequiredMark />
            </label>
            <input
              id="needsOther"
              name="needsOther"
              type="text"
              aria-invalid={errors.needsOther ? true : undefined}
              aria-describedby={errors.needsOther ? 'needsOther-error' : undefined}
              className="mt-2 w-full border border-navy bg-transparent p-3 text-navy aria-[invalid=true]:border-red-700"
            />
            {errors.needsOther && (
              <p id="needsOther-error" className="u-mono mt-1 text-red-700">
                {errors.needsOther}
              </p>
            )}
          </div>
        )}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        {/* The "or 'not sure yet'" is approved copy and does real work: most visitors
            enquiring have not measured anything, and without permission to say so they
            either invent a number or give up on the form. Do not shorten this label. */}
        <Field
          id="dimensions"
          label="Rough room dimensions, or 'not sure yet'"
          error={errors.dimensions}
        />
        <Field id="budget" label="Budget range" error={errors.budget} />
      </div>

      <Select
        id="source"
        label="How you found us"
        options={SOURCE_OPTIONS}
        error={errors.source}
        required
      />

      <div>
        <label htmlFor="remarks" className="u-mono block">
          Remarks
        </label>
        <textarea
          id="remarks"
          name="remarks"
          rows={4}
          aria-invalid={errors.remarks ? true : undefined}
          aria-describedby={errors.remarks ? 'remarks-error' : undefined}
          className="mt-2 w-full border border-navy bg-transparent p-3 text-navy aria-[invalid=true]:border-red-700"
        />
        {errors.remarks && (
          <p id="remarks-error" className="u-mono mt-1 text-red-700">
            {errors.remarks}
          </p>
        )}
      </div>

      {state === 'failed' && (
        <p role="alert" className="u-mono border border-red-700 p-3 text-red-700">
          That did not send. Check your connection and try again, or message us on WhatsApp.
        </p>
      )}

      <button
        type="submit"
        disabled={state === 'sending'}
        className="w-full rounded-full bg-yellow px-6 py-4 font-display text-navy transition-colors duration-200 hover:bg-yellow/80 disabled:opacity-60"
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

function RequiredMark() {
  return (
    <>
      <span aria-hidden="true" className="font-bold text-navy">
        {' '}
        *
      </span>
      <span className="sr-only"> (required)</span>
    </>
  )
}

function Field({
  id,
  label,
  type = 'text',
  error,
  required,
}: {
  id: string
  label: string
  type?: string
  error?: string
  required?: boolean
}) {
  return (
    <div>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
        {required && <RequiredMark />}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="mt-2 w-full border border-navy bg-transparent p-3 text-navy aria-[invalid=true]:border-red-700"
      />
      {error && (
        <p id={`${id}-error`} className="u-mono mt-1 text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

function ChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4 shrink-0 text-navy"
    >
      <path
        d="M5 7l5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0">
      <path
        d="M4 10l4 4 8-8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Select({
  id,
  label,
  options,
  error,
  required,
}: {
  id: string
  label: string
  options: readonly { id: string; label: string }[]
  error?: string
  required?: boolean
}) {
  return (
    <div>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
        {required && <RequiredMark />}
      </label>
      <Listbox defaultValue="" name={id}>
        <ListboxButton
          id={id}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-2 flex w-full items-center justify-between gap-2 border border-navy bg-transparent p-3 text-left text-navy aria-[invalid=true]:border-red-700"
        >
          {({ value }: { value: string }) => (
            <>
              <span className={value === '' ? 'text-navy/50' : undefined}>
                {value === '' ? 'Choose one' : options.find((o) => o.id === value)?.label}
              </span>
              <ChevronIcon />
            </>
          )}
        </ListboxButton>
        {/* With this form's short option lists (5-6 items), the panel usually has
            nothing to scroll internally — `overscroll-contain` alone does nothing for
            a touch scroll that starts on an already-off-screen part of a panel that
            plain `absolute` positioning let run past the bottom of a short mobile
            viewport (the "How you found us" field sits near the end of a long form).
            `anchor` hands positioning to floating-ui and portals the panel: it clamps
            the panel's height/placement to whatever space is actually on screen,
            flipping above the button if needed, so the whole panel — and therefore
            any scroll gesture on it — stays reachable. `overscroll-contain` stays on
            too, for the case where a list genuinely does overflow its own
            max-height. */}
        <ListboxOptions
          anchor="bottom start"
          transition
          className="z-20 w-(--button-width) overflow-auto overscroll-contain border border-navy bg-paper text-navy shadow-lg outline-none [--anchor-gap:4px] data-closed:opacity-0 data-leave:transition data-leave:duration-100"
        >
          {options.map((o) => (
            <ListboxOption
              key={o.id}
              value={o.id}
              className="flex cursor-pointer items-center justify-between gap-2 p-3 data-focus:bg-navy data-focus:text-paper data-selected:font-semibold"
            >
              {({ selected }: { selected: boolean }) => (
                <>
                  {o.label}
                  {selected && <CheckIcon />}
                </>
              )}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </Listbox>
      {error && (
        <p id={`${id}-error`} className="u-mono mt-1 text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
