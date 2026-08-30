import { verifyAdminSession } from '@/lib/adminAuth'

// This route group is the authoritative auth gate (src/proxy.ts's check is only
// optimistic — see its doc comment). Every page under (protected) renders behind
// this await, so none of them need to call verifyAdminSession() themselves.
//
// Nav (its admin variant) is the only header now — it carries sign-out, the
// "Admin" indicator, and navigation, so this layout doesn't repeat any of it.
export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  await verifyAdminSession()

  return (
    <div className="min-h-screen bg-paper pt-20 text-navy">
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  )
}
