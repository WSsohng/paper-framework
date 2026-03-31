import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { SITE_SESSION_COOKIE, getAuthSecretKey } from '@/lib/auth/site-session'

const LOGIN_PATH = '/login'

function isAuthDisabled(): boolean {
  return process.env.NODE_ENV === 'development' && !process.env.SITE_PASSWORD
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Crawlers / SEO files (no session cookie)
  if (pathname === '/robots.txt' || pathname === '/sitemap.xml') {
    return NextResponse.next()
  }

  if (isAuthDisabled()) {
    return NextResponse.next()
  }

  if (
    process.env.NODE_ENV === 'production' &&
    !process.env.SITE_PASSWORD
  ) {
    return new NextResponse(
      'SITE_PASSWORD 환경 변수를 설정하세요. (Vercel Project Settings → Environment Variables)',
      { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
    )
  }

  const token = request.cookies.get(SITE_SESSION_COOKIE)?.value

  // Logged-in user visiting login → app
  if (pathname === LOGIN_PATH && token) {
    try {
      await jwtVerify(token, getAuthSecretKey())
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } catch {
      const res = NextResponse.next()
      res.cookies.delete(SITE_SESSION_COOKIE)
      return res
    }
  }

  if (pathname === LOGIN_PATH) {
    return NextResponse.next()
  }

  if (!token) {
    const url = request.nextUrl.clone()
    url.pathname = LOGIN_PATH
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  try {
    await jwtVerify(token, getAuthSecretKey())
    return NextResponse.next()
  } catch {
    const url = request.nextUrl.clone()
    url.pathname = LOGIN_PATH
    const res = NextResponse.redirect(url)
    res.cookies.delete(SITE_SESSION_COOKIE)
    return res
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
