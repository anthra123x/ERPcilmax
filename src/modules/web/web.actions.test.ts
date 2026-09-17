import { describe, it, expect, beforeEach, vi } from 'vitest'

const prismaMocks = vi.hoisted(() => ({
  webOrder: { findUnique: vi.fn(), update: vi.fn() },
  client: { findFirst: vi.fn(), create: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    webOrder: prismaMocks.webOrder,
    client: prismaMocks.client,
  },
}))

vi.mock('@/modules/auth/auth.actions', () => ({
  requireAuth: vi.fn(async () => ({ id: 'user-1', email: 'admin@cilmax.com', name: 'Admin' })),
}))

const createSaleMock = vi.hoisted(() => vi.fn())
vi.mock('@/modules/sales/sales.actions', () => ({
  createSale: createSaleMock,
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { convertWebOrderToSale } from './web.actions'

const pendingOrder = () => ({
  id: 'order-1',
  status: 'PENDING',
  customerName: 'Cliente Web',
  customerPhone: '3001234567',
  customerEmail: null,
  total: 480000,
  items: [{ productId: 'prod-1', productName: 'Olla', quantity: 1 }],
})

describe('convertWebOrderToSale', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMocks.webOrder.findUnique.mockResolvedValue(pendingOrder())
    prismaMocks.client.findFirst.mockResolvedValue(null)
    prismaMocks.client.create.mockResolvedValue({ id: 'client-1' })
    prismaMocks.webOrder.update.mockResolvedValue({})
  })

  it('creates a CASH sale without an initial payment (regression: anticipo solo en crédito)', async () => {
    createSaleMock.mockResolvedValue({ success: 'ok', sale: { id: 'sale-1', invoiceNumber: 'CIL-1' } })

    const result = await convertWebOrderToSale('order-1')

    expect(createSaleMock).toHaveBeenCalledTimes(1)
    const arg = createSaleMock.mock.calls[0][0]
    expect(arg.paymentMethod).toBe('CASH')
    expect(arg.initialPayment).toBeUndefined()
    expect(arg.initialPaymentMethod).toBeUndefined()
    expect(arg.items).toEqual([{ productId: 'prod-1', quantity: 1 }])
    expect(result).toMatchObject({ success: expect.stringContaining('CIL-1') })
  })

  it('marks the order as CONVERTED with the created sale id on success', async () => {
    createSaleMock.mockResolvedValue({ success: 'ok', sale: { id: 'sale-1', invoiceNumber: 'CIL-1' } })

    await convertWebOrderToSale('order-1')

    expect(prismaMocks.webOrder.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'CONVERTED', convertedSaleId: 'sale-1' },
    })
  })

  it('returns the sale error and does not update the order when createSale fails', async () => {
    createSaleMock.mockResolvedValue({ error: 'Stock insuficiente' })

    const result = await convertWebOrderToSale('order-1')

    expect(result).toEqual({ error: 'Stock insuficiente' })
    expect(prismaMocks.webOrder.update).not.toHaveBeenCalled()
  })

  it('refuses to convert an order that is not PENDING', async () => {
    prismaMocks.webOrder.findUnique.mockResolvedValue({ ...pendingOrder(), status: 'CONVERTED' })

    const result = await convertWebOrderToSale('order-1')

    expect(result).toEqual({ error: 'El pedido ya no está pendiente' })
    expect(createSaleMock).not.toHaveBeenCalled()
  })
})
