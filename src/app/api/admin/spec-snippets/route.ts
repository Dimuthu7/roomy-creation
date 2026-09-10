import { desc } from 'drizzle-orm'
import { verifyAdminSession } from '@/lib/adminAuth'
import { db } from '@/db/client'
import { specSnippets } from '@/db/schema'
import { rankSnippets } from '@/lib/jobs/snippetRank'

// This is an admin data path, and src/proxy.ts's cookie-only check does not match
// /api/* — verifyAdminSession() is the real gate here, same as every admin Server Action.
export async function GET(request: Request) {
  await verifyAdminSession()

  const q = new URL(request.url).searchParams.get('q') ?? ''

  const rows = await db
    .select({ id: specSnippets.id, label: specSnippets.label, value: specSnippets.value, useCount: specSnippets.useCount })
    .from(specSnippets)
    .orderBy(desc(specSnippets.useCount))
    .limit(500)

  return Response.json({ snippets: rankSnippets(rows, q) })
}
