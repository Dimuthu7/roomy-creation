import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getJobBalance, loadJob } from '@/lib/jobs/queries'
import { jobTotals } from '@/lib/jobs/totals'
import { listClauses } from '../../clauses/actions'
import { listDocuments } from './documents/actions'
import { CancelQuotationButton } from './CancelQuotationButton'
import { CompleteOrderButton } from './CompleteOrderButton'
import { JobEditor } from './JobEditor'
import { StageButtons } from './StageButtons'

export default async function JobEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const loaded = await loadJob(id)
  if (!loaded) notFound()

  const [terms, warranty, documents, balance] = await Promise.all([
    listClauses('terms'),
    listClauses('warranty'),
    listDocuments(id),
    getJobBalance(id),
  ])
  const hasOrderDocument = documents.some((doc) => doc.kind === 'order')

  const resolved = jobTotals({
    units: loaded.units,
    discountCents: loaded.job.discountCents,
    freeDelivery: loaded.job.freeDelivery,
    deliveryChargeCents: loaded.job.deliveryChargeCents,
  }) !== null

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/jobs" className="u-mono text-xs text-navy/60 underline">
            ← Back to Quotations
          </Link>
          <h1 className="mt-2 font-display text-2xl text-navy">{loaded.job.ref}</h1>
          <p className="u-mono mt-1 text-navy/70">{loaded.customer.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StageButtons jobId={id} stage={loaded.job.stage} resolved={resolved} hasOrderDocument={hasOrderDocument} />
          {loaded.job.stage === 'order' && loaded.job.status !== 'cancelled' && (
            <CompleteOrderButton
              jobId={id}
              balanceCents={balance?.position?.balanceCents ?? null}
              completedAt={loaded.job.status === 'finished' && loaded.job.completedAt ? loaded.job.completedAt.toISOString() : null}
            />
          )}
          {loaded.job.status !== 'cancelled' && <CancelQuotationButton jobId={id} />}
          <Link
            href={`/admin/jobs/${id}/payments`}
            className="rounded-full border border-navy px-4 py-2 font-display text-sm text-navy transition duration-200 hover:bg-navy hover:text-paper active:scale-95"
          >
            Payments
          </Link>
          <Link
            href={`/admin/jobs/${id}/documents`}
            className="rounded-full border border-navy px-4 py-2 font-display text-sm text-navy transition duration-200 hover:bg-navy hover:text-paper active:scale-95"
          >
            Documents
          </Link>
        </div>
      </div>
      <JobEditor
        job={loaded.job}
        customer={loaded.customer}
        units={loaded.units}
        terms={loaded.terms}
        warranty={loaded.warranty}
        libraryTerms={terms
          .filter((c) => c.active)
          .map((c) => ({ id: c.id, body: c.body, emphasis: c.emphasis }))}
        libraryWarranty={warranty
          .filter((c) => c.active)
          .map((c) => ({ id: c.id, body: c.body, emphasis: c.emphasis }))}
      />
    </div>
  )
}
