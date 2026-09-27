import { NewJobForm } from '../NewJobForm'

export default function NewJobPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-navy">New quotation</h1>
        <p className="u-mono mt-1 text-navy/70">
          Customer details to start with — units, pricing and clauses are added next.
        </p>
      </div>

      <NewJobForm />
    </div>
  )
}
