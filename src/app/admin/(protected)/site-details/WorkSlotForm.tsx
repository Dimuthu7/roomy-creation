'use client'
import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { SubmitButtonLabel } from '@/components/admin/SubmitButtonLabel'
import { isTBC, type Maybe } from '@/lib/tbc'
import { CATEGORIES } from '@/data/categories'
import { RATIOS, type WorkSlot } from '@/data/workTypes'
import { saveWork, type ActionState } from './actions'

const initialState: ActionState = {}
const PROPERTY_TYPES = ['house', 'apartment', 'hotel', 'office'] as const
const WORK_CATEGORIES = CATEGORIES.filter((c) => c.id !== 'all')

function text(value: Maybe<string>): string {
  return isTBC(value) ? '' : value
}

function num(value: Maybe<number>): string {
  return isTBC(value) ? '' : String(value)
}

const FIELD = 'mt-1 w-full border border-navy bg-transparent p-2 text-sm text-navy'
const LABEL = 'u-mono block text-xs'

export function WorkSlotForm({ slot }: { slot: WorkSlot }) {
  const [state, formAction, pending] = useActionState(saveWork, initialState)

  useEffect(() => {
    if (state.success) toast.success(`${slot.id} saved.`)
    else if (state.error) toast.error(state.error)
  }, [state, slot.id])

  return (
    <form action={formAction} className="space-y-3 border-2 border-navy p-4">
      <input type="hidden" name="id" value={slot.id} />

      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-navy/30 bg-navy/5 text-center">
          {slot.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- thumbnail preview only, not a page image
            <img src={slot.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="u-mono text-[10px] text-navy/50">No photo</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-sm text-navy">{slot.id}</p>
          <label className="u-mono mt-1 block text-xs text-navy/70">
            Replace photo
            <input type="file" name="image" accept="image/*" className="mt-1 block text-xs" />
          </label>
        </div>
      </div>

      <div>
        <label htmlFor={`${slot.id}-title`} className={LABEL}>
          Title
        </label>
        <input id={`${slot.id}-title`} name="title" defaultValue={slot.title} required className={FIELD} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${slot.id}-category`} className={LABEL}>
            Category
          </label>
          <select id={`${slot.id}-category`} name="category" defaultValue={slot.category} className={FIELD}>
            {WORK_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${slot.id}-ratio`} className={LABEL}>
            Ratio
          </label>
          <select id={`${slot.id}-ratio`} name="ratio" defaultValue={slot.ratio} className={FIELD}>
            {RATIOS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${slot.id}-materials`} className={LABEL}>
            Materials
          </label>
          <input id={`${slot.id}-materials`} name="materials" defaultValue={text(slot.materials)} className={FIELD} />
        </div>
        <div>
          <label htmlFor={`${slot.id}-dimensions`} className={LABEL}>
            Dimensions
          </label>
          <input
            id={`${slot.id}-dimensions`}
            name="dimensions"
            defaultValue={text(slot.dimensions)}
            className={FIELD}
          />
        </div>
        <div>
          <label htmlFor={`${slot.id}-hardware`} className={LABEL}>
            Hardware
          </label>
          <input id={`${slot.id}-hardware`} name="hardware" defaultValue={text(slot.hardware)} className={FIELD} />
        </div>
        <div>
          <label htmlFor={`${slot.id}-propertyType`} className={LABEL}>
            Property type
          </label>
          <select
            id={`${slot.id}-propertyType`}
            name="propertyType"
            defaultValue={isTBC(slot.propertyType) ? '' : slot.propertyType}
            className={FIELD}
          >
            <option value="">Unknown</option>
            {PROPERTY_TYPES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${slot.id}-district`} className={LABEL}>
            District
          </label>
          <input id={`${slot.id}-district`} name="district" defaultValue={text(slot.district)} className={FIELD} />
        </div>
        <div>
          <label htmlFor={`${slot.id}-year`} className={LABEL}>
            Year
          </label>
          <input
            id={`${slot.id}-year`}
            name="year"
            type="number"
            defaultValue={num(slot.year)}
            className={FIELD}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-yellow px-4 py-2 font-display text-sm text-navy transition duration-200 hover:bg-yellow/80 active:scale-95 disabled:opacity-60"
      >
        <SubmitButtonLabel pending={pending} label="Save" pendingLabel="Saving" spinnerSize={14} />
      </button>
    </form>
  )
}
