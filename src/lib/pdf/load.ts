import { prisma } from '@/lib/prisma'
import type { PdfSettings } from './theme'

// Loads the live company settings used as fallback when a sale has no frozen
// invoice snapshot.
export async function loadPdfSettings(): Promise<PdfSettings | undefined> {
  const settings = await prisma.systemSettings.findFirst()
  if (!settings) return undefined

  return {
    companyName: settings.companyName,
    companyNit: settings.companyNit,
    companyAddress: settings.companyAddress,
    companyCity: settings.companyCity,
    companyPhone: settings.companyPhone,
    companyEmail: settings.companyEmail,
    invoicePrefix: settings.invoicePrefix,
    invoiceFooter: settings.invoiceFooter,
    currency: settings.currency,
  }
}
