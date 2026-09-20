import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatCents } from '@/lib/money'
import { getJobBalance, loadJob } from '@/lib/jobs/queries'
import { PaymentForm } from './PaymentForm'
import { PaymentRow } from './PaymentRow'

export default async function JobPaymentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const loaded = await loadJob(id)
  if (!loaded) notFound()

  const balance = await getJobBalance(id)

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/admin/jobs/${id}`} className="u-mono text-xs text-navy/60 underline">
          ← Back to {loaded.job.ref}
        </Link>
        <h1 className="mt-2 font-display text-2xl text-navy">Payments</h1>
        <p className="u-mono mt-1 text-navy/70">
          {loaded.job.ref} — {loaded.customer.name}
        </p>
      </div>

      <div className="border-2 border-navy p-4">
        {balance?.position ? (
          <dl data-testid="balance-summary" className="u-mono grid grid-cols-2 gap-2 text-sm text-navy sm:grid-cols-4">
            <div>
              <dt className="text-navy/60">Total</dt>
              <dd data-testid="balance-total">{formatCents(balance.totals!.totalCents)}</dd>
            </div>
            <div>
              <dt className="text-navy/60">Paid</dt>
              <dd data-testid="balance-paid">{formatCents(balance.position.paidCents)}</dd>
            </div>
            <div>
              <dt className="text-navy/60">Balance</dt>
              <dd data-testid="balance-remaining">{formatCents(balance.position.balanceCents)}</dd>
            </div>
          </dl>
        ) : (
          <p data-testid="balance-unresolved" className="u-mono text-sm text-navy/70">
            This job has no total yet — resolve every unit&apos;s option before a balance can be shown.
          </p>
        )}
      </div>

      <PaymentForm jobId={id} stage={loaded.job.stage} />

      <div className="space-y-4">
        {(!balance || balance.payments.length === 0) && (
          <p className="u-mono text-sm text-navy/70">No payments recorded yet.</p>
        )}
        {balance?.payments.map((p) => (
          <PaymentRow
            key={p.id}
            id={p.id}
            jobId={id}
            kind={p.kind}
            amountCents={p.amountCents}
            paidAt={p.paidAt}
            method={p.method}
            note={p.note}
          />
        ))}
      </div>
    </div>
  )
}
