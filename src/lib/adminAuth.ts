import 'server-only'
import { createHash, createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'

export const SESSION_COOKIE_NAME = 'admin_session'
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000 // ~30 days, per the approved design

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET is not set — copy .env.example to .env.local and fill it in.')
  }
  return secret
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

// Hashing both sides to a fixed length before comparing means a mismatched-length
// input can't be distinguished by timing from a same-length one — the usual gap in a
// naive === or even a length-checked timingSafeEqual on raw strings.
function safeEqual(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a).digest()
  const hashB = createHash('sha256').update(b).digest()
  return timingSafeEqual(hashA, hashB)
}

/** Compares submitted credentials against ADMIN_USERNAME/ADMIN_PASSWORD, constant-time. */
export function checkCredentials(username: string, password: string): boolean {
  const expectedUsername = process.env.ADMIN_USERNAME
  const expectedPassword = process.env.ADMIN_PASSWORD
  if (!expectedUsername || !expectedPassword) {
    throw new Error(
      'ADMIN_USERNAME/ADMIN_PASSWORD are not set — copy .env.example to .env.local and fill it in.',
    )
  }
  // Both sides always run, so a wrong username can't short-circuit before the
  // password check and leak which field failed through timing.
  const usernameOk = safeEqual(username, expectedUsername)
  const passwordOk = safeEqual(password, expectedPassword)
  return usernameOk && passwordOk
}

/** Exported for tests, which can't easily reach createSession()'s cookies() call
 *  outside a request context — this lets them exercise a real sign/verify round trip. */
export function issueToken(): string {
  const expiresAt = Date.now() + SESSION_DURATION_MS
  const payload = Buffer.from(JSON.stringify({ expiresAt })).toString('base64url')
  return `${payload}.${sign(payload)}`
}

/** Verifies a session cookie's signature and expiry. Safe to call outside a request
 *  context (e.g. from src/proxy.ts) — reads no cookies itself, does no redirect. */
export function isValidSessionToken(token: string | undefined): boolean {
  if (!token) return false
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return false
  if (!safeEqual(sign(payload), signature)) return false
  try {
    const { expiresAt } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return typeof expiresAt === 'number' && Date.now() < expiresAt
  } catch {
    return false
  }
}

/** Sets the signed admin session cookie. Only callable from a Server Action or Route Handler. */
export async function createSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, issueToken(), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_MS / 1000,
  })
}

/** Clears the admin session cookie. Only callable from a Server Action or Route Handler. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

/** DAL: the authoritative check for admin pages and Server Actions. Redirects to
 *  /admin/login when the session is missing or invalid, rather than merely
 *  reporting false — src/proxy.ts's cookie-only check is optimistic and UX-only,
 *  this is the real gate every admin data path must go through. */
export const verifyAdminSession = cache(async (): Promise<void> => {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (!isValidSessionToken(token)) {
    redirect('/admin/login')
  }
})
