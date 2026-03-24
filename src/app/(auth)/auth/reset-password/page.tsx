'use client'

import { Suspense, useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { resetPasswordAction, type ResetPasswordState } from './actions'

const initialState: ResetPasswordState = {}

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [state, action, pending] = useActionState(resetPasswordAction, initialState)

  if (!token) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Link inválido</CardTitle>
          <CardDescription>
            Este link de redefinição é inválido ou expirou.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/auth/forgot-password">
            <Button variant="outline" className="w-full">
              Solicitar novo link
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Nova senha</CardTitle>
        <CardDescription>Crie uma senha segura para sua conta.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <input type="hidden" name="token" value={token} />
          <div className="space-y-1.5">
            <Label htmlFor="password">Nova senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="mínimo 8 caracteres"
            />
          </div>
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Salvando…' : 'Redefinir senha'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Suspense fallback={<div className="w-full max-w-sm animate-pulse rounded-lg bg-card p-8 h-48" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
