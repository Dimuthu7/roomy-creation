'use client'
import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { InferSelectModel } from 'drizzle-orm'
import type { customers as customersTable, jobClauses as jobClausesTable, jobs as jobsTable } from '@/db/schema'
import { AdminSubmitButton } from '@/components/admin/AdminSubmitButton'
import { formatCents, parseMoneyToCents } from '@/lib/money'
import { JOB_STATUSES, STATUS_LABELS } from '@/lib/jobs/schema'
import { jobTotals } from '@/lib/jobs/totals'
import type { JobUnit as JobUnitTotals } from '@/lib/jobs/totals'
import type { DraftUnit } from '@/lib/jobs/unitEditor'
import { DeliveryFields } from './DeliveryFields'
import { UnitFields } from './UnitFields'
import { ClausePicker } from './ClausePicker'
import type { ClauseDraft, LibraryClauseOption } from './ClausePicker'
import { saveJob, type ActionState } from '../actions'

type JobRow = InferSelectModel<typeof jobsTable>
type CustomerRow = InferSelectModel<typeof customersTable>
type JobClauseRow = InferSelectModel<typeof jobClausesTable>

const FIELD = 'mt-1 w-full border border-navy bg-transparent p-2 text-sm text-navy'
const LABEL = 'u-mono block text-xs'
const initialState: ActionState = {}

function jobUnitsToDraft(units: JobUnitTotals[]): DraftUnit[] {
  return units.map((unit) => ({
    key: unit.id,
    title: unit.title,
    options: unit.options.map((option) => ({
      key: option.id,
      label: option.label ?? '',
      price: formatCents(option.priceCents),
      qty: String(option.qty),
      selected: option.selected,
      specs: option.specs.map((spec) => ({ label: spec.label ?? '', value: spec.value })),
    })),
  }))
}

/** Mirrors jobUnitsToDraft in reverse, for the live totals preview only — an
 *  unparseable price/qty resolves to 0 rather than throwing, since the admin may
 *  simply be mid-edit of that field. */
function draftToJobUnits(units: DraftUnit[]): JobUnitTotals[] {
  return units.map((unit) => ({
    id: unit.key,
    title: unit.title,
    options: unit.options.map((option) => ({
      id: option.key,
      label: option.label || null,
      priceCents: parseMoneyToCents(option.price) ?? 0,
      qty: Number(option.qty) || 0,
      selected: option.selected,
      specs: option.specs.map((spec) => ({ label: spec.label || null, value: spec.value })),
    })),
  }))
}

