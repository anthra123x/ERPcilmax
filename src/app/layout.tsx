import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/ui/toast-provider'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'Nova ERP — Sistema de Gestión Comercial',
    template: '%s | Nova ERP',
  },
  description: 'Plataforma empresarial de gestión comercial, inventario, facturación y punto de venta.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {process.env.NODE_ENV === 'development' && (
          <script src="https://unpkg.com/react-scan/dist/auto.global.js" async />
        )}
        {children}
        <ToastProvider />
      </body>
    </html>
  )
}
