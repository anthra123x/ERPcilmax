import { describe, it, expect, beforeEach, vi } from 'vitest'

const prismaMocks = vi.hoisted(() => ({
  webOrder: { findUnique: vi.fn(), update: vi.fn() },
  client: { findFirst: vi.fn(), create: vi.fn() },
  product: { updateMany: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
  stockMovement: { create: vi.fn() },
  $transaction: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    webOrder: prismaMocks.webOrder,
    client: prismaMocks.client,
    product: prismaMocks.product,
    stockMovement: prismaMocks.stockMovement,
    $transaction: prismaMocks.$transaction,
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

import { cancelWebOrder, confirmWebOrder, convertWebOrderToSale } from './web.actions'

const tx = () => ({
  product: prismaMocks.product,
  stockMovement: prismaMocks.stockMovement,
  webOrder: prismaMocks.webOrder,
})

const order = (status: 'PENDING' | 'CONFIRMED' | 'CONVERTED' | 'CANCELLED' = 'PENDING') => ({
  id: 'order-1',
  status,
  reference: 'ORD-1042',
  customerName: 'Cliente Web',
  customerPhone: '3001234567',
  customerEmail: null,
  total: 480000,
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [{ productId: 'prod-1', productName: 'Olla', quantity: 2 }],
})

describe('convertWebOrderToSale', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMocks.webOrder.findUnique.mockResolvedValue(order())
    prismaMocks.client.findFirst.mockResolvedValue(null)
    prismaMocks.client.create.mockResolvedValue({ id: 'client-1' })
    prismaMocks.webOrder.update.mockResolvedValue({})
    createSaleMock.mockResolvedValue({ success: 'ok', sale: { id: 'sale-1', invoiceNumber: 'CIL-1' } })
  })

  it('creates a CASH sale without an initial payment (regression: anticipo solo en crédito)', async () => {
    const result = await convertWebOrderToSale('order-1')

    expect(createSaleMock).toHaveBeenCalledTimes(1)
    const arg = createSaleMock.mock.calls[0][0]
    expect(arg.paymentMethod).toBe('CASH')
    expect(arg.initialPayment).toBeUndefined()
    expect(arg.initialPaymentMethod).toBeUndefined()
    expect(arg.items).toEqual([{ productId: 'prod-1', quantity: 2 }])
    expect(result).toMatchObject({ success: expect.stringContaining('CIL-1') })
  })

  it('marks the order as CONVERTED with the created sale id on success', async () => {
    await convertWebOrderToSale('order-1')

    expect(prismaMocks.webOrder.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'CONVERTED', convertedSaleId: 'sale-1' },
    })
  })

  it('does not decrement stock again when the order was CONFIRMED', async () => {
    prismaMocks.webOrder.findUnique.mockResolvedValue(order('CONFIRMED'))

    await convertWebOrderToSale('order-1')

    const arg = createSaleMock.mock.calls[0][0]
    expect(arg.stockReserved).toBe(true)
  })

  it('returns the sale error and does not update the order when createSale fails', async () => {
    createSaleMock.mockResolvedValue({ error: 'Stock insuficiente' })

    const result = await convertWebOrderToSale('order-1')

    expect(result).toEqual({ error: 'Stock insuficiente' })
    expect(prismaMocks.webOrder.update).not.toHaveBeenCalled()
  })

  it('refuses to convert an order that is not pending or confirmed', async () => {
    prismaMocks.webOrder.findUnique.mockResolvedValue(order('CONVERTED'))

    const result = await convertWebOrderToSale('order-1')

    expect(result).toEqual({ error: 'El pedido ya no está pendiente' })
    expect(createSaleMock).not.toHaveBeenCalled()
  })
})

describe('confirmWebOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMocks.webOrder.findUnique.mockResolvedValue(order())
    prismaMocks.product.updateMany.mockResolvedValue({ count: 1 })
    prismaMocks.product.findUnique.mockResolvedValue({ name: 'Olla', stock: 1 })
    prismaMocks.stockMovement.create.mockResolvedValue({})
    prismaMocks.webOrder.update.mockResolvedValue({})
    prismaMocks.$transaction.mockImplementation(async (cb: (t: ReturnType<typeof tx>) => unknown) => cb(tx()))
  })

  it('decrements stock and logs a RESERVATION for each item', async () => {
    const result = await confirmWebOrder('order-1')

    expect(prismaMocks.product.updateMany).toHaveBeenCalledWith({
      where: { id: 'prod-1', deletedAt: null, stock: { gte: 2 } },
      data: { stock: { decrement: 2 } },
    })
    expect(prismaMocks.stockMovement.create).toHaveBeenCalledWith({
      data: { productId: 'prod-1', type: 'RESERVATION', quantity: 2, reference: 'ORD-1042' },
    })
    expect(prismaMocks.webOrder.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'CONFIRMED', confirmedAt: expect.any(Date) },
    })
    expect(result).toMatchObject({ success: expect.stringContaining('ORD-1042') })
  })

  it('returns an error and rolls back when there is not enough stock', async () => {
    prismaMocks.product.updateMany.mockResolvedValue({ count: 0 })

    const result = await confirmWebOrder('order-1')

    expect(result).toEqual({ error: 'Stock insuficiente para "Olla": disponible 1, solicitado 2' })
    expect(prismaMocks.webOrder.update).not.toHaveBeenCalled()
  })

  it('refuses to confirm an order that is not PENDING', async () => {
    prismaMocks.webOrder.findUnique.mockResolvedValue(order('CONFIRMED'))

    const result = await confirmWebOrder('order-1')

    expect(result).toEqual({ error: 'El pedido ya no está pendiente' })
    expect(prismaMocks.$transaction).not.toHaveBeenCalled()
  })
})

describe('cancelWebOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMocks.webOrder.findUnique.mockResolvedValue(order())
    prismaMocks.product.update.mockResolvedValue({})
    prismaMocks.stockMovement.create.mockResolvedValue({})
    prismaMocks.webOrder.update.mockResolvedValue({})
    prismaMocks.$transaction.mockImplementation(async (cb: (t: ReturnType<typeof tx>) => unknown) => cb(tx()))
  })

  it('cancels a PENDING order without touching stock', async () => {
    const result = await cancelWebOrder('order-1')

    expect(prismaMocks.product.update).not.toHaveBeenCalled()
    expect(prismaMocks.webOrder.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'CANCELLED' },
    })
    expect(result).toEqual({ success: 'Pedido cancelado' })
  })

  it('restores stock and logs a RELEASE when the order was CONFIRMED', async () => {
    prismaMocks.webOrder.findUnique.mockResolvedValue(order('CONFIRMED'))

    const result = await cancelWebOrder('order-1')

    expect(prismaMocks.product.update).toHaveBeenCalledWith({
      where: { id: 'prod-1' },
      data: { stock: { increment: 2 } },
    })
    expect(prismaMocks.stockMovement.create).toHaveBeenCalledWith({
      data: { productId: 'prod-1', type: 'RELEASE', quantity: 2, reference: 'ORD-1042' },
    })
    expect(prismaMocks.webOrder.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'CANCELLED' },
    })
    expect(result).toEqual({ success: 'Pedido cancelado' })
  })

  it('refuses to cancel an order that is already CONVERTED', async () => {
    prismaMocks.webOrder.findUnique.mockResolvedValue(order('CONVERTED'))

    const result = await cancelWebOrder('order-1')

    expect(result).toEqual({ error: 'El pedido ya no puede cancelarse' })
    expect(prismaMocks.$transaction).not.toHaveBeenCalled()
  })
})