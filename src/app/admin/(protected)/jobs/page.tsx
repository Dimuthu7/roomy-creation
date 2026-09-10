import Link from 'next/link'
import { listJobs } from '@/lib/jobs/queries'
import { STATUS_LABELS } from '@/lib/jobs/schema'

const STAGE_LABELS: Record<string, string> = {
  quotation: 'Quotation',
  order: 'Order',
}

export default async function JobsPage() {
  const rows = await listJobs()

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-navy">Quotations</h1>
          <p className="u-mono mt-1 text-navy/70">Create, edit and send customer quotations.</p>
        </div>
        <Link
          href="/admin/jobs/new"
          className="rounded-full bg-yellow px-4 py-2 font-display text-sm text-navy transition duration-200 hover:bg-yellow/80 active:scale-95"
        >
          + New quotation
        </Link>
      </div>

      <div className="space-y-3">
        {rows.length === 0 && <p className="u-mono text-sm text-navy/70">No quotations yet.</p>}
        {rows.map((row) => (
          <Link
            key={row.id}
            href={`/admin/jobs/${row.id}`}
            className="flex flex-wrap items-center justify-between gap-4 border-2 border-navy p-4 transition duration-200 hover:bg-navy hover:text-paper"
          >
            <div className="min-w-0">
              <p className="font-display text-sm">{row.ref}</p>
              <p className="u-mono mt-1 truncate text-sm opacity-70">
                {row.customerName} · {row.customerPhone}
              </p>
            </div>
            <div className="u-mono flex shrink-0 items-center gap-4 text-xs">
              <span>{row.quotationDate}</span>
              <span>{STAGE_LABELS[row.stage] ?? row.stage}</span>
              <span>{STATUS_LABELS[row.status as keyof typeof STATUS_LABELS] ?? row.status}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
