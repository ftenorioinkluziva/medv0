import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { cn } from '@/lib/utils'
import { Toaster } from '@/components/ui/sonner'

export const metadata: Metadata = {
  title: 'SAMI',
  description: 'Sistema de Análise Médica Inteligente',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#09090b',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      className={cn('dark', 'font-sans', GeistSans.variable, GeistMono.variable)}
      // suppressHydrationWarning: intencional — previne mismatch com className 'dark' aplicado server-side (dark mode Tailwind)
      suppressHydrationWarning
    >
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
