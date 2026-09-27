import { readFileSync } from 'fs'
import { join } from 'path'
import { formatCurrency } from '@/lib/format'

export const FONT = 'Helvetica'

export const COLORS = {
  slate950: '#020617',
  slate900: '#0f172a',
  slate800: '#1e293b',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748b',
  slate400: '#94a3b8',
  slate300: '#cbd5e1',
  slate200: '#e2e8f0',
  slate100: '#f1f5f9',
  slate50: '#f8fafc',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray50: '#f9fafb',
  red600: '#dc2626',
  red700: '#b91c1c',
  emerald700: '#047857',
  emeraldBg: '#ecfdf5',
  amber700: '#b45309',
  amberBg: '#fffbeb',
  white: '#ffffff',
  black: '#111827',
  teal: '#0f172a',
  tealDark: '#0f172a',
  tealLight: '#f8fafc',
  tealBorder: '#e2e8f0',
  amber: '#64748b',
} as const

export interface PdfSettings {
  companyName: string
  companyNit: string | null
  companyAddress: string | null
  companyCity: string | null
  companyPhone: string | null
  companyEmail: string | null
  invoicePrefix: string
  invoiceFooter: string | null
  currency: string
}

export const defaultPdfSettings: PdfSettings = {
  companyName: 'Cilmax',
  companyNit: null,
  companyAddress: null,
  companyCity: null,
  companyPhone: null,
  companyEmail: null,
  invoicePrefix: 'CIL-',
  invoiceFooter: 'Garantía legal sobre productos de conformidad con la ley aplicable.',
  currency: 'COP',
}

export interface PdfInvoiceSnapshot {
  companyName: string
  companyNit: string | null
  companyAddress: string | null
  companyCity: string | null
  companyPhone: string | null
  companyEmail: string | null
  currency: string
  invoiceFooter: string | null
}

export interface PdfCompany {
  name: string
  nit: string | null
  address: string | null
  city: string | null
  phone: string | null
  email: string | null
  footer: string | null
  currency: string
}

// Company data frozen on the sale's invoice snapshot wins over live settings.
export function resolveCompany(settings?: PdfSettings, invoice?: PdfInvoiceSnapshot | null): PdfCompany {
  const s = { ...defaultPdfSettings, ...settings }
  const name = invoice?.companyName || s.companyName
  return {
    name,
    nit: invoice?.companyNit ?? s.companyNit,
    address: invoice?.companyAddress ?? s.companyAddress,
    city: invoice?.companyCity ?? s.companyCity,
    phone: invoice?.companyPhone ?? s.companyPhone,
    email: invoice?.companyEmail ?? s.companyEmail,
    footer: invoice?.invoiceFooter ?? s.invoiceFooter,
    currency: invoice?.currency || s.currency,
  }
}

export function money(value: number, currency = 'COP'): string {
  return formatCurrency(value, currency)
}

export function formatLongDate(value: Date | string): string {
  return new Date(value).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatShortDate(value: Date | string): string {
  return new Date(value).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(value: Date | string): string {
  const date = new Date(value)
  return `${date.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })} · ${date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`
}

export function formatTime(value: Date | string): string {
  return new Date(value).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

let cachedLogo: string | null = null

// Cilmax logo as a base64 data URL, cached across renders. Prefers the
// downscaled print asset to keep generated PDFs small, falling back to the
// full-resolution source.
export function getLogoDataUrl(): string {
  if (cachedLogo !== null) return cachedLogo
  const candidates = ['logo cilmax-print.png', 'logo cilmax.png']
  for (const file of candidates) {
    try {
      const filePath = join(process.cwd(), 'public', file)
      const base64 = readFileSync(filePath).toString('base64')
      cachedLogo = `data:image/png;base64,${base64}`
      return cachedLogo
    } catch {
      // try next candidate
    }
  }
  cachedLogo = ''
  return cachedLogo
}

export const LOGO_ASPECT = 1536 / 1024

export function sumPayments(payments: Array<{ amount: number }> | undefined): number {
  return Math.round((payments ?? []).reduce((total, p) => total + p.amount, 0) * 100) / 100
}
