'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { forgotPasswordAction, type ForgotPasswordState } from './actions'

const initialState: ForgotPasswordState = {}

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(forgotPasswordAction, initialState)

  if (state.success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 py-8">
        <Card className="w-full max-w-sm rounded-2xl border border-border px-6 py-8">
          <div className="flex flex-col items-center gap-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success">
              <span className="font-heading text-2xl font-medium text-success-foreground">✉</span>
            </div>
            <div className="flex flex-col gap-1.5 text-center">
              <h1 className="font-heading text-[22px] font-medium leading-[1.4286] text-foreground">
                Email enviado
              </h1>
              <p className="text-[13px] font-medium leading-[1.4286] text-muted-foreground">
                Se esse email estiver cadastrado, você receberá um link para redefinir sua senha em instantes.
              </p>
            </div>
            <Link href="/auth/login" className="w-full">
              <Button variant="outline" className="h-12 w-full rounded-xl">
                Voltar para login
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-8">
      <Card className="w-full max-w-sm rounded-2xl border border-border px-6 py-8">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h1 className="text-center font-heading text-[22px] font-medium leading-[1.4286] text-foreground">
              Esqueci minha senha
            </h1>
            <p className="text-center text-[13px] font-medium leading-[1.4286] text-muted-foreground">
              Informe seu email e enviaremos um link para redefinir sua senha.
            </p>
          </div>
          <form action={action} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
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
            <Button
              type="submit"
              className="h-12 w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={pending}
            >
              {pending ? 'Enviando…' : 'Enviar link'}
            </Button>
          </form>
          <p className="text-center text-[13px] font-medium">
            <Link href="/auth/login" className="text-foreground underline-offset-4 hover:underline">
              Voltar para login
            </Link>
          </p>
        </div>
      </Card>
    </div>
  )
}
