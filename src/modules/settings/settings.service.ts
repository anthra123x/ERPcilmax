import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import {
  DEFAULT_BUSINESS_WORKFLOW,
  type BusinessWorkflowConfig,
} from '@/lib/business-workflow'

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

export async function getBusinessWorkflowConfig(): Promise<BusinessWorkflowConfig> {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: 'business_workflow' },
  })

  if (!setting || typeof setting.value !== 'object' || setting.value === null) {
    return { ...DEFAULT_BUSINESS_WORKFLOW }
  }

  return {
    ...DEFAULT_BUSINESS_WORKFLOW,
    ...(setting.value as Partial<BusinessWorkflowConfig>),
  }
}

export async function updateBusinessWorkflowConfig(
  config: Partial<BusinessWorkflowConfig>,
): Promise<BusinessWorkflowConfig> {
  const current = await getBusinessWorkflowConfig()
  const updated: BusinessWorkflowConfig = {
    ...current,
    ...config,
  }

  await prisma.storeSetting.upsert({
    where: { key: 'business_workflow' },
    create: {
      key: 'business_workflow',
      value: updated as unknown as Prisma.InputJsonValue,
    },
    update: {
      value: updated as unknown as Prisma.InputJsonValue,
    },
  })

  return updated
}