export function JobEditor({
  job,
  customer,
  units,
  terms,
  warranty,
  libraryTerms,
  libraryWarranty,
}: {
  job: JobRow
  customer: CustomerRow
  units: JobUnitTotals[]
  terms: JobClauseRow[]
  warranty: JobClauseRow[]
  libraryTerms: LibraryClauseOption[]
  libraryWarranty: LibraryClauseOption[]
}) {
  const [state, formAction] = useActionState(saveJob, initialState)

  useEffect(() => {
    if (state.success) toast.success('Quotation saved.')
    else if (state.error) toast.error(state.error)
  }, [state])

  const initialDraftUnits = jobUnitsToDraft(units)
  const [liveUnits, setLiveUnits] = useState<DraftUnit[]>(initialDraftUnits)
  const [discountInput, setDiscountInput] = useState(formatCents(job.discountCents))
  const [delivery, setDelivery] = useState({
    freeDelivery: job.freeDelivery,
    deliveryCharge: job.deliveryChargeCents !== null ? formatCents(job.deliveryChargeCents) : '',
  })

  const previewTotals = jobTotals({
    units: draftToJobUnits(liveUnits),
    discountCents: parseMoneyToCents(discountInput) ?? 0,
    freeDelivery: delivery.freeDelivery,
    deliveryChargeCents: delivery.freeDelivery ? null : (parseMoneyToCents(delivery.deliveryCharge) ?? null),
  })

  const initialTerms: ClauseDraft[] = terms.map((c) => ({ body: c.body, emphasis: c.emphasis }))
  const initialWarranty: ClauseDraft[] = warranty.map((c) => ({ body: c.body, emphasis: c.emphasis }))

  return (
    <form action={formAction} className="space-y-10">
      <input type="hidden" name="id" value={job.id} />

      <section className="space-y-4">
        <h2 className="font-display text-lg text-navy">Customer</h2>
        <div>
          <label htmlFor="name" className={LABEL}>
            Name
          </label>
          <input id="name" name="name" defaultValue={customer.name} required className={FIELD} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="phone" className={LABEL}>
              Phone
            </label>
            <input id="phone" name="phone" defaultValue={customer.phone} required className={FIELD} />
          </div>
          <div>
            <label htmlFor="email" className={LABEL}>
              Email
            </label>
            <input id="email" name="email" type="email" defaultValue={customer.email ?? ''} className={FIELD} />
          </div>
        </div>
        <div>
          <label htmlFor="addressLines" className={LABEL}>
            Address (one line at a time)
          </label>
          <textarea
            id="addressLines"
            name="addressLines"
            rows={2}
            defaultValue={(customer.addressLines ?? []).join('\n')}
            className={FIELD}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="city" className={LABEL}>
              City
            </label>
            <input id="city" name="city" defaultValue={customer.city ?? ''} className={FIELD} />
          </div>
          <div>
            <label htmlFor="district" className={LABEL}>
              District
            </label>
            <input id="district" name="district" defaultValue={customer.district ?? ''} className={FIELD} />
          </div>
        </div>
        <div>
          {/* Named distinctly from the job's own `notes` field below — both live on
              this one <form>, and FormData can only hold one value per name. saveJob
              reads this one back for customerFormSchema under the key `notes`. */}
          <label htmlFor="customerNotes" className={LABEL}>
            Customer notes
          </label>
          <textarea id="customerNotes" name="customerNotes" rows={2} defaultValue={customer.notes ?? ''} className={FIELD} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg text-navy">Quotation details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="salesPerson" className={LABEL}>
              Sales person
            </label>
            <input id="salesPerson" name="salesPerson" defaultValue={job.salesPerson ?? ''} className={FIELD} />
          </div>
          <div>
            <label htmlFor="status" className={LABEL}>
              Status
            </label>
            <select id="status" name="status" defaultValue={job.status} className={FIELD}>
              {JOB_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="quotationDate" className={LABEL}>
              Quotation date
            </label>
            <input
              id="quotationDate"
              name="quotationDate"
              type="date"
              defaultValue={job.quotationDate}
              required
              className={FIELD}
            />
          </div>
          <div>
            <label htmlFor="estimationDate" className={LABEL}>
              Estimation date
            </label>
            <input
              id="estimationDate"
              name="estimationDate"
              type="date"
              defaultValue={job.estimationDate ?? ''}
              className={FIELD}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="discountLabel" className={LABEL}>
              Discount label
            </label>
            <input id="discountLabel" name="discountLabel" defaultValue={job.discountLabel} className={FIELD} />
          </div>
          <div>
            <label htmlFor="discount" className={LABEL}>
              Discount amount
            </label>
            <input
              id="discount"
              name="discount"
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              inputMode="decimal"
              className={FIELD}
            />
          </div>
        </div>
        <div>
          <label htmlFor="advance" className={LABEL}>
            Advance amount (agreed, optional)
          </label>
          <input
            id="advance"
            name="advance"
            defaultValue={job.advanceCents !== null ? formatCents(job.advanceCents) : ''}
            inputMode="decimal"
            className={FIELD}
          />
        </div>
        <div>
          <label htmlFor="notes" className={LABEL}>
            Internal notes
          </label>
          <textarea id="notes" name="notes" rows={2} defaultValue={job.notes ?? ''} className={FIELD} />
        </div>
        <DeliveryFields
          freeDelivery={job.freeDelivery}
          deliveryCharge={job.deliveryChargeCents !== null ? formatCents(job.deliveryChargeCents) : ''}
          onChange={setDelivery}
        />
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg text-navy">Units</h2>
        <UnitFields initialUnits={initialDraftUnits} onChange={setLiveUnits} />
      </section>

      <section className="space-y-2 border-2 border-navy p-4">
        <h2 className="font-display text-lg text-navy">Totals</h2>
        {previewTotals ? (
          <dl data-testid="totals-preview" className="u-mono space-y-1 text-sm text-navy">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd data-testid="totals-subtotal">{formatCents(previewTotals.subtotalCents)}</dd>
            </div>
            {previewTotals.discountCents > 0 && (
              <div className="flex justify-between">
                <dt>{discountInput ? job.discountLabel : 'Discount'}</dt>
                <dd data-testid="totals-discount">{formatCents(previewTotals.discountCents)}</dd>
              </div>
            )}
            {previewTotals.deliveryCents > 0 && (
              <div className="flex justify-between">
                <dt>Delivery</dt>
                <dd data-testid="totals-delivery">{formatCents(previewTotals.deliveryCents)}</dd>
              </div>
            )}
            <div className="flex justify-between font-bold">
              <dt>Total</dt>
              <dd data-testid="totals-total">{formatCents(previewTotals.totalCents)}</dd>
            </div>
          </dl>
        ) : (
          <p data-testid="totals-unresolved" className="u-mono text-sm text-navy/70">
            Add a unit and pick one option on every unit that offers a choice to see a total.
          </p>
        )}
      </section>

      <section className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <ClausePicker fieldName="terms" title="Terms & conditions" initialClauses={initialTerms} library={libraryTerms} />
        <ClausePicker fieldName="warranty" title="Warranty" initialClauses={initialWarranty} library={libraryWarranty} />
      </section>

      <AdminSubmitButton
        label="Save quotation"
        pendingLabel="Saving"
        className="rounded-full bg-yellow px-6 py-3 font-display text-sm text-navy transition duration-200 hover:bg-yellow/80 active:scale-95 disabled:opacity-60"
      />
    </form>
  )
}
