'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { registerAction, type RegisterState } from './actions'

const initialState: RegisterState = {}

export default function RegisterPage() {
  const [state, action, pending] = useActionState(registerAction, initialState)

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-8">
      <Card className="w-full max-w-sm rounded-2xl border border-border px-6 py-8">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-center font-heading text-[26px] font-medium leading-[1.4286] text-foreground">
              Criar conta
            </h1>
            <p className="text-center text-sm font-medium text-muted-foreground">
              Comece sua jornada no SAMI
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Senha</Label>
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
            <Button
              type="submit"
              className="h-12 w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={pending}
            >
              {pending ? 'Criando conta…' : 'Criar conta'}
            </Button>
          </form>
          <p className="flex justify-center gap-1 text-[13px] font-medium">
            <span className="text-muted-foreground">Já tem conta?</span>
            <Link href="/auth/login" className="text-foreground underline-offset-4 hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </Card>
    </div>
  )
}
