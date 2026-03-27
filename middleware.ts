import middleware from '@/proxy'
export default middleware

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.json|icons).*)'],
}
