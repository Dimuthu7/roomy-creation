import Link from 'next/link'
import { notFound } from 'next/navigation'
import { loadJob } from '@/lib/jobs/queries'
import { listDocuments } from './actions'
import { GeneratePdfButton } from './GeneratePdfButton'
import { GenerateOrderPdfButton } from './GenerateOrderPdfButton'
import { DocumentRow } from './DocumentRow'

export default async function JobDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const loaded = await loadJob(id)
  if (!loaded) notFound()

  const documents = await listDocuments(id)

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/admin/jobs/${id}`} className="u-mono text-xs text-navy/60 underline">
          ← Back to {loaded.job.ref}
        </Link>
        <h1 className="mt-2 font-display text-2xl text-navy">Documents</h1>
        <p className="u-mono mt-1 text-navy/70">
          {loaded.job.ref} — {loaded.customer.name}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <GeneratePdfButton jobId={id} />
        {loaded.job.stage === 'order' && <GenerateOrderPdfButton jobId={id} />}
      </div>

      <div className="space-y-4">
        {documents.length === 0 && <p className="u-mono text-sm text-navy/70">No documents generated yet.</p>}
        {documents.map((doc) => (
          <DocumentRow
            key={doc.id}
            id={doc.id}
            kind={doc.kind}
            number={doc.number}
            blobUrl={doc.blobUrl}
            createdAt={doc.createdAt.toISOString()}
            sentTo={doc.sentTo}
            sentAt={doc.sentAt ? doc.sentAt.toISOString() : null}
            stale={doc.createdAt < loaded.job.updatedAt}
          />
        ))}
      </div>
    </div>
  )
}
