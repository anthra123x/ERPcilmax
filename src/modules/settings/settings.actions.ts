'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin, requireAuth } from '@/modules/auth/auth.actions'
import { z } from 'zod'
import { tryCatch } from '@/lib/errors'
import { getString } from '@/lib/form-data'
import type { ActionResult } from '@/types'
import { success, failure } from '@/types'
import {
  getOrCreateSettings,
  updateSettings,
  getBusinessWorkflowConfig,
  updateBusinessWorkflowConfig,
} from './settings.service'
import type { BusinessWorkflowConfig } from '@/lib/business-workflow'

const UpdateSettingsSchema = z.object({
  companyName: z.string().min(1, 'Razón social o nombre comercial requerido'),
  companyNit: z.string().optional().default(''),
  companyAddress: z.string().optional().default(''),
  companyCity: z.string().optional().default(''),
  companyPhone: z.string().optional().default(''),
  companyEmail: z.string().email('Email inválido').optional().or(z.literal('')),
  currency: z.enum(['COP', 'USD', 'EUR', 'MXN', 'PEN', 'CLP', 'ARS']).default('COP'),
  invoicePrefix: z.string().min(1, 'Prefijo de facturación requerido').default('FAC-'),
  invoiceFooter: z.string().optional().default(''),
  lowStockThreshold: z.coerce.number().int().min(0).default(5),
  nextInvoiceNumber: z.coerce.number().int().min(1).default(1),
  nextWebOrderNumber: z.coerce.number().int().min(1).default(1000),
  webPendingExpiryHours: z.coerce.number().int().min(1).max(720).default(24),
})

export async function getSystemSettings() {
  await requireAuth()
  return tryCatch(() => getOrCreateSettings(), { context: 'getSystemSettings' })
}

export async function updateSystemSettings(formData: FormData): Promise<ActionResult> {
  await requireAdmin()

  const raw = {
    companyName: getString(formData, 'companyName') || '',
    companyNit: getString(formData, 'companyNit'),
    companyAddress: getString(formData, 'companyAddress'),
    companyCity: getString(formData, 'companyCity'),
    companyPhone: getString(formData, 'companyPhone'),
    companyEmail: getString(formData, 'companyEmail'),
    currency: getString(formData, 'currency') || 'COP',
    invoicePrefix: getString(formData, 'invoicePrefix') || 'FAC-',
    invoiceFooter: getString(formData, 'invoiceFooter'),
    lowStockThreshold: Number(getString(formData, 'lowStockThreshold') || 5),
    nextInvoiceNumber: Number(getString(formData, 'nextInvoiceNumber') || 1),
    nextWebOrderNumber: Number(getString(formData, 'nextWebOrderNumber') || 1000),
    webPendingExpiryHours: Number(getString(formData, 'webPendingExpiryHours') || 24),
  }

  const parsed = UpdateSettingsSchema.safeParse(raw)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return failure(firstError?.message || 'Datos de configuración inválidos')
  }

  const data = parsed.data
  const result = await tryCatch(
    () =>
      updateSettings({
        companyName: data.companyName,
        companyNit: data.companyNit || null,
        companyAddress: data.companyAddress || null,
        companyCity: data.companyCity || null,
        companyPhone: data.companyPhone || null,
        companyEmail: data.companyEmail || null,
        currency: data.currency,
        invoicePrefix: data.invoicePrefix,
        invoiceFooter: data.invoiceFooter || null,
        lowStockThreshold: data.lowStockThreshold,
        nextInvoiceNumber: data.nextInvoiceNumber,
        nextWebOrderNumber: data.nextWebOrderNumber,
        webPendingExpiryHours: data.webPendingExpiryHours,
      }),
    { context: 'updateSystemSettings' },
  )

  if (result.success) {
    revalidatePath('/admin')
    return success(undefined)
  }

  return result
}

export async function getBusinessWorkflowAction(): Promise<ActionResult<BusinessWorkflowConfig>> {
  await requireAuth()
  return tryCatch(() => getBusinessWorkflowConfig(), { context: 'getBusinessWorkflowAction' })
}

export async function saveBusinessWorkflowAction(
  workflow: Partial<BusinessWorkflowConfig>,
): Promise<ActionResult<BusinessWorkflowConfig>> {
  await requireAdmin()
  const result = await tryCatch(() => updateBusinessWorkflowConfig(workflow), {
    context: 'saveBusinessWorkflowAction',
  })
  if (result.success) {
    revalidatePath('/admin')
    revalidatePath('/sales/new')
    revalidatePath('/inventory')
  }
  return result
}

