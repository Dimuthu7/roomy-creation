import { getSiteConfig } from '@/data/site'
import { getAllWorks } from '@/data/works'
import { SiteDetailsForm } from './SiteDetailsForm'
import { WorkSlotForm } from './WorkSlotForm'

export default async function SiteDetailsPage() {
  const [site, allWorks] = await Promise.all([getSiteConfig(), getAllWorks()])

  return (
    <div className="space-y-12">
      <div>
        <h1 className="font-display text-2xl text-navy">Site details</h1>
        <p className="u-mono mt-1 text-navy/70">
          Changes here go live on the site immediately after saving.
        </p>
      </div>

      <SiteDetailsForm site={site} />

      <div>
        <h2 className="font-display text-xl text-navy">Gallery</h2>
        <p className="u-mono mt-1 text-navy/70">
          {allWorks.filter((w) => w.image).length} of {allWorks.length} planned slots have a photo.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allWorks.map((slot) => (
            <WorkSlotForm key={slot.id} slot={slot} />
          ))}
        </div>
      </div>
    </div>
  )
}
