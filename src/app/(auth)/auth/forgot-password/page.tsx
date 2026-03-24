'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { forgotPasswordAction, type ForgotPasswordState } from './actions'

const initialState: ForgotPasswordState = {}

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(forgotPasswordAction, initialState)

  if (state.success) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle>Email enviado</CardTitle>
            <CardDescription>
              Se esse email estiver cadastrado, você receberá um link para redefinir sua senha em instantes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth/login">
              <Button variant="outline" className="w-full">
                Voltar para login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Esqueci minha senha</CardTitle>
          <CardDescription>
            Informe seu email e enviaremos um link para redefinir sua senha.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
            {state.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Enviando…' : 'Enviar link'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link href="/auth/login" className="underline underline-offset-4">
              Voltar para login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
