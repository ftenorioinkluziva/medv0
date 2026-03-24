'use client'

import { Suspense, useActionState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

type LoginState = { error?: string }

async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const result = await signIn('credentials', {
    email: formData.get('email'),
    password: formData.get('password'),
    redirect: false,
  })

  if (result?.error) {
    return { error: 'Email ou senha inválidos.' }
  }

  return {}
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const resetSuccess = searchParams.get('reset') === 'success'

  const [state, action, pending] = useActionState(async (prev: LoginState, formData: FormData) => {
    const result = await loginAction(prev, formData)
    if (!result.error) {
      const session = await getSession()
      const dest = session?.user?.onboardingCompleted ? '/app/dashboard' : '/app/onboarding'
      router.push(dest)
    }
    return result
  }, {})

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">SAMI</CardTitle>
        <CardDescription>Entre na sua conta</CardDescription>
      </CardHeader>
      <CardContent>
        {resetSuccess && (
          <p className="mb-4 rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-500">
            Senha redefinida com sucesso. Faça login.
          </p>
        )}
        <form action={action} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="seu@email.com"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
              <Link
                href="/auth/forgot-password"
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Esqueci minha senha
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
            />
          </div>
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Não tem conta?{' '}
          <Link href="/auth/register" className="underline underline-offset-4">
            Criar conta
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Suspense fallback={<div className="w-full max-w-sm animate-pulse rounded-lg bg-card p-8 h-64" />}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
