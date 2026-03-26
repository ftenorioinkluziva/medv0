import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'

export default auth(function proxy(req: NextRequest) {
  const session = (req as NextRequest & { auth: { user: { role: string } } | null }).auth
  const { pathname } = req.nextUrl

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
    if (session?.user.role === 'admin') {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
}
