'use client'
import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { SubmitButtonLabel } from '@/components/admin/SubmitButtonLabel'
import { isTBC, type Maybe } from '@/lib/tbc'
import type { SiteConfig } from '@/data/site'
import { saveSiteDetails, type ActionState } from './actions'

const initialState: ActionState = {}

function text(value: Maybe<string>): string {
  return isTBC(value) ? '' : value
}

function lines(value: Maybe<string[]>): string {
  return isTBC(value) ? '' : value.join('\n')
}

function num(value: Maybe<number>): string {
  return isTBC(value) ? '' : String(value)
}

function boolSelectValue(value: Maybe<boolean>): string {
  return isTBC(value) ? 'unknown' : String(value)
}

const FIELD = 'mt-2 w-full border border-navy bg-transparent p-3 text-navy'
const LABEL = 'u-mono block'

export function SiteDetailsForm({ site }: { site: SiteConfig }) {
  const [state, formAction, pending] = useActionState(saveSiteDetails, initialState)

  useEffect(() => {
    if (state.success) toast.success('Site details saved.')
    else if (state.error) toast.error(state.error)
  }, [state])

  return (
    <form action={formAction} className="space-y-8">
      <fieldset className="space-y-4">
        <legend className="font-display text-lg text-navy">Business details</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name" name="name" defaultValue={site.name} required />
          <Field label="Production URL" name="url" defaultValue={text(site.url)} />
          <Field label="Phone" name="phone" defaultValue={text(site.phone)} />
          <Field label="WhatsApp number (digits only)" name="whatsappNumber" defaultValue={text(site.whatsappNumber)} />
          <Field label="Email" name="email" defaultValue={text(site.email)} />
          <Field label="City" name="city" defaultValue={text(site.city)} />
          <Field label="Postal code" name="postalCode" defaultValue={text(site.postalCode)} />
          <Field label="Google Maps embed URL" name="mapEmbedUrl" defaultValue={text(site.mapEmbedUrl)} />
        </div>
        <TextArea label="Address lines (one per line)" name="addressLines" defaultValue={lines(site.addressLines)} />
        <TextArea label="Districts covered (one per line)" name="districts" defaultValue={lines(site.districts)} />
        <TextArea label="Opening hours (one per line)" name="openingHours" defaultValue={lines(site.openingHours)} />
        <div>
          <label htmlFor="freeMeasurementVisit" className={LABEL}>
            Are measurement visits free?
          </label>
          <select
            id="freeMeasurementVisit"
            name="freeMeasurementVisit"
            defaultValue={boolSelectValue(site.freeMeasurementVisit)}
            className={FIELD}
          >
            <option value="unknown">Unknown</option>
            <option value="true">Yes, free</option>
            <option value="false">No</option>
          </select>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-display text-lg text-navy">Social links</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Facebook URL" name="facebook" defaultValue={text(site.social.facebook)} />
          <Field label="Instagram URL" name="instagram" defaultValue={text(site.social.instagram)} />
          <Field label="TikTok URL" name="tiktok" defaultValue={text(site.social.tiktok)} />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-display text-lg text-navy">Stats</legend>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field
            label="Years in business"
            name="yearsInBusiness"
            type="number"
            defaultValue={num(site.figures.yearsInBusiness)}
          />
          <Field
            label="Homes fitted"
            name="homesFitted"
            type="number"
            defaultValue={num(site.figures.homesFitted)}
          />
          <Field
            label="Units delivered"
            name="unitsDelivered"
            type="number"
            defaultValue={num(site.figures.unitsDelivered)}
          />
          <Field
            label="Districts covered (count)"
            name="districtsCovered"
            type="number"
            defaultValue={num(site.figures.districtsCovered)}
          />
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-yellow px-6 py-3 font-display text-navy transition duration-200 hover:bg-yellow/80 active:scale-95 disabled:opacity-60"
      >
        <SubmitButtonLabel pending={pending} label="Save site details" pendingLabel="Saving" />
      </button>
    </form>
  )
}

function Field({
  label,
  name,
  defaultValue,
  type = 'text',
  required,
}: {
  label: string
  name: string
  defaultValue: string
  type?: string
  required?: boolean
}) {
  return (
    <div>
      <label htmlFor={name} className={LABEL}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className={FIELD}
      />
    </div>
  )
}

function TextArea({
  label,
  name,
  defaultValue,
}: {
  label: string
  name: string
  defaultValue: string
}) {
  return (
    <div>
      <label htmlFor={name} className={LABEL}>
        {label}
      </label>
      <textarea id={name} name={name} rows={3} defaultValue={defaultValue} className={FIELD} />
    </div>
  )
}
