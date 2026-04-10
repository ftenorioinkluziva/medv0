import middleware from '@/proxy'
export default middleware

export const config = {
  matcher: ['/((?!api/auth(?:/|$)|api/health(?:/|$)|_next/static|_next/image|favicon.ico|manifest.json|icons).*)'],
}
