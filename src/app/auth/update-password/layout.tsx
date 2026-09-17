import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Restablecer contraseña — Cilmax',
  robots: { index: false, follow: false },
}

export default function UpdatePasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}