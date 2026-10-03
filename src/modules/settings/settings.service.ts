import { prisma } from '@/lib/prisma'

export async function getOrCreateSettings() {
  const existing = await prisma.systemSettings.findFirst()
  if (existing) return existing
  return await prisma.systemSettings.create({ data: {} })
}

export type SettingsData = {
  companyName: string
  companyNit: string | null
  companyAddress: string | null
  companyCity: string | null
  companyPhone: string | null
  companyEmail: string | null
  currency: string
  invoicePrefix: string
  invoiceFooter: string | null
  lowStockThreshold: number
  nextInvoiceNumber?: number
  nextWebOrderNumber?: number
  webPendingExpiryHours?: number
}

export async function updateSettings(data: Partial<SettingsData>) {
  const settings = await getOrCreateSettings()
  return await prisma.systemSettings.update({
    where: { id: settings.id },
    data,
  })
}
