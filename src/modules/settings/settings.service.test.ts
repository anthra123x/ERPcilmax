import { describe, it, expect, beforeEach, vi } from 'vitest'

const { findFirst, create, update } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    systemSettings: { findFirst, create, update },
  },
}))

import { getOrCreateSettings, updateSettings } from './settings.service'

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
