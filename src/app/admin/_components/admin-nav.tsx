'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Users, BookOpen, Bot, LayoutDashboard } from 'lucide-react'
import { signOut } from 'next-auth/react'

const navLinks = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/agents', label: 'Agentes', icon: Bot },
  { href: '/admin/knowledge', label: 'Knowledge Base', icon: BookOpen },
  { href: '/admin/users', label: 'Usuários', icon: Users },
]

interface AdminNavProps {
  adminName: string
}

export function AdminNav({ adminName }: AdminNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 min-h-screen border-r bg-background px-3 py-4 gap-1">
        <div className="px-3 py-2 mb-4">
          <p className="text-xs text-muted-foreground">Admin</p>
          <p className="text-sm font-medium truncate">{adminName}</p>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted ${
                pathname === href ? 'bg-muted font-medium' : 'text-muted-foreground'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
        <button
          onClick={() => signOut({ callbackUrl: '/auth/login' })}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors text-left"
        >
          Sair
        </button>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden flex items-center justify-between border-b px-4 py-3">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
          className="p-1"
        >
          <Menu size={20} />
        </button>
        <span className="text-sm font-medium">Admin</span>
        <span className="text-xs text-muted-foreground truncate max-w-[120px]">{adminName}</span>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex flex-col w-64 min-h-screen bg-background border-r px-3 py-4 gap-1 z-10">
            <div className="flex items-center justify-between px-3 py-2 mb-4">
              <div>
                <p className="text-xs text-muted-foreground">Admin</p>
                <p className="text-sm font-medium truncate">{adminName}</p>
              </div>
              <button onClick={() => setMobileOpen(false)} aria-label="Fechar menu">
                <X size={18} />
              </button>
            </div>
            <nav className="flex flex-col gap-1 flex-1">
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted ${
                    pathname === href ? 'bg-muted font-medium' : 'text-muted-foreground'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              ))}
            </nav>
            <button
              onClick={() => signOut({ callbackUrl: '/auth/login' })}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors text-left"
            >
              Sair
            </button>
          </aside>
        </div>
      )}
    </>
  )
}
