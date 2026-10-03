import { describe, it, expect, beforeEach, vi } from 'vitest'

const { findFirst, create, update, findUnique, upsert } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  findUnique: vi.fn(),
  upsert: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    systemSettings: { findFirst, create, update },
    storeSetting: { findUnique, upsert },
  },
}))

import {
  getOrCreateSettings,
  updateSettings,
  getBusinessWorkflowConfig,
  updateBusinessWorkflowConfig,
} from './settings.service'
import { DEFAULT_BUSINESS_WORKFLOW } from '@/lib/business-workflow'

describe('getOrCreateSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns existing settings row when one exists', async () => {
    const existing = { id: 's1', companyName: 'Cilmax' }
    findFirst.mockResolvedValue(existing)

    const result = await getOrCreateSettings()

    expect(result).toEqual(existing)
    expect(findFirst).toHaveBeenCalledTimes(1)
    expect(create).not.toHaveBeenCalled()
  })

  it('creates a settings row with defaults when none exists', async () => {
    findFirst.mockResolvedValue(null)
    const created = { id: 's1', companyName: 'Cilmax' }
    create.mockResolvedValue(created)

    const result = await getOrCreateSettings()

    expect(result).toEqual(created)
    expect(findFirst).toHaveBeenCalledTimes(1)
    expect(create).toHaveBeenCalledWith({ data: {} })
  })
})

describe('updateSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves the settings row first, then updates it by id', async () => {
    findFirst.mockResolvedValue({ id: 's1', companyName: 'Old name' })
    const updated = { id: 's1', companyName: 'New name' }
    update.mockResolvedValue(updated)

    const result = await updateSettings({ companyName: 'New name' })

    expect(result).toEqual(updated)
    expect(findFirst).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { companyName: 'New name' },
    })
  })

  it('round-trips all settings fields into the update payload', async () => {
    findFirst.mockResolvedValue({ id: 's1' })
    update.mockResolvedValue({ id: 's1' })

    const full: Parameters<typeof updateSettings>[0] = {
      companyName: 'Cilmax Ltda',
      companyNit: '901234567-8',
      companyAddress: 'Calle 1 #2-3',
      companyCity: 'Cali',
      companyPhone: '+57 300 123 4567',
      companyEmail: 'ventas@cilmax.com',
      currency: 'COP',
      invoicePrefix: 'CIL-',
      invoiceFooter: '¡Gracias por tu compra!',
      lowStockThreshold: 5,
    }

    await updateSettings(full)

    expect(update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: full,
    })
  })

  it('allows nullable company fields to be set to null', async () => {
    findFirst.mockResolvedValue({ id: 's1' })
    update.mockResolvedValue({ id: 's1' })

    await updateSettings({ companyNit: null, companyEmail: null })

    expect(update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { companyNit: null, companyEmail: null },
    })
  })
})

describe('getBusinessWorkflowConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns default workflow when no store setting exists', async () => {
    findUnique.mockResolvedValue(null)
    const result = await getBusinessWorkflowConfig()
    expect(result).toEqual(DEFAULT_BUSINESS_WORKFLOW)
    expect(findUnique).toHaveBeenCalledWith({ where: { key: 'business_workflow' } })
  })

  it('merges stored workflow with defaults when setting exists', async () => {
    findUnique.mockResolvedValue({
      id: 'ws1',
      key: 'business_workflow',
      value: { sector: 'technology_repair', allowCreditSales: false, defaultProfitMargin: 45 },
    })

    const result = await getBusinessWorkflowConfig()
    expect(result.sector).toBe('technology_repair')
    expect(result.allowCreditSales).toBe(false)
    expect(result.defaultProfitMargin).toBe(45)
    expect(result.taxIdType).toBe(DEFAULT_BUSINESS_WORKFLOW.taxIdType)
  })
})

describe('updateBusinessWorkflowConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('upserts merged workflow configuration into storeSetting table', async () => {
    findUnique.mockResolvedValue(null)
    upsert.mockResolvedValue({ id: 'ws1' })

    const updated = await updateBusinessWorkflowConfig({
      sector: 'grocery_supermarket',
      allowNegativeStock: true,
      barcodeContinuousScan: true,
    })

    expect(updated.sector).toBe('grocery_supermarket')
    expect(updated.allowNegativeStock).toBe(true)
    expect(updated.barcodeContinuousScan).toBe(true)
    expect(upsert).toHaveBeenCalledWith({
      where: { key: 'business_workflow' },
      create: { key: 'business_workflow', value: expect.objectContaining({ sector: 'grocery_supermarket' }) },
      update: { value: expect.objectContaining({ sector: 'grocery_supermarket' }) },
    })
  })
})

