import Link from 'next/link'

// Extensible by design: a future tile (Orders, Feedback, Complaints, ...) is a new
// entry here, nothing else in this page changes.
const TILES = [
  {
    label: 'Site details',
    description: 'Contact info, stats and gallery photos',
    href: '/admin/site-details',
  },
] as const

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="font-display text-2xl text-navy">Dashboard</h1>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="block border-2 border-navy bg-paper p-6 transition duration-200 hover:bg-navy hover:text-paper active:scale-[0.98]"
          >
            <span className="font-display text-lg">{tile.label}</span>
            <p className="u-mono mt-2 text-sm opacity-70">{tile.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
