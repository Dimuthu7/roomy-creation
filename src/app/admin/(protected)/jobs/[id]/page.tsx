import { notFound } from 'next/navigation'
import { loadJob } from '@/lib/jobs/queries'
import { listClauses } from '../../clauses/actions'
import { JobEditor } from './JobEditor'

export default async function JobEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const loaded = await loadJob(id)
  if (!loaded) notFound()

  const [terms, warranty] = await Promise.all([listClauses('terms'), listClauses('warranty')])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-navy">{loaded.job.ref}</h1>
        <p className="u-mono mt-1 text-navy/70">{loaded.customer.name}</p>
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
