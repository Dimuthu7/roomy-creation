import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isValidSessionToken, SESSION_COOKIE_NAME } from '@/lib/adminAuth'

// Optimistic only: a cheap, cookie-signature check to keep an unauthenticated visitor
// out of the admin UI shell and bounce an authenticated one off the login form. The
// authoritative check is adminAuth.ts's verifyAdminSession() (the DAL), called by
// every admin page and every Server Action that touches site_config/works — see its
// doc comment. Proxy must stay cheap (it runs on every matched request, including
// prefetches), so it never touches the database.
export function proxy(request: NextRequest) {
  const isLoginRoute = request.nextUrl.pathname === '/admin/login'
  const isAuthenticated = isValidSessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value)

  if (isLoginRoute) {
    return isAuthenticated
      ? NextResponse.redirect(new URL('/admin', request.url))
      : NextResponse.next()
  }

  if (!isAuthenticated) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
