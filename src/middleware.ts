import { auth } from '@/lib/auth/config'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const isLoggedIn = !!session

  const isAuthRoute = nextUrl.pathname.startsWith('/auth/')
  const isAppRoute = nextUrl.pathname.startsWith('/app') ||
    (!nextUrl.pathname.startsWith('/auth') && nextUrl.pathname !== '/')

  if (isAuthRoute && isLoggedIn) {
    const dest = session.user.onboardingCompleted ? '/app/dashboard' : '/app/onboarding'
    return NextResponse.redirect(new URL(dest, nextUrl))
  }

  if (isAppRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL('/auth/login', nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.json|icons).*)'],
}
