import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'

type Role = 'admin' | 'patient'

interface ProxySession {
  user: { role: Role; onboardingCompleted: boolean }
}

export default auth(function proxy(req: NextRequest) {
  const session = (req as NextRequest & { auth: ProxySession | null }).auth
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/auth')) {
    if (session) {
      const dest = session.user.onboardingCompleted ? '/app/dashboard' : '/app/onboarding'
      return NextResponse.redirect(new URL(dest, req.url))
    }
    return NextResponse.next()
  }

  if (pathname.startsWith('/admin')) {
    if (!session) {
      const loginUrl = new URL('/auth/login', req.url)
      loginUrl.searchParams.set('callbackUrl', '/admin')
      return NextResponse.redirect(loginUrl)
    }
    if (session.user.role !== 'admin') {
      return NextResponse.redirect(new URL('/', req.url))
    }
    return NextResponse.next()
  }

  if (pathname.startsWith('/app')) {
    if (!session) {
      const loginUrl = new URL('/auth/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
    if (session.user.role === 'admin') {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
    return NextResponse.next()
  }

  if (pathname === '/') {
    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', req.url))
    }
    if (session.user.role === 'admin') {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
    const dest = session.user.onboardingCompleted ? '/app/dashboard' : '/app/onboarding'
    return NextResponse.redirect(new URL(dest, req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.json|icons).*)'],
}
