import { describe, it, expect, beforeEach, vi } from 'vitest'

const prismaMocks = vi.hoisted(() => ({
  product: { count: vi.fn() },
  webOrder: { count: vi.fn(), findMany: vi.fn() },
  contactMessage: { count: vi.fn(), findMany: vi.fn() },
  productReview: { count: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMocks,
}))

const serviceMocks = vi.hoisted(() => ({
  cancelExpiredWebOrders: vi.fn().mockResolvedValue(0),
  getWebSettings: vi.fn().mockResolvedValue({ storeName: 'Cilmax' }),
}))

vi.mock('./web.service', () => serviceMocks)

import { getWebOverviewStats } from './web-overview.service'

describe('getWebOverviewStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMocks.product.count.mockResolvedValueOnce(3).mockResolvedValueOnce(10)
    prismaMocks.webOrder.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1)
    prismaMocks.contactMessage.count.mockResolvedValue(4)
    prismaMocks.productReview.count.mockResolvedValue(5)
    prismaMocks.webOrder.findMany.mockResolvedValue([])
    prismaMocks.contactMessage.findMany.mockResolvedValue([])
    serviceMocks.getWebSettings.mockResolvedValue({ storeName: 'Cilmax' })
  })

  it('expira primero los pedidos PENDING vencidos (fallback sin cron)', async () => {
    await getWebOverviewStats()
    expect(serviceMocks.cancelExpiredWebOrders).toHaveBeenCalledTimes(1)
  })

  it('cuenta solo productos visibles y no borrados', async () => {
    await getWebOverviewStats()

    expect(prismaMocks.product.count).toHaveBeenNthCalledWith(1, {
      where: { webVisible: true, deletedAt: null },
    })
    expect(prismaMocks.product.count).toHaveBeenNthCalledWith(2, { where: { deletedAt: null } })
  })

  it('agrega los contadores del panel', async () => {
    const result = await getWebOverviewStats()

    expect(result).toMatchObject({
      visibleProducts: 3,
      totalProducts: 10,
      pendingOrders: 2,
      confirmedOrders: 1,
      unreadMessages: 4,
      pendingReviews: 5,
    })
  })

  it('limita los listados recientes a 5 registros', async () => {
    await getWebOverviewStats()

    for (const call of [prismaMocks.webOrder.findMany, prismaMocks.contactMessage.findMany]) {
      expect(call).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }))
    }
  })

  it('expone los ajustes de la tienda en el resumen', async () => {
    const result = await getWebOverviewStats()

    expect(result.settings).toEqual({ storeName: 'Cilmax' })
  })
})
