import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { loginSchema } from '@/lib/auth/validation'
import { verifyCredentials } from '@/lib/auth/verify-credentials'
import { getUserById } from '@/lib/db/queries/users'

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.name = user.name ?? user.email
        token.role = (user as { role: string }).role
        token.onboardingCompleted = (user as { onboardingCompleted: boolean }).onboardingCompleted
      }
      if (trigger === 'update' && session?.onboardingCompleted !== undefined) {
        token.onboardingCompleted = session.onboardingCompleted
      }
      // Validate user still exists in DB on every token refresh
      if (token.id && !user) {
        const dbUser = await getUserById(token.id as string)
        if (!dbUser || !dbUser.isActive) return null
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.name = token.name as string
        session.user.role = token.role as string
        session.user.onboardingCompleted = token.onboardingCompleted as boolean
      }
      return session
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        return verifyCredentials(parsed.data.email, parsed.data.password)
      },
    }),
  ],
})

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      onboardingCompleted: boolean
    }
  }
}

