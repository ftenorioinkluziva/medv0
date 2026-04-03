'use client'

import { Button } from '@/components/ui/button'
import { signOut } from 'next-auth/react'

export default function AdminDashboardPage() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Painel administrativo do SAMI.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => signOut({ callbackUrl: '/auth/login' })}
        >
          Sair
        </Button>
      </div>
    </div>
  )
}
